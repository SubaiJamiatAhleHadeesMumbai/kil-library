import json
import math
from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_

from database import get_db
from models import newspaper_clipping_model, user_model
from schemas.newspaper_clipping_schema import (
    NewspaperClippingCreate,
    NewspaperClippingUpdate,
    NewspaperClippingResponse,
    NewspaperClippingListResponse
)
from auth import get_current_user
from utils.cloudinary_helper import upload_to_cloudinary

router = APIRouter()

def _is_admin(user: Optional[user_model.User]) -> bool:
    if not user or not getattr(user, "role", None) or not getattr(user.role, "name", None):
        return False
    role_name = user.role.name.strip().lower()
    if role_name in [
        "admin", "superadmin", "super admin", "administrator",
        "librarian", "head librarian", "social & welfare officer", "editor"
    ]:
        return True

    # Also check permissions
    user_perms = set()
    if user.role.permissions:
        for p in user.role.permissions:
            if hasattr(p, "code") and p.code:
                user_perms.add(p.code)
            elif hasattr(p, "name") and p.name:
                user_perms.add(p.name)

    return bool(user_perms & {"BOOK_VIEW", "BOOK_MANAGE", "HOMEPAGE_CONTENT_MANAGE", "SOCIAL_WORK_MANAGE", "USER_MANAGE"})

# ==========================================
# 🌐 PUBLIC ENDPOINTS (Strictly is_active == True)
# ==========================================

@router.get("", response_model=NewspaperClippingListResponse)
@router.get("/", response_model=NewspaperClippingListResponse, include_in_schema=False)
def get_public_clippings(
    search: Optional[str] = Query(None, description="Search keyword in title, newspaper name or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    newspaper: Optional[str] = Query(None, description="Filter by newspaper name"),
    year: Optional[int] = Query(None, description="Filter by publication year"),
    sort: str = Query("newest", description="'newest', 'oldest', or 'popular'"),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(newspaper_clipping_model.NewspaperClipping).filter(
        newspaper_clipping_model.NewspaperClipping.is_active == True
    )

    if category and category.lower() != "all":
        query = query.filter(func.lower(newspaper_clipping_model.NewspaperClipping.category) == category.lower())

    if newspaper and newspaper.lower() != "all":
        query = query.filter(func.lower(newspaper_clipping_model.NewspaperClipping.newspaper_name) == newspaper.lower())

    if year:
        query = query.filter(func.extract('year', newspaper_clipping_model.NewspaperClipping.edition_date) == year)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                newspaper_clipping_model.NewspaperClipping.title.ilike(pattern),
                newspaper_clipping_model.NewspaperClipping.newspaper_name.ilike(pattern),
                newspaper_clipping_model.NewspaperClipping.category.ilike(pattern),
                newspaper_clipping_model.NewspaperClipping.description.ilike(pattern),
            )
        )

    # Sorting
    if sort == "oldest":
        query = query.order_by(
            asc(newspaper_clipping_model.NewspaperClipping.edition_date),
            asc(newspaper_clipping_model.NewspaperClipping.id)
        )
    elif sort == "popular":
        query = query.order_by(desc(newspaper_clipping_model.NewspaperClipping.views_count))
    else: # newest
        query = query.order_by(
            desc(newspaper_clipping_model.NewspaperClipping.edition_date),
            desc(newspaper_clipping_model.NewspaperClipping.id)
        )

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }


@router.get("/filters/categories")
def get_clipping_categories(db: Session = Depends(get_db)):
    """Returns all distinct categories with active item counts."""
    results = (
        db.query(
            newspaper_clipping_model.NewspaperClipping.category,
            func.count(newspaper_clipping_model.NewspaperClipping.id).label("count")
        )
        .filter(newspaper_clipping_model.NewspaperClipping.is_active == True)
        .group_by(newspaper_clipping_model.NewspaperClipping.category)
        .order_by(desc("count"))
        .all()
    )
    return [{"name": r[0], "count": r[1]} for r in results if r[0]]


@router.get("/filters/newspapers")
def get_clipping_newspapers(db: Session = Depends(get_db)):
    """Returns all distinct newspaper names with active item counts."""
    results = (
        db.query(
            newspaper_clipping_model.NewspaperClipping.newspaper_name,
            func.count(newspaper_clipping_model.NewspaperClipping.id).label("count")
        )
        .filter(newspaper_clipping_model.NewspaperClipping.is_active == True)
        .group_by(newspaper_clipping_model.NewspaperClipping.newspaper_name)
        .order_by(desc("count"))
        .all()
    )
    return [{"name": r[0], "count": r[1]} for r in results if r[0]]


