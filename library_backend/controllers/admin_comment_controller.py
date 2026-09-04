"""
Admin Comment Controller
=========================
Full admin moderation: approve, reject, flag, pin, delete, reply,
bulk actions, CSV export, and 10-feature settings management.
"""

from datetime import datetime
from typing import Optional, List
from io import StringIO
import csv

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, Field

from database import get_db
from auth import get_current_user
from models.user_model import User
from models.comment_model import Comment, CommentVote, CommentSettings

router = APIRouter()


# ==========================================
# ADMIN AUTH GUARD
# ==========================================

def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    role_name = ""
    if current_user.role:
        role_name = (
            current_user.role.name
            if hasattr(current_user.role, "name")
            else str(current_user.role)
        )
    if role_name.lower() not in ("admin", "superadmin", "administrator", "super admin"):
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


# ==========================================
# SCHEMAS
# ==========================================

class ModerateSchema(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected|flagged|pending)$")
    reason: Optional[str] = Field(None, max_length=255)


class AdminReplySchema(BaseModel):
    admin_reply: str = Field(..., min_length=1, max_length=2000)


class BulkActionSchema(BaseModel):
    ids: List[int]
    action: str = Field(..., pattern="^(approve|reject|delete)$")


class FeatureSettingsSchema(BaseModel):
    feature_comments_enabled: Optional[bool] = None
    feature_login_required: Optional[bool] = None
    feature_admin_approval: Optional[bool] = None
    feature_ratings_enabled: Optional[bool] = None
    feature_helpful_votes: Optional[bool] = None
    feature_verified_badge: Optional[bool] = None
    feature_replies_enabled: Optional[bool] = None
    feature_report_enabled: Optional[bool] = None
    feature_pin_enabled: Optional[bool] = None
    feature_admin_reply: Optional[bool] = None
    auto_flag_threshold: Optional[int] = Field(None, ge=1, le=100)
    max_comment_length: Optional[int] = Field(None, ge=10, le=10000)


# ==========================================
# HELPER
# ==========================================

def serialize_admin_comment(c: Comment) -> dict:
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
        "flagged_reason": c.flagged_reason,
        "admin_reply": c.admin_reply,
        "admin_reply_at": c.admin_reply_at.isoformat() if c.admin_reply_at else None,
        "parent_id": c.parent_id,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "user": {
            "id": c.user.id if c.user else None,
            "username": c.user.username if c.user else "Deleted",
            "full_name": c.user.full_name if c.user else None,
            "email": c.user.email if c.user else None,
        },
    }


def get_or_create_settings(db: Session, entity_type: str) -> CommentSettings:
    s = db.query(CommentSettings).filter(CommentSettings.entity_type == entity_type).first()
    if not s:
        s = CommentSettings(entity_type=entity_type)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


# ==========================================
# 1. GET ALL COMMENTS (Admin, with filters)
# ==========================================

