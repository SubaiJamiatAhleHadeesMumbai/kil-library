import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import poster_model, user_model
from schemas.poster_schema import PosterResponse
from utils.storage_helper import smart_upload

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ADMIN_PERMISSIONS = {"HOMEPAGE_CONTENT_MANAGE", "HOMEPAGE_LAYOUT_MANAGE"}


def _author_name(poster_obj) -> str:
    try:
        if poster_obj.author:
            if getattr(poster_obj.author, "full_name", None):
                return poster_obj.author.full_name
            if getattr(poster_obj.author, "username", None):
                return poster_obj.author.username
            if getattr(poster_obj.author, "email", None):
                return poster_obj.author.email
    except Exception:
        pass
    return "Markaz Admin"


def _to_response(poster_obj) -> PosterResponse:
    data = PosterResponse.model_validate(poster_obj)
    data.author_name = _author_name(poster_obj)
    return data


def _is_admin(user: user_model.User) -> bool:
    role_name = (user.role.name if user.role and getattr(user.role, "name", None) else "")
    if isinstance(role_name, str) and role_name.lower() in ["admin", "superadmin", "administrator"]:
        return True

    permissions = set()
    if user.role and getattr(user.role, "permissions", None):
        for perm in user.role.permissions:
            if getattr(perm, "code", None):
                permissions.add(perm.code)
            elif getattr(perm, "name", None):
                permissions.add(perm.name)

    return bool(permissions & ADMIN_PERMISSIONS)


def _parse_translations(raw_value: Optional[str], title: str) -> Dict[str, Dict[str, Any]]:
    default_translation = {
        "en": {
            "title": title,
            "program_name": "",
            "event_date": "",
            "location_name": "",
            "location_url": "",
            "description": "",
        }
    }

    if not raw_value:
        return default_translation

    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="translations must be valid JSON")

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=400, detail="translations must be an object")

    normalized: Dict[str, Dict[str, Any]] = {}
    for language, payload in parsed.items():
        if not isinstance(payload, dict):
            continue
        normalized[str(language)] = {
            "title": (payload.get("title") or "").strip(),
            "program_name": (payload.get("program_name") or "").strip(),
            "event_date": (payload.get("event_date") or "").strip(),
            "location_name": (payload.get("location_name") or "").strip(),
            "location_url": (payload.get("location_url") or "").strip(),
            "description": (payload.get("description") or "").strip(),
        }

    if not normalized:
        return default_translation

    return normalized


def _upload_if_present(file_obj: Optional[UploadFile], folder: str) -> Optional[str]:
    if not file_obj or not file_obj.filename:
        return None

    if file_obj.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG/PNG/WebP images are allowed.")

    url = smart_upload(file_obj, folder=folder, resource_type="image")
    if not url:
        raise HTTPException(status_code=500, detail="Image upload failed")
    return url


@router.get("/public", response_model=List[PosterResponse])
def get_public_posters(db: Session = Depends(get_db)):
    posters = (
        db.query(poster_model.HomepagePoster)
        .filter(poster_model.HomepagePoster.is_active.is_(True))
        .order_by(poster_model.HomepagePoster.sort_order.asc(), poster_model.HomepagePoster.created_at.desc())
        .all()
    )
    return [_to_response(poster) for poster in posters]


