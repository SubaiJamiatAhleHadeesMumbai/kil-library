import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_

from auth import get_current_user
from database import get_db
from models import user_model
from models.gallery_model import GalleryAlbum, GalleryItem

router = APIRouter(prefix="/api/gallery", tags=["Gallery"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "gallery_uploads"


def _require_admin(user: user_model.User = Depends(get_current_user)):
    if not user or not getattr(user, "role", None):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    role_name = (user.role.name or "").strip().lower()
    if role_name in ["admin", "superadmin", "administrator", "super_admin", "social & welfare officer", "head librarian", "librarian", "editor", "manager"]:
        return user
    user_perms = {p.name for p in user.role.permissions if getattr(p, "name", None)}
    if user_perms & {"HOMEPAGE_CONTENT_MANAGE", "SOCIAL_WORK_MANAGE", "BOOK_MANAGE"}:
        return user
    raise HTTPException(status_code=403, detail="Admin privileges required")


def _ensure_default_album(db: Session):
    general = db.query(GalleryAlbum).filter(GalleryAlbum.id == "general", GalleryAlbum.deleted_at.is_(None)).first()
    if not general:
        general = GalleryAlbum(
            id="general",
            title_en="General Gallery",
            title_ur="عمومی تصاویر",
            title_ar="الصور العامة",
            description_en="Photos and glimpses of Markaz Dawah and Library",
            description_ur="مرکز الدعوۃ اور کتب خانہ کی اہم جھلکیاں",
            description_ar="لقطات من مركز الدعوة والمكتبة",
            year="2026",
            cover_image="",
            sort_order=0,
            is_active=True
        )
        db.add(general)
        db.commit()
        db.refresh(general)
    return general


# =========================================================================
# PUBLIC ENDPOINTS
# =========================================================================

@router.get("/public")
def get_public_gallery(
    album_id: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns active albums and active gallery items from DB.
    Can be optionally filtered by album_id and/or year.
    """
    _ensure_default_album(db)

    albums_db = db.query(GalleryAlbum).filter(
        GalleryAlbum.deleted_at.is_(None),
        GalleryAlbum.is_active.is_(True)
    ).order_by(GalleryAlbum.sort_order.asc(), GalleryAlbum.created_at.asc()).all()
    active_albums = [a.to_dict() for a in albums_db]

    query = db.query(GalleryItem).filter(
        GalleryItem.deleted_at.is_(None),
        GalleryItem.is_active.is_(True)
    )

    if album_id and album_id != "all":
        query = query.filter(GalleryItem.album_id == album_id)

    if year and year != "all":
        query = query.filter(GalleryItem.year == year)

    items_db = query.order_by(GalleryItem.sort_order.asc(), GalleryItem.created_at.desc()).all()
    active_items = [i.to_dict() for i in items_db]

    # Collect all available years
    all_years = db.query(GalleryItem.year).filter(
        GalleryItem.deleted_at.is_(None),
        GalleryItem.year.isnot(None)
    ).distinct().all()
    available_years = sorted([y[0] for y in all_years if y[0]], reverse=True)

    return {
        "albums": active_albums,
        "items": active_items,
        "available_years": available_years,
        "total_count": len(active_items),
    }


# =========================================================================
# ADMIN ENDPOINTS
# =========================================================================

@router.get("/admin/all")
def get_admin_gallery(
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin)
):
    """
    Returns all albums and all gallery items including inactive ones.
    """
    _ensure_default_album(db)

    albums_db = db.query(GalleryAlbum).filter(
        GalleryAlbum.deleted_at.is_(None)
    ).order_by(GalleryAlbum.sort_order.asc()).all()

    items_db = db.query(GalleryItem).filter(
        GalleryItem.deleted_at.is_(None)
    ).order_by(GalleryItem.sort_order.asc(), GalleryItem.created_at.desc()).all()

    return {
        "albums": [a.to_dict() for a in albums_db],
        "items": [i.to_dict() for i in items_db]
    }


@router.post("/album")
def save_album(
    album_id: Optional[str] = Form(None),
    title_en: str = Form(""),
    title_ur: str = Form(""),
    title_ar: str = Form(""),
    desc_en: str = Form(""),
    desc_ur: str = Form(""),
    desc_ar: str = Form(""),
    year: str = Form("2026"),
    sort_order: int = Form(0),
    is_active: bool = Form(True),
    cover_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Create or update a trilingual album in DB.
    """
    cover_url = ""
    if cover_image and cover_image.filename:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        ext = Path(cover_image.filename).suffix or ".jpg"
        file_name = f"album_cover_{uuid.uuid4().hex[:8]}{ext}"
        target_path = UPLOAD_DIR / file_name
        with target_path.open("wb") as buffer:
            shutil.copyfileobj(cover_image.file, buffer)
        cover_url = f"/static/gallery_uploads/{file_name}"

    album = None
    if album_id:
        album = db.query(GalleryAlbum).filter(
            GalleryAlbum.id == album_id,
            GalleryAlbum.deleted_at.is_(None)
        ).first()

    if not album:
        new_id = album_id.strip() if album_id and album_id.strip() else f"album_{uuid.uuid4().hex[:8]}"
        album = GalleryAlbum(
            id=new_id,
            title_en=title_en.strip() or "Album",
            title_ur=title_ur.strip() or title_en.strip(),
            title_ar=title_ar.strip() or title_en.strip(),
            description_en=desc_en.strip(),
            description_ur=desc_ur.strip(),
            description_ar=desc_ar.strip(),
            year=year.strip() or "2026",
            cover_image=cover_url,
            sort_order=sort_order,
            is_active=is_active
        )
        db.add(album)
    else:
        if title_en.strip():
            album.title_en = title_en.strip()
        if title_ur.strip():
            album.title_ur = title_ur.strip()
        if title_ar.strip():
            album.title_ar = title_ar.strip()
        album.description_en = desc_en.strip()
        album.description_ur = desc_ur.strip()
        album.description_ar = desc_ar.strip()
        album.year = year.strip() or "2026"
        album.sort_order = sort_order
        album.is_active = is_active
        if cover_url:
            album.cover_image = cover_url

    db.commit()
    db.refresh(album)
    return {"message": "Album saved successfully", "album": album.to_dict()}


@router.delete("/album/{album_id}")
def delete_album(
    album_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Deletes an album and reassigns its photos back to 'general'.
    """
    _ensure_default_album(db)
    if album_id == "general":
        raise HTTPException(status_code=400, detail="Cannot delete default 'general' album.")

    album = db.query(GalleryAlbum).filter(
        GalleryAlbum.id == album_id,
        GalleryAlbum.deleted_at.is_(None)
    ).first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # Reassign items to 'general'
    db.query(GalleryItem).filter(GalleryItem.album_id == album_id).update({"album_id": "general"})

    album.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Album deleted successfully"}


@router.post("/batch-upload")
def batch_upload_photos(
    files: List[UploadFile] = File(...),
    album_id: str = Form("general"),
    year: str = Form("2026"),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Upload multiple photos at once and insert records into DB.
    """
    _ensure_default_album(db)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    uploaded_items = []

    current_max_sort = db.query(func.max(GalleryItem.sort_order)).filter(GalleryItem.deleted_at.is_(None)).scalar() or 0

    for idx, f in enumerate(files):
        if not f.filename:
            continue

        ext = Path(f.filename).suffix.lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            continue

        file_name = f"gallery_{uuid.uuid4().hex[:10]}{ext}"
        dest_path = UPLOAD_DIR / file_name
        with dest_path.open("wb") as buffer:
            shutil.copyfileobj(f.file, buffer)

        raw_name = Path(f.filename).stem.replace("_", " ").replace("-", " ")
        cleaned_title = " ".join(word.capitalize() for word in raw_name.split()) or "Gallery Photo"

        new_item = GalleryItem(
            id=f"photo_{uuid.uuid4().hex[:8]}",
            album_id=album_id.strip() or "general",
            image_url=f"/static/gallery_uploads/{file_name}",
            video_url="",
            title_en=cleaned_title,
            title_ur=cleaned_title,
            title_ar=cleaned_title,
            caption_en="",
            caption_ur="",
            caption_ar="",
            year=year.strip() or "2026",
            sort_order=current_max_sort + idx + 1,
            is_active=True
        )
        db.add(new_item)
        uploaded_items.append(new_item)

    db.commit()

    # If album has no cover image yet, set it to the first uploaded photo
    album = db.query(GalleryAlbum).filter(GalleryAlbum.id == album_id).first()
    if album and not album.cover_image and uploaded_items:
        album.cover_image = uploaded_items[0].image_url
        db.commit()

    return {
        "message": f"Successfully uploaded {len(uploaded_items)} photo(s)",
        "count": len(uploaded_items),
    }


@router.put("/item/{item_id}")
def update_gallery_item(
    item_id: str,
    album_id: str = Form("general"),
    title_en: str = Form(""),
    title_ur: str = Form(""),
    title_ar: str = Form(""),
    caption_en: str = Form(""),
    caption_ur: str = Form(""),
    caption_ar: str = Form(""),
    year: str = Form("2026"),
    video_url: str = Form(""),
    is_active: bool = Form(True),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Update trilingual metadata, album assignment, or video link in DB.
    """
    item = db.query(GalleryItem).filter(
        GalleryItem.id == item_id,
        GalleryItem.deleted_at.is_(None)
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")

    item.album_id = album_id.strip() or "general"
    item.year = year.strip() or "2026"
    item.video_url = video_url.strip()
    item.is_active = is_active
    item.title_en = title_en.strip() or item.title_en
    item.title_ur = title_ur.strip() or title_en.strip() or item.title_ur
    item.title_ar = title_ar.strip() or title_en.strip() or item.title_ar
    item.caption_en = caption_en.strip()
    item.caption_ur = caption_ur.strip()
    item.caption_ar = caption_ar.strip()

    db.commit()
    db.refresh(item)
    return {"message": "Item updated successfully", "item": item.to_dict()}


@router.delete("/item/{item_id}")
def delete_gallery_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Delete a single photo from the gallery DB.
    """
    item = db.query(GalleryItem).filter(
        GalleryItem.id == item_id,
        GalleryItem.deleted_at.is_(None)
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")

    item.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Gallery item deleted successfully"}


@router.post("/bulk-status")
def bulk_status_gallery(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Bulk toggle active status: {"item_ids": ["id1", "id2"], "is_active": true/false}
    """
    item_ids = list(payload.get("item_ids", []))
    is_active = bool(payload.get("is_active", True))

    updated = db.query(GalleryItem).filter(
        GalleryItem.id.in_(item_ids),
        GalleryItem.deleted_at.is_(None)
    ).update({"is_active": is_active}, synchronize_session=False)

    db.commit()
    return {"message": f"Updated status for {updated} items"}


@router.post("/bulk-delete")
def bulk_delete_gallery(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Bulk delete photos: {"item_ids": ["id1", "id2"]}
    """
    item_ids = list(payload.get("item_ids", []))
    deleted = db.query(GalleryItem).filter(
        GalleryItem.id.in_(item_ids),
        GalleryItem.deleted_at.is_(None)
    ).update({"deleted_at": datetime.utcnow()}, synchronize_session=False)

    db.commit()
    return {"message": f"Deleted {deleted} items"}


@router.put("/reorder")
def reorder_gallery_items(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Reorder items: {"item_ids": ["id1", "id2", ...]}
    """
    ordered_ids = payload.get("item_ids", [])
    for idx, item_id in enumerate(ordered_ids):
        db.query(GalleryItem).filter(GalleryItem.id == item_id).update({"sort_order": idx})

    db.commit()
    return {"message": "Reordered items successfully"}