@router.get("/")
def admin_get_comments(
    status: Optional[str]      = Query(None),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int]   = Query(None),
    search: Optional[str]      = Query(None),
    date_from: Optional[str]   = Query(None),
    date_to: Optional[str]     = Query(None),
    include_deleted: bool       = Query(False),
    page: int                   = Query(1, ge=1),
    per_page: int               = Query(20, ge=1, le=100),
    db: Session                 = Depends(get_db),
    current_user: User          = Depends(get_admin_user),
):
    q = (
        db.query(Comment)
        .options(joinedload(Comment.user))
        .filter(Comment.parent_id == None)
    )

    if not include_deleted:
        q = q.filter(Comment.deleted_at == None)

    if status:
        q = q.filter(Comment.status == status)
    if entity_type:
        q = q.filter(Comment.entity_type == entity_type)
    if entity_id:
        q = q.filter(Comment.entity_id == entity_id)
    if search:
        q = q.filter(Comment.body.ilike(f"%{search}%"))
    if date_from:
        try:
            q = q.filter(Comment.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(Comment.created_at <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

    q = q.order_by(Comment.is_pinned.desc(), Comment.created_at.desc())

    total = q.count()
    comments = q.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "comments": [serialize_admin_comment(c) for c in comments],
    }


# ==========================================
# 2. DASHBOARD KPI STATS
# ==========================================

@router.get("/stats")
def admin_get_stats(
    db: Session        = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    base = db.query(Comment).filter(Comment.deleted_at == None, Comment.parent_id == None)

    total    = base.count()
    pending  = base.filter(Comment.status == "pending").count()
    approved = base.filter(Comment.status == "approved").count()
    rejected = base.filter(Comment.status == "rejected").count()
    flagged  = base.filter(Comment.status == "flagged").count()
    replies  = db.query(Comment).filter(Comment.parent_id != None, Comment.deleted_at == None).count()

    avg_result = db.query(func.avg(Comment.rating)).filter(
        Comment.status == "approved",
        Comment.rating != None,
        Comment.parent_id == None,
        Comment.deleted_at == None,
    ).scalar()

    avg_rating = round(float(avg_result), 2) if avg_result else 0.0

    # Top 5 most commented books
    from sqlalchemy import cast, Integer as SA_Int, text
    top_books = (
        db.query(Comment.entity_id, func.count(Comment.id).label("cnt"))
        .filter(Comment.entity_type == "book", Comment.deleted_at == None)
        .group_by(Comment.entity_id)
        .order_by(func.count(Comment.id).desc())
        .limit(5)
        .all()
    )

    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "flagged": flagged,
        "replies": replies,
        "avg_rating": avg_rating,
        "top_commented_books": [{"book_id": r[0], "count": r[1]} for r in top_books],
    }


# ==========================================
# 3. MODERATE A COMMENT
# ==========================================

@router.patch("/{comment_id}/moderate")
def admin_moderate(
    comment_id: int,
    data: ModerateSchema,
    db: Session        = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    comment.status = data.status
    if data.reason:
        comment.flagged_reason = data.reason

    db.commit()
    return {"id": comment_id, "status": data.status, "message": f"Comment {data.status}."}


# ==========================================
# 4. TOGGLE PIN
# ==========================================

@router.post("/{comment_id}/pin")
def admin_pin_comment(
    comment_id: int,
    db: Session        = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.deleted_at == None).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    # Check feature enabled
    from models.comment_model import CommentSettings
    s = get_or_create_settings(db, comment.entity_type)
    if not s.feature_pin_enabled:
        raise HTTPException(status_code=403, detail="Pinning is disabled by admin settings.")

    comment.is_pinned = not comment.is_pinned
    db.commit()
    return {"id": comment_id, "is_pinned": comment.is_pinned}


# ==========================================
# 5. ADMIN PUBLIC REPLY
# ==========================================

@router.patch("/{comment_id}/admin-reply")
def admin_reply_to_comment(
    comment_id: int,
    data: AdminReplySchema,
    db: Session        = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.deleted_at == None).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    s = get_or_create_settings(db, comment.entity_type)
    if not s.feature_admin_reply:
        raise HTTPException(status_code=403, detail="Admin reply feature is disabled.")

    comment.admin_reply = data.admin_reply
    comment.admin_reply_at = datetime.utcnow()
    db.commit()
    return {"id": comment_id, "admin_reply": comment.admin_reply}


# ==========================================
# 6. DELETE COMMENT (soft)
# ==========================================

@router.delete("/{comment_id}")
def admin_delete_comment(
    comment_id: int,
    hard: bool         = Query(False),
    db: Session        = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    if hard:
        db.delete(comment)
    else:
        comment.deleted_at = datetime.utcnow()

    db.commit()
    return {"id": comment_id, "deleted": True, "hard": hard}


# ==========================================
# 7. BULK ACTIONS
# ==========================================

@router.post("/bulk")
def admin_bulk_action(
    data: BulkActionSchema,
    db: Session        = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    if not data.ids:
        raise HTTPException(status_code=400, detail="No comment IDs provided.")

    comments = db.query(Comment).filter(Comment.id.in_(data.ids)).all()
    affected = len(comments)

    for c in comments:
        if data.action == "approve":
            c.status = "approved"
        elif data.action == "reject":
            c.status = "rejected"
        elif data.action == "delete":
            c.deleted_at = datetime.utcnow()

    db.commit()
    return {"action": data.action, "affected": affected}


# ==========================================
# 8. EXPORT COMMENTS AS CSV
# ==========================================

@router.get("/export")
def admin_export_csv(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int]   = Query(None),
    status: Optional[str]      = Query(None),
    db: Session                = Depends(get_db),
    current_user: User         = Depends(get_admin_user),
):
    q = (
        db.query(Comment)
        .options(joinedload(Comment.user))
        .filter(Comment.deleted_at == None)
    )
    if entity_type:
        q = q.filter(Comment.entity_type == entity_type)
    if entity_id:
        q = q.filter(Comment.entity_id == entity_id)
    if status:
        q = q.filter(Comment.status == status)

    comments = q.order_by(Comment.created_at.desc()).limit(5000).all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Entity Type", "Entity ID", "User", "Email",
        "Rating", "Comment", "Status", "Pinned", "Verified Reader",
        "Helpful", "Not Helpful", "Reports", "Created At"
    ])

    for c in comments:
        writer.writerow([
            c.id,
            c.entity_type,
            c.entity_id,
            c.user.username if c.user else "Deleted",
            c.user.email if c.user else "",
            c.rating or "",
            c.body,
            c.status,
            c.is_pinned,
            c.is_verified_read,
            c.helpful_count,
            c.not_helpful_count,
            c.report_count,
            c.created_at.isoformat() if c.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=comments_export.csv"}
    )


# ==========================================
# 9. GET FEATURE SETTINGS (All entity types)
# ==========================================

@router.get("/settings")
def admin_get_all_settings(
    db: Session        = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    # Ensure defaults exist for all 3 entity types
    for et in ("book", "fatawa", "post"):
        get_or_create_settings(db, et)

    all_settings = db.query(CommentSettings).all()
    return [
        {
            "id": s.id,
            "entity_type": s.entity_type,
            "feature_comments_enabled": s.feature_comments_enabled,
            "feature_login_required": s.feature_login_required,
            "feature_admin_approval": s.feature_admin_approval,
            "feature_ratings_enabled": s.feature_ratings_enabled,
            "feature_helpful_votes": s.feature_helpful_votes,
            "feature_verified_badge": s.feature_verified_badge,
            "feature_replies_enabled": s.feature_replies_enabled,
            "feature_report_enabled": s.feature_report_enabled,
            "feature_pin_enabled": s.feature_pin_enabled,
            "feature_admin_reply": s.feature_admin_reply,
            "auto_flag_threshold": s.auto_flag_threshold,
            "max_comment_length": s.max_comment_length,
        }
        for s in all_settings
    ]


# ==========================================
# 10. UPDATE FEATURE SETTINGS
# ==========================================

@router.patch("/settings/{entity_type}")
def admin_update_settings(
    entity_type: str,
    data: FeatureSettingsSchema,
    db: Session        = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    s = get_or_create_settings(db, entity_type)

    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(s, field):
            setattr(s, field, value)

    db.commit()
    db.refresh(s)

    return {
        "entity_type": s.entity_type,
        "message": f"Settings updated for '{entity_type}'.",
        "feature_comments_enabled": s.feature_comments_enabled,
        "feature_login_required": s.feature_login_required,
        "feature_admin_approval": s.feature_admin_approval,
        "feature_ratings_enabled": s.feature_ratings_enabled,
        "feature_helpful_votes": s.feature_helpful_votes,
        "feature_verified_badge": s.feature_verified_badge,
        "feature_replies_enabled": s.feature_replies_enabled,
        "feature_report_enabled": s.feature_report_enabled,
        "feature_pin_enabled": s.feature_pin_enabled,
        "feature_admin_reply": s.feature_admin_reply,
        "auto_flag_threshold": s.auto_flag_threshold,
        "max_comment_length": s.max_comment_length,
    }