@router.get("/{clipping_id}", response_model=NewspaperClippingResponse)
def get_clipping_by_id(
    clipping_id: int,
    db: Session = Depends(get_db)
):
    clipping = db.query(newspaper_clipping_model.NewspaperClipping).filter(
        newspaper_clipping_model.NewspaperClipping.id == clipping_id
    ).first()

    if not clipping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Newspaper clipping not found")

    # Increment view count
    try:
        clipping.views_count = (clipping.views_count or 0) + 1
        db.commit()
        db.refresh(clipping)
    except Exception:
        db.rollback()

    return clipping


# ==========================================
# 🔒 ADMIN ENDPOINTS (Full Control & Management)
# ==========================================

@router.get("/admin/all", response_model=NewspaperClippingListResponse)
def get_admin_clippings(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query("all", description="'all', 'active', or 'inactive'"),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required.")

    query = db.query(newspaper_clipping_model.NewspaperClipping)

    if status_filter == "active":
        query = query.filter(newspaper_clipping_model.NewspaperClipping.is_active == True)
    elif status_filter == "inactive":
        query = query.filter(newspaper_clipping_model.NewspaperClipping.is_active == False)

    if category and category.lower() != "all":
        query = query.filter(func.lower(newspaper_clipping_model.NewspaperClipping.category) == category.lower())

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                newspaper_clipping_model.NewspaperClipping.title.ilike(pattern),
                newspaper_clipping_model.NewspaperClipping.newspaper_name.ilike(pattern),
                newspaper_clipping_model.NewspaperClipping.category.ilike(pattern),
                newspaper_clipping_model.NewspaperClipping.description.ilike(pattern),
            )
        )

    query = query.order_by(
        desc(newspaper_clipping_model.NewspaperClipping.created_at),
        desc(newspaper_clipping_model.NewspaperClipping.id)
    )

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }


