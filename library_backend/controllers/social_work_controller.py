import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models import social_work_model, user_model
from schemas.social_work_schema import SocialWorkCreate, SocialWorkUpdate, SocialWorkResponse
from auth import require_permission, get_current_user
from utils.cloudinary_helper import upload_to_cloudinary
from utils.file_validator import validate_image

router = APIRouter()

ALLOWED_CATEGORIES = {"education", "activities", "social_work", "other"}

def _get_author_name(item: social_work_model.SocialWorkItem) -> str:
    try:
        if item.author:
            if getattr(item.author, "full_name", None):
                return item.author.full_name
            if getattr(item.author, "username", None):
                return item.author.username
            if getattr(item.author, "email", None):
                return item.author.email
    except Exception:
        pass
    return "Markaz Admin"

def _to_response(item: social_work_model.SocialWorkItem) -> SocialWorkResponse:
    resp = SocialWorkResponse.model_validate(item)
    resp.author_name = _get_author_name(item)
    return resp

# ==========================================
# 🌐 PUBLIC ENDPOINTS
# ==========================================

@router.get("/public", response_model=List[SocialWorkResponse])
def get_public_items(
    category: Optional[str] = Query(None, description="Filter by: 'education', 'activities', or 'social_work'"),
    search: Optional[str] = Query(None, description="Search keyword in title/subtitle/tags"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(social_work_model.SocialWorkItem).filter(
        social_work_model.SocialWorkItem.is_published == True
    )

    if category and category in ALLOWED_CATEGORIES:
        query = query.filter(social_work_model.SocialWorkItem.category == category)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (social_work_model.SocialWorkItem.title.ilike(search_pattern)) |
            (social_work_model.SocialWorkItem.subtitle.ilike(search_pattern)) |
            (social_work_model.SocialWorkItem.tags.ilike(search_pattern))
        )

    items = query.order_by(
        desc(social_work_model.SocialWorkItem.event_date),
        desc(social_work_model.SocialWorkItem.created_at)
    ).offset(skip).limit(limit).all()

    return [_to_response(item) for item in items]


@router.get("/public/{item_id}", response_model=SocialWorkResponse)
def get_public_item_detail(item_id: int, db: Session = Depends(get_db)):
    item = db.query(social_work_model.SocialWorkItem).filter(
        social_work_model.SocialWorkItem.id == item_id,
        social_work_model.SocialWorkItem.is_published == True
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found or not published")

    return _to_response(item)


# ==========================================
# 🔒 ADMIN ENDPOINTS
# ==========================================

@router.get("/", response_model=List[SocialWorkResponse])
def get_admin_items(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("USER_MANAGE"))
):
    query = db.query(social_work_model.SocialWorkItem)

    if category and category in ALLOWED_CATEGORIES:
        query = query.filter(social_work_model.SocialWorkItem.category == category)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (social_work_model.SocialWorkItem.title.ilike(search_pattern)) |
            (social_work_model.SocialWorkItem.subtitle.ilike(search_pattern)) |
            (social_work_model.SocialWorkItem.tags.ilike(search_pattern))
        )

    items = query.order_by(
        desc(social_work_model.SocialWorkItem.created_at)
    ).offset(skip).limit(limit).all()

    return [_to_response(item) for item in items]


@router.post("/", response_model=SocialWorkResponse)
def create_item(
    payload: SocialWorkCreate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("USER_MANAGE"))
):
    if payload.category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {ALLOWED_CATEGORIES}")

    # If featured_image not explicitly set, use first image from images list if available
    featured_img = payload.featured_image
    if not featured_img and payload.images and len(payload.images) > 0:
        first_img = payload.images[0]
        if isinstance(first_img, dict):
            featured_img = first_img.get("url")
        elif isinstance(first_img, str):
            featured_img = first_img

    new_item = social_work_model.SocialWorkItem(
        category=payload.category,
        title=payload.title.strip(),
        subtitle=payload.subtitle.strip() if payload.subtitle else None,
        content=payload.content,
        event_date=payload.event_date or datetime.utcnow(),
        location=payload.location.strip() if payload.location else None,
        featured_image=featured_img,
        images=payload.images or [],
        tags=payload.tags.strip() if payload.tags else None,
        is_published=payload.is_published,
        author_id=current_user.id
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return _to_response(new_item)


@router.put("/{item_id}", response_model=SocialWorkResponse)
def update_item(
    item_id: int,
    payload: SocialWorkUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("USER_MANAGE"))
):
    item = db.query(social_work_model.SocialWorkItem).filter(
        social_work_model.SocialWorkItem.id == item_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "category" in update_data and update_data["category"] not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {ALLOWED_CATEGORIES}")

    for key, value in update_data.items():
        setattr(item, key, value)

    # Automatically set featured_image if missing
    if not item.featured_image and item.images and len(item.images) > 0:
        first_img = item.images[0]
        if isinstance(first_img, dict):
            item.featured_image = first_img.get("url")
        elif isinstance(first_img, str):
            item.featured_image = first_img

    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)

    return _to_response(item)


@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("USER_MANAGE"))
):
    item = db.query(social_work_model.SocialWorkItem).filter(
        social_work_model.SocialWorkItem.id == item_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()

    return {"message": "Item deleted successfully", "id": item_id}


# ==========================================
# 🖼️ MULTIPLE IMAGE UPLOAD ENDPOINT
# ==========================================

@router.post("/upload-images")
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    folder: str = Form("markaz_social_work"),
    current_user: user_model.User = Depends(require_permission("FILE_UPLOAD"))
):
    """
    Upload multiple images simultaneously.
    Returns list of uploaded image objects: [{"url": "...", "caption": "", "filename": "..."}]
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")

    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 images allowed in a single upload batch")

    uploaded_results = []

    for file in files:
        # Validate size & format
        try:
            await validate_image(file)
        except Exception as e:
            continue

        try:
            url = upload_to_cloudinary(file, folder=folder)
            if url:
                uploaded_results.append({
                    "url": url,
                    "caption": "",
                    "title": file.filename or ""
                })
        except Exception as err:
            print(f"Error uploading image {file.filename}: {err}")

    if not uploaded_results:
        raise HTTPException(status_code=500, detail="Failed to upload any of the selected images.")

    return {"images": uploaded_results, "count": len(uploaded_results)}
