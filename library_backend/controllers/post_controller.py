from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session

from database import get_db
from models import post_model, user_model
from schemas.post_schema import PostResponse
from auth import require_permission

# ✅ Cloudinary Helper Import
from utils.cloudinary_helper import upload_to_cloudinary

router = APIRouter()

# ✅ Settings
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_PDF_TYPES = {"application/pdf"}

# =========================================
# 🔥 HELPERS
# =========================================

def _author_name(post_obj) -> str:
    """
    Get author name safely
    """
    try:
        if post_obj.author:
            if getattr(post_obj.author, "full_name", None):
                return post_obj.author.full_name
            if getattr(post_obj.author, "username", None):
                return post_obj.author.username
            if getattr(post_obj.author, "email", None):
                return post_obj.author.email
    except Exception:
        pass

    return "Markaz Admin"


def _to_post_response(post_obj) -> PostResponse:
    """
    Convert SQLAlchemy object -> PostResponse with author_name
    """
    data = PostResponse.model_validate(post_obj)
    data.author_name = _author_name(post_obj)
    return data


# =========================================
# 🚀 ROUTES
# =========================================

@router.post("/", response_model=PostResponse)
def create_post(
    title: str = Form(...),
    content: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    status: Optional[str] = Form("published"),       # ✅ NEW: draft | scheduled | published
    published_at: Optional[str] = Form(None),         # ✅ NEW: ISO datetime string for scheduled posts
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("USER_MANAGE"))
):
    title = title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    # Validate status
    valid_statuses = {"draft", "scheduled", "published"}
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{status}'. Must be one of: {', '.join(valid_statuses)}"
        )

    # Parse published_at for scheduled posts
    parsed_published_at = None
    if status == "scheduled":
        if not published_at:
            raise HTTPException(
                status_code=400,
                detail="published_at is required when status is 'scheduled'"
            )
        try:
            parsed_published_at = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=400,
                detail="Invalid published_at format. Use ISO 8601 (e.g., 2025-01-15T10:00:00Z)"
            )

    media_type = "none"
    file_url = None

    # ✅ CLOUDINARY UPLOAD LOGIC
    if file:
        # 1. Type Check
        if file.content_type in ALLOWED_IMAGE_TYPES:
            media_type = "image"
        elif file.content_type in ALLOWED_PDF_TYPES:
            media_type = "pdf"
        else:
            raise HTTPException(
                status_code=400,
                detail="Only JPG/PNG/WebP images and PDF files are allowed."
            )

        # 2. Upload to Cloudinary
        print(f"Uploading {file.filename} to Cloudinary...")
        file_url = upload_to_cloudinary(file, folder="library_posts")

        if not file_url:
            raise HTTPException(status_code=500, detail="File upload failed on server")

    # Database Entry
    new_post = post_model.MarkazPost(
        title=title,
        content=content,
        media_type=media_type,
        file_url=file_url,
        tags=tags,
        status=status,
        published_at=parsed_published_at,
        author_id=current_user.id
    )

    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return _to_post_response(new_post)


@router.get("/public", response_model=List[PostResponse])
def get_public_posts(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Public endpoint — returns only published posts."""
    now = datetime.now(timezone.utc)
    posts = (
        db.query(post_model.MarkazPost)
        .filter(post_model.MarkazPost.status == "published")
        .order_by(post_model.MarkazPost.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [_to_post_response(p) for p in posts]


@router.get("/", response_model=List[PostResponse])
def get_admin_posts(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("USER_MANAGE"))
):
    """Admin endpoint — returns all posts. Optional status filter."""
    query = db.query(post_model.MarkazPost)

    if status_filter and status_filter in {"draft", "scheduled", "published"}:
        query = query.filter(post_model.MarkazPost.status == status_filter)

    posts = (
        query
        .order_by(post_model.MarkazPost.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [_to_post_response(p) for p in posts]


@router.get("/{post_id}", response_model=PostResponse)
def get_post_by_id(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("USER_MANAGE"))
):
    post = db.query(post_model.MarkazPost).filter(post_model.MarkazPost.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return _to_post_response(post)


@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    title: str = Form(...),
    content: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    status: Optional[str] = Form(None),               # ✅ NEW: update status
    published_at: Optional[str] = Form(None),          # ✅ NEW: update schedule
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("USER_MANAGE"))
):
    post = db.query(post_model.MarkazPost).filter(post_model.MarkazPost.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    cleaned_title = title.strip()
    if not cleaned_title:
        raise HTTPException(status_code=400, detail="Title is required")

    post.title = cleaned_title
    post.content = content
    post.tags = tags

    # ✅ Update scheduling fields
    if status is not None:
        valid_statuses = {"draft", "scheduled", "published"}
        if status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status '{status}'. Must be one of: {', '.join(valid_statuses)}"
            )
        post.status = status

        if status == "scheduled" and published_at:
            try:
                post.published_at = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid published_at format. Use ISO 8601"
                )
        elif status == "published":
            post.published_at = None  # Clear schedule if publishing immediately

    if file:
        if file.content_type in ALLOWED_IMAGE_TYPES:
            media_type = "image"
        elif file.content_type in ALLOWED_PDF_TYPES:
            media_type = "pdf"
        else:
            raise HTTPException(
                status_code=400,
                detail="Only JPG/PNG/WebP images and PDF files are allowed."
            )

        file_url = upload_to_cloudinary(file, folder="library_posts")
        if not file_url:
            raise HTTPException(status_code=500, detail="File upload failed on server")

        post.media_type = media_type
        post.file_url = file_url

    db.commit()
    db.refresh(post)

    return _to_post_response(post)


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("USER_MANAGE"))
):
    post = db.query(post_model.MarkazPost).filter(post_model.MarkazPost.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    db.delete(post)
    db.commit()

    return {"message": "Post deleted successfully ✅"}