@router.post("", response_model=NewspaperClippingResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=NewspaperClippingResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_clipping(
    title: str = Form(..., description="Headline of the clipping"),
    newspaper_name: str = Form(..., description="Name of the newspaper"),
    edition_date: Optional[str] = Form(None, description="Publish date YYYY-MM-DD"),
    category: str = Form("General", description="Category of the clipping"),
    description: Optional[str] = Form(None, description="Description or text summary"),
    is_active: bool = Form(True, description="Publish status (True for public, False for draft)"),
    image: Optional[UploadFile] = File(None, description="Single image upload"),
    images: Optional[List[UploadFile]] = File(None, description="Multiple images upload"),
    image_url: Optional[str] = Form(None, description="Direct primary image URL"),
    images_json: Optional[str] = Form(None, description="JSON list of image URLs"),
    pdf_file: Optional[UploadFile] = File(None, description="Optional PDF file"),
    pdf_url: Optional[str] = Form(None, description="Direct PDF URL if not uploading file"),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required.")

    uploaded_image_urls = []

    # 1. Parse any existing image URLs from images_json or image_url
    if images_json:
        try:
            parsed = json.loads(images_json)
            if isinstance(parsed, list):
                uploaded_image_urls.extend([str(u) for u in parsed if u])
            elif isinstance(parsed, str) and parsed:
                uploaded_image_urls.append(parsed)
        except Exception:
            pass

    if image_url and image_url not in uploaded_image_urls:
        uploaded_image_urls.append(image_url.strip())

    # 2. Upload multiple images if provided
    all_files_to_upload = []
    if images:
        for f in images:
            if f and f.filename:
                all_files_to_upload.append(f)

    if image and image.filename and image not in all_files_to_upload:
        all_files_to_upload.append(image)

    for file_item in all_files_to_upload:
        try:
            url = upload_to_cloudinary(file=file_item, folder="newspaper_clippings")
            if url:
                uploaded_image_urls.append(url)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Image upload error: {str(e)}")

    if not uploaded_image_urls:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one image file or image_url is required.")

    primary_image_url = uploaded_image_urls[0]

    # Handle PDF file
    final_pdf_url = pdf_url
    if pdf_file and pdf_file.filename:
        try:
            url = upload_to_cloudinary(file=pdf_file, folder="newspaper_clippings_pdf", resource_type="raw")
            if url:
                final_pdf_url = url
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"PDF upload error: {str(e)}")

    parsed_date = None
    if edition_date:
        try:
            parsed_date = date.fromisoformat(edition_date.strip())
        except Exception:
            pass

    new_clipping = newspaper_clipping_model.NewspaperClipping(
        title=title.strip(),
        newspaper_name=newspaper_name.strip(),
        edition_date=parsed_date,
        category=category.strip() if category else "General",
        image_url=primary_image_url,
        images=json.dumps(uploaded_image_urls),
        pdf_url=final_pdf_url,
        description=description.strip() if description else None,
        is_active=is_active
    )

    db.add(new_clipping)
    db.commit()
    db.refresh(new_clipping)
    return new_clipping


@router.put("/{clipping_id}", response_model=NewspaperClippingResponse)
async def update_clipping(
    clipping_id: int,
    title: Optional[str] = Form(None),
    newspaper_name: Optional[str] = Form(None),
    edition_date: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None),
    image_url: Optional[str] = Form(None),
    images_json: Optional[str] = Form(None),
    pdf_file: Optional[UploadFile] = File(None),
    pdf_url: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required.")

    clipping = db.query(newspaper_clipping_model.NewspaperClipping).filter(
        newspaper_clipping_model.NewspaperClipping.id == clipping_id
    ).first()

    if not clipping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clipping not found.")

    if title is not None:
        clipping.title = title.strip()
    if newspaper_name is not None:
        clipping.newspaper_name = newspaper_name.strip()
    if category is not None:
        clipping.category = category.strip()
    if description is not None:
        clipping.description = description.strip()
    if is_active is not None:
        clipping.is_active = is_active

    if edition_date is not None:
        try:
            clipping.edition_date = date.fromisoformat(edition_date.strip()) if edition_date.strip() else None
        except Exception:
            pass

    # Existing images list
    current_images = []
    if images_json is not None:
        try:
            parsed = json.loads(images_json)
            if isinstance(parsed, list):
                current_images = [str(u) for u in parsed if u]
        except Exception:
            pass
    elif clipping.images:
        try:
            parsed = json.loads(clipping.images)
            if isinstance(parsed, list):
                current_images = parsed
        except Exception:
            current_images = [clipping.image_url]
    elif clipping.image_url:
        current_images = [clipping.image_url]

    # Upload any new images
    new_files_to_upload = []
    if images:
        for f in images:
            if f and f.filename:
                new_files_to_upload.append(f)
    if image and image.filename and image not in new_files_to_upload:
        new_files_to_upload.append(image)

    for file_item in new_files_to_upload:
        try:
            url = upload_to_cloudinary(file=file_item, folder="newspaper_clippings")
            if url:
                current_images.append(url)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Image upload error: {str(e)}")

    if image_url and image_url not in current_images:
        current_images.insert(0, image_url.strip())

    if current_images:
        clipping.image_url = current_images[0]
        clipping.images = json.dumps(current_images)

    if pdf_file and pdf_file.filename:
        try:
            url = upload_to_cloudinary(file=pdf_file, folder="newspaper_clippings_pdf", resource_type="raw")
            if url:
                clipping.pdf_url = url
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"PDF upload error: {str(e)}")
    elif pdf_url is not None:
        clipping.pdf_url = pdf_url

    db.commit()
    db.refresh(clipping)
    return clipping


@router.patch("/{clipping_id}/toggle-active", response_model=NewspaperClippingResponse)
def toggle_clipping_active(
    clipping_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    """1-Click Instant toggle between Active (Published) and Inactive (Draft)."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required.")

    clipping = db.query(newspaper_clipping_model.NewspaperClipping).filter(
        newspaper_clipping_model.NewspaperClipping.id == clipping_id
    ).first()

    if not clipping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clipping not found.")

    clipping.is_active = not bool(clipping.is_active)
    db.commit()
    db.refresh(clipping)
    return clipping


@router.delete("/{clipping_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_clipping(
    clipping_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required.")

    clipping = db.query(newspaper_clipping_model.NewspaperClipping).filter(
        newspaper_clipping_model.NewspaperClipping.id == clipping_id
    ).first()

    if not clipping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clipping not found.")

    db.delete(clipping)
    db.commit()
    return None
