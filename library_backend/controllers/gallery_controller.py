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
from utils.storage_helper import smart_upload

router = APIRouter(prefix="", tags=["Gallery"])

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


import re

def _extract_youtube_info(url: str):
    if not url:
        return None, None, None
    url = url.strip()
    pattern = r"(?:v=|\/embed\/|\/shorts\/|youtu\.be\/|\/v\/|watch\?v=|\&v=)([a-zA-Z0-9_-]{11})"
    match = re.search(pattern, url)
    if match:
        video_id = match.group(1)
        embed_url = f"https://www.youtube-nocookie.com/embed/{video_id}"
        thumbnail_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        return video_id, embed_url, thumbnail_url
    return None, url, ""


def _ensure_gallery_columns(db: Session):
    try:
        from sqlalchemy import text
        engine_name = db.bind.dialect.name if db.bind else ""
        if engine_name == "postgresql":
            db.execute(text("ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'photo' NOT NULL;"))
            db.execute(text("ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS event_date VARCHAR(50);"))
            db.execute(text("ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS hijri_month VARCHAR(50);"))
            db.commit()
        elif engine_name == "sqlite":
            res = db.execute(text("PRAGMA table_info(gallery_items);")).fetchall()
            cols = [col[1] for col in res]
            if "item_type" not in cols:
                db.execute(text("ALTER TABLE gallery_items ADD COLUMN item_type VARCHAR(50) DEFAULT 'photo';"))
            if "event_date" not in cols:
                db.execute(text("ALTER TABLE gallery_items ADD COLUMN event_date VARCHAR(50);"))
            if "hijri_month" not in cols:
                db.execute(text("ALTER TABLE gallery_items ADD COLUMN hijri_month VARCHAR(50);"))
            db.commit()
    except Exception:
        db.rollback()