@router.get("/", response_model=List[PosterResponse])
def get_all_posters(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to manage posters")

    posters = (
        db.query(poster_model.HomepagePoster)
        .order_by(poster_model.HomepagePoster.sort_order.asc(), poster_model.HomepagePoster.created_at.desc())
        .all()
    )
    return [_to_response(poster) for poster in posters]


@router.get("/{poster_id}", response_model=PosterResponse)
def get_poster(
    poster_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to manage posters")

    poster = db.query(poster_model.HomepagePoster).filter(poster_model.HomepagePoster.id == poster_id).first()
    if not poster:
        raise HTTPException(status_code=404, detail="Poster not found")
    return _to_response(poster)


@router.post("/", response_model=PosterResponse)
def create_poster(
    title: str = Form(...),
    translations: Optional[str] = Form(None),
    program_name: Optional[str] = Form(None),
    event_date: Optional[str] = Form(None),
    location_name: Optional[str] = Form(None),
    location_url: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    media_type: str = Form("image"),
    desktop_image_size: Optional[str] = Form(None),
    mobile_image_size: Optional[str] = Form(None),
    desktop_frame_width: int = Form(1200),
    mobile_frame_width: int = Form(1080),
    desktop_fit: Optional[str] = Form("cover"),
    mobile_fit: Optional[str] = Form("cover"),
    desktop_height: int = Form(520),
    mobile_height: int = Form(380),
    caption_alignment: Optional[str] = Form("bottom"),
    sort_order: int = Form(0),
    is_active: bool = Form(True),
    desktop_image: Optional[UploadFile] = File(None),
    mobile_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to manage posters")

    clean_title = title.strip()
    if not clean_title:
        raise HTTPException(status_code=400, detail="Title is required")

    normalized_media_type = (media_type or "image").strip().lower()
    if normalized_media_type not in {"image", "text"}:
        raise HTTPException(status_code=400, detail="media_type must be image or text")

    normalized_desktop_fit = (desktop_fit or "cover").strip().lower()
    normalized_mobile_fit = (mobile_fit or "cover").strip().lower()
    normalized_caption_alignment = (caption_alignment or "bottom").strip().lower()

    if normalized_desktop_fit not in {"cover", "contain", "fill"}:
        raise HTTPException(status_code=400, detail="desktop_fit must be cover, contain, or fill")
    if normalized_mobile_fit not in {"cover", "contain", "fill"}:
        raise HTTPException(status_code=400, detail="mobile_fit must be cover, contain, or fill")
    if normalized_caption_alignment not in {"top", "center", "bottom"}:
        raise HTTPException(status_code=400, detail="caption_alignment must be top, center, or bottom")

    poster = poster_model.HomepagePoster(
        title=clean_title,
        translations=_parse_translations(translations, clean_title),
        media_type=normalized_media_type,
        program_name=(program_name or "").strip() or None,
        event_date=(event_date or "").strip() or None,
        location_name=(location_name or "").strip() or None,
        location_url=(location_url or "").strip() or None,
        description=(description or "").strip() or None,
        desktop_image_size=(desktop_image_size or "").strip() or None,
        mobile_image_size=(mobile_image_size or "").strip() or None,
        desktop_frame_width=desktop_frame_width,
        mobile_frame_width=mobile_frame_width,
        desktop_fit=normalized_desktop_fit,
        mobile_fit=normalized_mobile_fit,
        desktop_height=desktop_height,
        mobile_height=mobile_height,
        caption_alignment=normalized_caption_alignment,
        sort_order=sort_order,
        is_active=is_active,
        author_id=current_user.id,
    )

    poster.desktop_image_url = _upload_if_present(desktop_image, folder="homepage_posters")
    poster.mobile_image_url = _upload_if_present(mobile_image, folder="homepage_posters")

    db.add(poster)
    db.commit()
    db.refresh(poster)
    return _to_response(poster)


@router.put("/{poster_id}", response_model=PosterResponse)
def update_poster(
    poster_id: int,
    title: str = Form(...),
    translations: Optional[str] = Form(None),
    program_name: Optional[str] = Form(None),
    event_date: Optional[str] = Form(None),
    location_name: Optional[str] = Form(None),
    location_url: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    media_type: str = Form("image"),
    desktop_image_size: Optional[str] = Form(None),
    mobile_image_size: Optional[str] = Form(None),
    desktop_frame_width: int = Form(1200),
    mobile_frame_width: int = Form(1080),
    desktop_fit: Optional[str] = Form("cover"),
    mobile_fit: Optional[str] = Form("cover"),
    desktop_height: int = Form(520),
    mobile_height: int = Form(380),
    caption_alignment: Optional[str] = Form("bottom"),
    sort_order: int = Form(0),
    is_active: bool = Form(True),
    desktop_image: Optional[UploadFile] = File(None),
    mobile_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to manage posters")

    poster = db.query(poster_model.HomepagePoster).filter(poster_model.HomepagePoster.id == poster_id).first()
    if not poster:
        raise HTTPException(status_code=404, detail="Poster not found")

    clean_title = title.strip()
    if not clean_title:
        raise HTTPException(status_code=400, detail="Title is required")

    normalized_media_type = (media_type or "image").strip().lower()
    if normalized_media_type not in {"image", "text"}:
        raise HTTPException(status_code=400, detail="media_type must be image or text")

    normalized_desktop_fit = (desktop_fit or "cover").strip().lower()
    normalized_mobile_fit = (mobile_fit or "cover").strip().lower()
    normalized_caption_alignment = (caption_alignment or "bottom").strip().lower()

    if normalized_desktop_fit not in {"cover", "contain", "fill"}:
        raise HTTPException(status_code=400, detail="desktop_fit must be cover, contain, or fill")
    if normalized_mobile_fit not in {"cover", "contain", "fill"}:
        raise HTTPException(status_code=400, detail="mobile_fit must be cover, contain, or fill")
    if normalized_caption_alignment not in {"top", "center", "bottom"}:
        raise HTTPException(status_code=400, detail="caption_alignment must be top, center, or bottom")

    poster.title = clean_title
    poster.translations = _parse_translations(translations, clean_title)
    poster.media_type = normalized_media_type
    poster.program_name = (program_name or "").strip() or None
    poster.event_date = (event_date or "").strip() or None
    poster.location_name = (location_name or "").strip() or None
    poster.location_url = (location_url or "").strip() or None
    poster.description = (description or "").strip() or None
    poster.desktop_image_size = (desktop_image_size or "").strip() or None
    poster.mobile_image_size = (mobile_image_size or "").strip() or None
    poster.desktop_frame_width = desktop_frame_width
    poster.mobile_frame_width = mobile_frame_width
    poster.desktop_fit = normalized_desktop_fit
    poster.mobile_fit = normalized_mobile_fit
    poster.desktop_height = desktop_height
    poster.mobile_height = mobile_height
    poster.caption_alignment = normalized_caption_alignment
    poster.sort_order = sort_order
    poster.is_active = is_active

    new_desktop_image = _upload_if_present(desktop_image, folder="homepage_posters")
    new_mobile_image = _upload_if_present(mobile_image, folder="homepage_posters")
    if new_desktop_image:
        poster.desktop_image_url = new_desktop_image
    if new_mobile_image:
        poster.mobile_image_url = new_mobile_image

    db.commit()
    db.refresh(poster)
    return _to_response(poster)


@router.delete("/{poster_id}")
def delete_poster(
    poster_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to manage posters")

    poster = db.query(poster_model.HomepagePoster).filter(poster_model.HomepagePoster.id == poster_id).first()
    if not poster:
        raise HTTPException(status_code=404, detail="Poster not found")

    db.delete(poster)
    db.commit()
    return {"message": "Poster deleted successfully"}