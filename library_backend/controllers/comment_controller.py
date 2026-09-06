"""
Comment Controller (User-Facing)
=================================
Endpoints that regular logged-in users call.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, Field

from database import get_db
from auth import get_current_user, get_current_user_optional
from models.user_model import User
from models.comment_model import Comment, CommentVote, CommentSettings
from models.interaction_model import UserBookInteraction

router = APIRouter()


# ==========================================
# HELPERS
# ==========================================

def get_settings(db: Session, entity_type: str) -> CommentSettings:
    """Get or create comment settings for an entity type."""
    s = db.query(CommentSettings).filter(CommentSettings.entity_type == entity_type).first()
    if not s:
        s = CommentSettings(entity_type=entity_type)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


def check_feature(settings: CommentSettings, feature: str):
    """Raise 403 if a feature is disabled by admin."""
    if not getattr(settings, feature, True):
        raise HTTPException(status_code=403, detail="This feature has been disabled by admin.")


def serialize_comment(c: Comment, current_user_id: Optional[int] = None) -> dict:
    user_vote = None
    if current_user_id:
        for v in (c.votes or []):
            if v.user_id == current_user_id:
                user_vote = v.vote_type
                break

    replies_data = []
    for r in (c.replies or []):
        if r.deleted_at is None and r.status == "approved":
            replies_data.append({
                "id": r.id,
                "body": r.body,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "user": {
                    "id": r.user.id if r.user else None,
                    "username": r.user.username if r.user else "Deleted User",
                    "full_name": r.user.full_name if r.user else None,
                },
                "admin_reply": r.admin_reply,
                "admin_reply_at": r.admin_reply_at.isoformat() if r.admin_reply_at else None,
            })

    return {
        "id": c.id,
        "entity_type": c.entity_type,
        "entity_id": c.entity_id,
        "rating": c.rating,
        "body": c.body,
        "status": c.status,
        "is_pinned": c.is_pinned,
        "is_verified_read": c.is_verified_read,
        "helpful_count": c.helpful_count,
        "not_helpful_count": c.not_helpful_count,
        "report_count": c.report_count,
        "admin_reply": c.admin_reply,
        "admin_reply_at": c.admin_reply_at.isoformat() if c.admin_reply_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "user_vote": user_vote,
        "user": {
            "id": c.user.id if c.user else None,
            "username": c.user.username if c.user else "Deleted User",
            "full_name": c.user.full_name if c.user else None,
        },
        "replies": replies_data,
    }


# ==========================================
# SCHEMAS
# ==========================================

class SubmitCommentSchema(BaseModel):
    entity_type: str = Field(..., max_length=50)
    entity_id: int
    rating: Optional[int] = Field(None, ge=1, le=5)
    body: str = Field(..., min_length=1, max_length=2000)


class ReplySchema(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class VoteSchema(BaseModel):
    vote_type: str = Field(..., pattern="^(helpful|not_helpful)$")


class ReportSchema(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)


# ==========================================
# 1. GET COMMENTS (Public)
# ==========================================

@router.get("/{entity_type}/{entity_id}")
def get_comments(
    entity_type: str,
    entity_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    sort: str = Query("newest", pattern="^(newest|helpful|top_rated)$"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    settings = get_settings(db, entity_type)
    check_feature(settings, "feature_comments_enabled")

    base_q = (
        db.query(Comment)
        .options(joinedload(Comment.user), joinedload(Comment.votes), joinedload(Comment.replies))
        .filter(
            Comment.entity_type == entity_type,
            Comment.entity_id == entity_id,
            Comment.parent_id == None,
            Comment.deleted_at == None,
            Comment.status == "approved",
        )
    )

    if sort == "helpful":
        base_q = base_q.order_by(Comment.is_pinned.desc(), Comment.helpful_count.desc(), Comment.created_at.desc())
    elif sort == "top_rated":
        base_q = base_q.order_by(Comment.is_pinned.desc(), Comment.rating.desc(), Comment.created_at.desc())
    else:
        base_q = base_q.order_by(Comment.is_pinned.desc(), Comment.created_at.desc())

    total = base_q.count()
    comments = base_q.offset((page - 1) * per_page).limit(per_page).all()

    # Average rating
    from sqlalchemy import func as sa_func
    avg_result = (
        db.query(sa_func.avg(Comment.rating))
        .filter(
            Comment.entity_type == entity_type,
            Comment.entity_id == entity_id,
            Comment.status == "approved",
            Comment.rating != None,
            Comment.parent_id == None,
            Comment.deleted_at == None,
        )
        .scalar()
    )
    avg_rating = round(float(avg_result), 1) if avg_result else 0.0

    uid = current_user.id if current_user else None
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "avg_rating": avg_rating,
        "settings": {
            "feature_ratings_enabled": settings.feature_ratings_enabled,
            "feature_helpful_votes": settings.feature_helpful_votes,
            "feature_verified_badge": settings.feature_verified_badge,
            "feature_replies_enabled": settings.feature_replies_enabled,
            "feature_report_enabled": settings.feature_report_enabled,
            "feature_pin_enabled": settings.feature_pin_enabled,
            "feature_admin_reply": settings.feature_admin_reply,
            "feature_login_required": settings.feature_login_required,
            "feature_admin_approval": settings.feature_admin_approval,
            "feature_comments_enabled": settings.feature_comments_enabled,
        },
        "comments": [serialize_comment(c, uid) for c in comments],
    }


# ==========================================
# 2. SUBMIT COMMENT (Auth Required)
# ==========================================

@router.post("/")
def submit_comment(
    data: SubmitCommentSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = get_settings(db, data.entity_type)
    check_feature(settings, "feature_comments_enabled")
    check_feature(settings, "feature_login_required")  # if False, would skip auth (but auth dep already requires it)

    if data.rating is not None and not settings.feature_ratings_enabled:
        data.rating = None  # rating disabled → strip it silently

    if len(data.body) > settings.max_comment_length:
        raise HTTPException(status_code=400, detail=f"Comment too long (max {settings.max_comment_length} chars).")

    # Check for duplicate: 1 comment per user per entity per 24 hrs (only top-level)
    from sqlalchemy import func as sa_func
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=24)
    existing = (
        db.query(Comment)
        .filter(
            Comment.user_id == current_user.id,
            Comment.entity_type == data.entity_type,
            Comment.entity_id == data.entity_id,
            Comment.parent_id == None,
            Comment.created_at >= cutoff,
            Comment.deleted_at == None,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=429, detail="You have already submitted a comment in the last 24 hours.")

    # Auto-detect verified reader (only for books)
    is_verified = False
    if data.entity_type == "book":
        interaction = db.query(UserBookInteraction).filter(
            UserBookInteraction.user_id == current_user.id,
            UserBookInteraction.book_id == data.entity_id,
            UserBookInteraction.last_page_read > 0,
        ).first()
        is_verified = bool(interaction) and settings.feature_verified_badge

    status = "pending" if settings.feature_admin_approval else "approved"

    comment = Comment(
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        user_id=current_user.id,
        rating=data.rating,
        body=data.body,
        status=status,
        is_verified_read=is_verified,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "status": comment.status,
        "message": (
            "Your comment has been submitted and is awaiting admin approval."
            if status == "pending"
            else "Your comment has been published."
        ),
    }


# ==========================================
# 3. REPLY TO COMMENT (Auth Required)
# ==========================================

@router.post("/{comment_id}/reply")
def reply_to_comment(
    comment_id: int,
    data: ReplySchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parent = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.deleted_at == None,
        Comment.parent_id == None,  # only reply to top-level
    ).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Comment not found.")

    settings = get_settings(db, parent.entity_type)
    check_feature(settings, "feature_comments_enabled")
    check_feature(settings, "feature_replies_enabled")

    status = "pending" if settings.feature_admin_approval else "approved"

    reply = Comment(
        entity_type=parent.entity_type,
        entity_id=parent.entity_id,
        user_id=current_user.id,
        parent_id=parent.id,
        body=data.body,
        status=status,
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)

    return {"id": reply.id, "status": reply.status, "message": "Reply submitted."}


# ==========================================
# 4. HELPFUL VOTE (Auth Required)
# ==========================================

@router.post("/{comment_id}/vote")
def vote_comment(
    comment_id: int,
    data: VoteSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.deleted_at == None).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    settings = get_settings(db, comment.entity_type)
    check_feature(settings, "feature_helpful_votes")

    # Prevent self-voting
    if comment.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot vote on your own comment.")

    existing_vote = db.query(CommentVote).filter(
        CommentVote.comment_id == comment_id,
        CommentVote.user_id == current_user.id,
    ).first()

    if existing_vote:
        if existing_vote.vote_type == data.vote_type:
            # Toggle off (remove vote)
            if data.vote_type == "helpful":
                comment.helpful_count = max(0, comment.helpful_count - 1)
            else:
                comment.not_helpful_count = max(0, comment.not_helpful_count - 1)
            db.delete(existing_vote)
            db.commit()
            return {"action": "removed", "vote_type": data.vote_type}
        else:
            # Switch vote
            if existing_vote.vote_type == "helpful":
                comment.helpful_count = max(0, comment.helpful_count - 1)
                comment.not_helpful_count += 1
            else:
                comment.not_helpful_count = max(0, comment.not_helpful_count - 1)
                comment.helpful_count += 1
            existing_vote.vote_type = data.vote_type
            db.commit()
            return {"action": "switched", "vote_type": data.vote_type}

    # New vote
    vote = CommentVote(comment_id=comment_id, user_id=current_user.id, vote_type=data.vote_type)
    db.add(vote)
    if data.vote_type == "helpful":
        comment.helpful_count += 1
    else:
        comment.not_helpful_count += 1
    db.commit()
    return {"action": "added", "vote_type": data.vote_type}


# ==========================================
# 5. REPORT COMMENT (Auth Required)
# ==========================================

@router.post("/{comment_id}/report")
def report_comment(
    comment_id: int,
    data: ReportSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.deleted_at == None).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    settings = get_settings(db, comment.entity_type)
    check_feature(settings, "feature_report_enabled")

    comment.report_count += 1
    if comment.report_count >= settings.auto_flag_threshold:
        comment.status = "flagged"
        if data.reason:
            comment.flagged_reason = data.reason

    db.commit()
    return {"message": "Report submitted. Thank you for helping keep the community safe."}