def _ensure_default_album(db: Session):
    _ensure_gallery_columns(db)
    # Check if general album exists (including soft-deleted)
    general = db.query(GalleryAlbum).filter(GalleryAlbum.id == "general").first()
    if general:
        if general.deleted_at is not None or not general.is_active:
            general.deleted_at = None
            general.is_active = True
            db.commit()
            db.refresh(general)
        return general

    general = GalleryAlbum(
        id="general",
        title_en="General Gallery",
        title_ur="عمومی البم (ڈیفالٹ)",
        title_ar="المعرض العام",
        description_en="Photos, videos and glimpses of Markaz Dawah and Library",
        description_ur="مرکز الدعوۃ اور کتب خانہ کی اہم جھلکیاں و ویڈیوز",
        description_ar="لقطات وفيديوهات من مركز الدعوة والمكتبة",
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
    item_type: Optional[str] = Query(None),
    home_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Returns active albums and active gallery items from DB.
    Can be optionally filtered by album_id, year, item_type, and/or home_only.
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

    if home_only:
        query = query.filter(GalleryItem.show_on_home.is_(True))

    if album_id and album_id != "all":
        query = query.filter(GalleryItem.album_id == album_id)

    if year and year != "all":
        query = query.filter(GalleryItem.year == year)

    if item_type and item_type != "all":
        query = query.filter(GalleryItem.item_type == item_type)

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


@router.get("/public/home")
def get_home_featured_gallery(
    limit: int = Query(8, ge=1, le=24),
    db: Session = Depends(get_db)
):
    """
    Returns only photos marked with show_on_home=True for display on the Homepage.
    """
    _ensure_default_album(db)
    items_db = db.query(GalleryItem).filter(
        GalleryItem.deleted_at.is_(None),
        GalleryItem.is_active.is_(True),
        GalleryItem.show_on_home.is_(True)
    ).order_by(GalleryItem.sort_order.asc(), GalleryItem.created_at.desc()).limit(limit).all()

    # Fallback: If no photos are explicitly pinned, automatically display the latest active gallery photos
    if not items_db:
        items_db = db.query(GalleryItem).filter(
            GalleryItem.deleted_at.is_(None),
            GalleryItem.is_active.is_(True)
        ).order_by(GalleryItem.sort_order.asc(), GalleryItem.created_at.desc()).limit(limit).all()

    return {
        "items": [i.to_dict() for i in items_db],
        "total_count": len(items_db),
    }


@router.get("/public/islamic-updates")
def get_islamic_updates(
    db: Session = Depends(get_db)
):
    """
    Returns the latest active Jumah item and latest active Moon Date item for homepage widgets.
    """
    _ensure_default_album(db)

    jumah_item = db.query(GalleryItem).filter(
        GalleryItem.deleted_at.is_(None),
        GalleryItem.is_active.is_(True),
        GalleryItem.item_type == "jumah"
    ).order_by(GalleryItem.created_at.desc(), GalleryItem.id.desc()).first()

    moon_item = db.query(GalleryItem).filter(
        GalleryItem.deleted_at.is_(None),
        GalleryItem.is_active.is_(True),
        GalleryItem.item_type == "moon"
    ).order_by(GalleryItem.created_at.desc(), GalleryItem.id.desc()).first()

    return {
        "jumah": jumah_item.to_dict() if jumah_item else None,
        "moon": moon_item.to_dict() if moon_item else None,
    }


def _parse_jumah_date_meta(item):
    """
    Extracts year (str), month_index (1-12), and month_name from a Jumah item.
    """
    raw_date = str(item.event_date or "").strip()
    raw_year = str(item.year or "").strip()

    month_lookup = {
        "january": 1, "jan": 1, "جنوری": 1,
        "february": 2, "feb": 2, "فروری": 2,
        "march": 3, "mar": 3, "مارچ": 3,
        "april": 4, "apr": 4, "اپریل": 4,
        "may": 5, "مئی": 5,
        "june": 6, "jun": 6, "جون": 6,
        "july": 7, "jul": 7, "جولائی": 7,
        "august": 8, "aug": 8, "اگست": 8,
        "september": 9, "sep": 9, "ستمبر": 9,
        "october": 10, "oct": 10, "اکتوبر": 10,
        "november": 11, "nov": 11, "نومبر": 11,
        "december": 12, "dec": 12, "دسمبر": 12,
    }

    found_month = 1
    found_year = "2026"

    # Try ISO YYYY-MM-DD
    m_iso = re.search(r'(\d{4})-(\d{1,2})-(\d{1,2})', raw_date)
    if m_iso:
        found_year = m_iso.group(1)
        found_month = int(m_iso.group(2))
    else:
        # Try DD-MM-YYYY or DD/MM/YYYY
        m_dmy = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', raw_date)
        if m_dmy:
            found_year = m_dmy.group(3)
            found_month = int(m_dmy.group(2))
        else:
            lower_date = raw_date.lower()
            for name, idx in month_lookup.items():
                if name in lower_date:
                    found_month = idx
                    break
            m_yr = re.search(r'\b(20\d{2})\b', raw_date)
            if m_yr:
                found_year = m_yr.group(1)
            elif raw_year and len(raw_year) == 4 and raw_year.isdigit():
                found_year = raw_year
            elif item.created_at:
                found_year = str(item.created_at.year)

    return found_year, max(1, min(12, found_month))


@router.get("/public/jumah-archive")
def get_jumah_archive(
    db: Session = Depends(get_db)
):
    """
    Returns all active Friday Sermons (Khutbaat-e-Jumu'ah) grouped by Year and Gregorian Month.
    Matches the official Subai Jamiat Ahle Hadees Mumbai juma-list structure.
    """
    _ensure_default_album(db)

    items_db = db.query(GalleryItem).filter(
        GalleryItem.deleted_at.is_(None),
        GalleryItem.is_active.is_(True),
        GalleryItem.item_type == "jumah"
    ).order_by(GalleryItem.created_at.desc(), GalleryItem.id.desc()).all()

    # Month names mapping
    months_info = [
        {"index": 1, "key": "january", "name_ur": "جنوری", "name_en": "January"},
        {"index": 2, "key": "february", "name_ur": "فروری", "name_en": "February"},
        {"index": 3, "key": "march", "name_ur": "مارچ", "name_en": "March"},
        {"index": 4, "key": "april", "name_ur": "اپریل", "name_en": "April"},
        {"index": 5, "key": "may", "name_ur": "مئی", "name_en": "May"},
        {"index": 6, "key": "june", "name_ur": "جون", "name_en": "June"},
        {"index": 7, "key": "july", "name_ur": "جولائی", "name_en": "July"},
        {"index": 8, "key": "august", "name_ur": "اگست", "name_en": "August"},
        {"index": 9, "key": "september", "name_ur": "ستمبر", "name_en": "September"},
        {"index": 10, "key": "october", "name_ur": "اکتوبر", "name_en": "October"},
        {"index": 11, "key": "november", "name_ur": "نومبر", "name_en": "November"},
        {"index": 12, "key": "december", "name_ur": "دسمبر", "name_en": "December"},
    ]

    years_map = {}
    for it in items_db:
        parsed_year, parsed_month = _parse_jumah_date_meta(it)
        item_dict = it.to_dict()
        item_dict["parsed_year"] = parsed_year
        item_dict["parsed_month"] = parsed_month

        if parsed_year not in years_map:
            years_map[parsed_year] = {m["index"]: [] for m in months_info}
        years_map[parsed_year][parsed_month].append(item_dict)

    # Build response grouped by year, then each month
    years_list = []
    for yr in sorted(years_map.keys(), reverse=True):
        months_list = []
        year_total = 0
        for m in months_info:
            m_items = years_map[yr].get(m["index"], [])
            # Sort items in month by event_date desc
            m_items_sorted = sorted(m_items, key=lambda x: str(x.get("event_date", "")), reverse=True)
            year_total += len(m_items_sorted)
            months_list.append({
                "index": m["index"],
                "key": m["key"],
                "name_ur": m["name_ur"],
                "name_en": m["name_en"],
                "items": m_items_sorted,
                "count": len(m_items_sorted)
            })

        years_list.append({
            "year": yr,
            "total_items": year_total,
            "months": months_list
        })

    return {
        "years": years_list,
        "total_count": len(items_db)
    }


@router.get("/public/moon-archive")
def get_moon_archive(
    db: Session = Depends(get_db)
):
    """
    Returns all active Moon Sighting (Ruyat-e-Hilal) announcements grouped by Hijri Year.
    Matches the official Subai Jamiat Ahle Hadees Mumbai moon archive structure.
    """
    _ensure_default_album(db)

    items_db = db.query(GalleryItem).filter(
        GalleryItem.deleted_at.is_(None),
        GalleryItem.is_active.is_(True),
        GalleryItem.item_type == "moon"
    ).order_by(GalleryItem.year.desc(), GalleryItem.sort_order.asc(), GalleryItem.created_at.desc()).all()

    # Month ordering weights
    month_weights = {
        "muharram": 1,
        "safar": 2,
        "rabi_al_awwal": 3,
        "rabi_al_thani": 4,
        "jumada_al_awwal": 5,
        "jumada_al_thani": 6,
        "rajab": 7,
        "shaban": 8,
        "ramadan": 9,
        "shawwal": 10,
        "dhul_qadah": 11,
        "dhul_hijjah": 12,
    }

    years_map = {}
    for it in items_db:
        raw_year = str(it.year or "1448").strip()
        if raw_year not in years_map:
            years_map[raw_year] = []
        years_map[raw_year].append(it.to_dict())

    # Sort items within each year by month weight or date
    years_list = []
    for yr in sorted(years_map.keys(), reverse=True):
        sorted_items = sorted(
            years_map[yr],
            key=lambda x: month_weights.get(str(x.get("hijri_month", "")).lower().replace("-", "_").replace(" ", "_"), 99)
        )
        years_list.append({
            "year": yr,
            "items": sorted_items
        })

    return {
        "years": years_list,
        "total_count": len(items_db)
    }


@router.get("/public/calendar-archive")
def get_calendar_archive(
    year: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns 12-month Islamic Calendar posters.
    Includes the currently featured active calendar, along with all uploaded months for the year.
    """
    _ensure_default_album(db)

    query = db.query(GalleryItem).filter(
        GalleryItem.deleted_at.is_(None),
        GalleryItem.is_active.is_(True),
        GalleryItem.item_type == "calendar"
    )

    if year and year.strip():
        query = query.filter(GalleryItem.year == year.strip())

    items_db = query.order_by(
        GalleryItem.year.desc(),
        GalleryItem.sort_order.asc(),
        GalleryItem.created_at.desc()
    ).all()

    # Find the current/featured calendar (show_on_home is True, or latest uploaded)
    current_calendar = None
    for it in items_db:
        if bool(it.show_on_home):
            current_calendar = it.to_dict()
            break

    if not current_calendar and items_db:
        current_calendar = items_db[0].to_dict()

    # Canonical 12 Islamic Months definitions
    month_definitions = [
        {"month_number": 1, "key": "muharram", "ur": "محرم الحرام", "en": "Muharram"},
        {"month_number": 2, "key": "safar", "ur": "صفر المظفر", "en": "Safar"},
        {"month_number": 3, "key": "rabi_al_awwal", "ur": "ربيع الأول", "en": "Rabi-ul-Awwal"},
        {"month_number": 4, "key": "rabi_al_thani", "ur": "ربيع الثاني", "en": "Rabi-us-Sani"},
        {"month_number": 5, "key": "jumada_al_awwal", "ur": "جمادى الأولى", "en": "Jumada al-Ula"},
        {"month_number": 6, "key": "jumada_al_thani", "ur": "جمادى الثانية", "en": "Jumada al-Thani"},
        {"month_number": 7, "key": "rajab", "ur": "رجب المرجب", "en": "Rajab"},
        {"month_number": 8, "key": "shaban", "ur": "شعبان المعظم", "en": "Sha'ban"},
        {"month_number": 9, "key": "ramadan", "ur": "رمضان المبارک", "en": "Ramadan"},
        {"month_number": 10, "key": "shawwal", "ur": "شوال المکرم", "en": "Shawwal"},
        {"month_number": 11, "key": "dhul_qadah", "ur": "ذو القعدة", "en": "Dhul Qi'dah"},
        {"month_number": 12, "key": "dhul_hijjah", "ur": "ذو الحجة", "en": "Dhul Hijjah"},
    ]

    all_items_dict = [it.to_dict() for it in items_db]

    return {
        "current_calendar": current_calendar,
        "items": all_items_dict,
        "month_definitions": month_definitions,
        "total_count": len(items_db)
    }


# =========================================================================
# ADMIN ENDPOINTS
# =========================================================================

@router.get("/admin/all")
def get_admin_gallery(
    item_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin)
):
    """
    Returns all albums and all gallery items including inactive ones.
    Optionally filters by item_type.
    """
    _ensure_default_album(db)

    albums_db = db.query(GalleryAlbum).filter(
        GalleryAlbum.deleted_at.is_(None)
    ).order_by(GalleryAlbum.sort_order.asc()).all()

    query = db.query(GalleryItem).filter(
        GalleryItem.deleted_at.is_(None)
    )

    if item_type and item_type != "all":
        query = query.filter(GalleryItem.item_type == item_type)

    items_db = query.order_by(GalleryItem.sort_order.asc(), GalleryItem.created_at.desc()).all()

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
        uploaded_url = smart_upload(cover_image, folder="booknest/gallery_covers", resource_type="image")
        if uploaded_url:
            cover_url = uploaded_url
        else:
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
    show_on_home: bool = Form(True),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Upload multiple photos at once and insert records into DB.
    Uses smart_upload (Cloudinary/R2) with local fallback.
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

        img_url = smart_upload(f, folder="booknest/gallery", resource_type="image")
        if not img_url:
            file_name = f"gallery_{uuid.uuid4().hex[:10]}{ext}"
            dest_path = UPLOAD_DIR / file_name
            with dest_path.open("wb") as buffer:
                shutil.copyfileobj(f.file, buffer)
            img_url = f"/static/gallery_uploads/{file_name}"

        raw_name = Path(f.filename).stem.replace("_", " ").replace("-", " ")
        cleaned_title = " ".join(word.capitalize() for word in raw_name.split()) or "Gallery Photo"

        new_item = GalleryItem(
            id=f"photo_{uuid.uuid4().hex[:8]}",
            album_id=album_id.strip() or "general",
            image_url=img_url,
            video_url="",
            title_en=cleaned_title,
            title_ur=cleaned_title,
            title_ar=cleaned_title,
            caption_en="",
            caption_ur="",
            caption_ar="",
            year=year.strip() or "2026",
            sort_order=current_max_sort + idx + 1,
            is_active=True,
            show_on_home=show_on_home,
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


@router.post("/add-video")
def add_gallery_video(
    video_url: str = Form(...),
    title_en: str = Form(""),
    title_ur: str = Form(""),
    title_ar: str = Form(""),
    caption_en: str = Form(""),
    caption_ur: str = Form(""),
    caption_ar: str = Form(""),
    album_id: str = Form("general"),
    year: str = Form("2026"),
    show_on_home: bool = Form(False),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Directly add a YouTube video by URL without uploading files.
    Auto extracts YouTube ID, embed link, and thumbnail image.
    """
    _ensure_default_album(db)
    vid_id, embed_url, thumb_url = _extract_youtube_info(video_url)
    if not embed_url:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL provided")

    # Ensure target album exists; if not, fallback to default general album
    target_album_id = (album_id or "").strip() or "general"
    album_obj = db.query(GalleryAlbum).filter(
        GalleryAlbum.id == target_album_id,
        GalleryAlbum.deleted_at.is_(None)
    ).first()
    if not album_obj:
        default_album = _ensure_default_album(db)
        target_album_id = default_album.id

    title = (title_en or "").strip() or (f"Video {vid_id}" if vid_id else "YouTube Video")
    ur_title = (title_ur or "").strip() or title
    ar_title = (title_ar or "").strip() or title

    # Normalize show_on_home
    is_home = True if str(show_on_home).lower() in ["true", "1", "yes"] else False

    current_max_sort = db.query(func.max(GalleryItem.sort_order)).filter(GalleryItem.deleted_at.is_(None)).scalar() or 0

    new_item = GalleryItem(
        id=f"video_{uuid.uuid4().hex[:8]}",
        album_id=target_album_id,
        image_url=thumb_url or "",
        video_url=embed_url,
        item_type="video",
        event_date="",
        title_en=title,
        title_ur=ur_title,
        title_ar=ar_title,
        caption_en=(caption_en or "").strip(),
        caption_ur=(caption_ur or "").strip(),
        caption_ar=(caption_ar or "").strip(),
        year=(year or "2026").strip() or "2026",
        sort_order=current_max_sort + 1,
        is_active=True,
        show_on_home=is_home,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"message": "Video added successfully", "item": new_item.to_dict()}


@router.post("/upload-dated")
def upload_dated_item(
    file: UploadFile = File(...),
    item_type: str = Form("jumah"), # 'jumah' or 'moon'
    event_date: str = Form(""),      # e.g. '2026-09-25'
    hijri_month: Optional[str] = Form(None), # e.g. 'rabi_al_awwal'
    title_en: str = Form(""),
    title_ur: str = Form(""),
    title_ar: str = Form(""),
    caption_en: str = Form(""),
    caption_ur: str = Form(""),
    caption_ar: str = Form(""),
    album_id: str = Form("general"),
    year: str = Form("2026"),
    show_on_home: bool = Form(False),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Upload a dated poster image for Jumah Schedule or Moon Date announcement.
    """
    _ensure_default_album(db)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    ext = Path(file.filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Invalid image file format")

    safe_type = item_type.strip().lower()
    if safe_type not in ["jumah", "moon", "calendar"]:
        safe_type = "jumah"

    folder_target = f"booknest/gallery/{safe_type}"
    img_url = smart_upload(file, folder=folder_target, resource_type="image")
    if not img_url:
        file_name = f"{safe_type}_{uuid.uuid4().hex[:10]}{ext}"
        dest_path = UPLOAD_DIR / file_name
        with dest_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        img_url = f"/static/gallery_uploads/{file_name}"

    current_max_sort = db.query(func.max(GalleryItem.sort_order)).filter(GalleryItem.deleted_at.is_(None)).scalar() or 0

    if safe_type == "calendar":
        default_title = f"Islamic Calendar ({hijri_month or 'Month'} {year or '1448'})"
    elif safe_type == "jumah":
        default_title = "Jumah Schedule"
    else:
        default_title = "Moon Date Announcement"

    if event_date.strip():
        default_title += f" ({event_date.strip()})"
    final_title = title_en.strip() or default_title

    calculated_year = year.strip()
    if safe_type == "jumah" and event_date.strip():
        m_yr = re.search(r'\b(20\d{2})\b', event_date.strip())
        if m_yr:
            calculated_year = m_yr.group(1)
        elif not calculated_year:
            calculated_year = "2026"
    elif not calculated_year:
        calculated_year = "1448" if safe_type in ["moon", "calendar"] else "2026"

    # If this is calendar and show_on_home is set to True, unmark others so only this is active
    if safe_type == "calendar" and show_on_home:
        db.query(GalleryItem).filter(
            GalleryItem.item_type == "calendar",
            GalleryItem.deleted_at.is_(None)
        ).update({"show_on_home": False}, synchronize_session=False)

    new_item = GalleryItem(
        id=f"{safe_type}_{uuid.uuid4().hex[:8]}",
        album_id=album_id.strip() or "general",
        image_url=img_url,
        video_url="",
        item_type=safe_type,
        event_date=event_date.strip(),
        hijri_month=hijri_month.strip() if hijri_month else None,
        title_en=final_title,
        title_ur=title_ur.strip() or final_title,
        title_ar=title_ar.strip() or final_title,
        caption_en=caption_en.strip(),
        caption_ur=caption_ur.strip(),
        caption_ar=caption_ar.strip(),
        year=calculated_year,
        sort_order=current_max_sort + 1,
        is_active=True,
        show_on_home=show_on_home,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"message": f"{safe_type.capitalize()} item uploaded successfully", "item": new_item.to_dict()}


@router.put("/item/{item_id}/set-current-calendar")
def set_current_calendar(
    item_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    1-Click set a specific calendar month as currently active/live on the public site.
    Unsets show_on_home on all other calendar items.
    """
    target = db.query(GalleryItem).filter(
        GalleryItem.id == item_id,
        GalleryItem.deleted_at.is_(None)
    ).first()

    if not target:
        raise HTTPException(status_code=404, detail="Calendar item not found")

    # Set all calendar items to show_on_home = False
    db.query(GalleryItem).filter(
        GalleryItem.item_type == "calendar",
        GalleryItem.deleted_at.is_(None)
    ).update({"show_on_home": False}, synchronize_session=False)

    # Set selected item to True
    target.show_on_home = True
    target.is_active = True
    db.commit()
    db.refresh(target)

    return {
        "message": f"Calendar '{target.title_ur or target.title_en}' is now LIVE on public site",
        "current_calendar": target.to_dict()
    }


@router.put("/item/{item_id}")
def update_gallery_item(
    item_id: str,
    album_id: str = Form("general"),
    item_type: Optional[str] = Form(None),
    event_date: Optional[str] = Form(None),
    hijri_month: Optional[str] = Form(None),
    title_en: str = Form(""),
    title_ur: str = Form(""),
    title_ar: str = Form(""),
    caption_en: str = Form(""),
    caption_ur: str = Form(""),
    caption_ar: str = Form(""),
    year: str = Form("2026"),
    video_url: str = Form(""),
    is_active: bool = Form(True),
    show_on_home: bool = Form(False),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    Update trilingual metadata, album assignment, homepage feature status, event_date, or video link in DB.
    """
    item = db.query(GalleryItem).filter(
        GalleryItem.id == item_id,
        GalleryItem.deleted_at.is_(None)
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")

    item.album_id = album_id.strip() or "general"
    item.year = year.strip() or "2026"
    
    if item_type is not None and item_type.strip():
        item.item_type = item_type.strip().lower()

    if event_date is not None:
        item.event_date = event_date.strip()

    if hijri_month is not None:
        item.hijri_month = hijri_month.strip()

    if video_url.strip():
        vid_id, embed_url, thumb_url = _extract_youtube_info(video_url.strip())
        item.video_url = embed_url or video_url.strip()
        if not item.image_url and thumb_url:
            item.image_url = thumb_url
        if item.item_type == "photo":
            item.item_type = "video"
    else:
        item.video_url = ""

    item.is_active = is_active
    item.show_on_home = show_on_home
    item.title_en = title_en.strip() or item.title_en
    item.title_ur = title_ur.strip() or title_en.strip() or item.title_ur
    item.title_ar = title_ar.strip() or title_en.strip() or item.title_ar
    item.caption_en = caption_en.strip()
    item.caption_ur = caption_ur.strip()
    item.caption_ar = caption_ar.strip()

    db.commit()
    db.refresh(item)
    return {"message": "Item updated successfully", "item": item.to_dict()}


@router.put("/item/{item_id}/toggle-home")
def toggle_item_home(
    item_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """
    1-Click toggle for Show on Home Page status.
    """
    item = db.query(GalleryItem).filter(
        GalleryItem.id == item_id,
        GalleryItem.deleted_at.is_(None)
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")

    item.show_on_home = not bool(item.show_on_home)
    db.commit()
    db.refresh(item)
    return {
        "message": f"Photo {'featured on Homepage' if item.show_on_home else 'removed from Homepage'}",
        "show_on_home": item.show_on_home,
        "item": item.to_dict()
    }


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
