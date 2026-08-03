import copy
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import user_model

router = APIRouter()

SETTINGS_FILE = Path(__file__).resolve().parent.parent / "static" / "about_settings.json"


def get_default_about_settings():
    return {
        "hero": {
            "enabled": True,
            "title": "About the Markaz Library",
            "subtitle": "A trusted place for learning, reflection, and community growth",
            "description": "A central place for books, knowledge-sharing, and the scholarly vision of the Markaz.",
            "cta_label": "Explore the collection",
            "cta_url": "/books",
            "image_url": "",
        },
        "intro": {
            "enabled": True,
            "title": "Introduction",
            "description": "The library supports readers with curated books, trusted references, and a calm learning environment.",
            "paragraphs": [
                "Markaz Library is built to connect readers with authentic knowledge, study resources, and a welcoming atmosphere.",
                "Visitors can explore books, updates, and community reflections shaped by the educational vision of the Markaz.",
            ],
        },
        "ulma_quotes": [
            {
                "name": "",
                "designation": "",
                "quote": "",
                "source_text": "",
                "source_url": "",
                "image_url": "",
            }
        ],
        "gallery": [
            {
                "title": "",
                "caption": "",
                "image_url": "",
            }
        ],
        "display": {
            "gallery_preview_count": 4,
            "ulma_preview_count": 4,
        },
    }


def _load_settings_from_disk():
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not SETTINGS_FILE.exists():
        defaults = get_default_about_settings()
        _write_settings_to_disk(defaults)
        return defaults

    try:
        with SETTINGS_FILE.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (json.JSONDecodeError, OSError):
        return get_default_about_settings()


def _write_settings_to_disk(payload):
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with SETTINGS_FILE.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def _merge_about_settings(payload: dict):
    merged = copy.deepcopy(get_default_about_settings())
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    for key, value in payload.items():
        if key in {"hero", "intro", "display"} and isinstance(value, dict):
            merged[key] = {**merged.get(key, {}), **value}
        elif key in {"ulma_quotes", "gallery"} and isinstance(value, list):
            merged[key] = value
        else:
            merged[key] = value

    return merged


@router.get("/about-settings", tags=["About Settings"])
def get_about_settings(db: Session = Depends(get_db)):
    return _load_settings_from_disk()


@router.put("/about-settings", tags=["About Settings"])
def update_about_settings(payload: dict, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    role_name = (current_user.role.name if current_user.role and getattr(current_user.role, "name", None) else "")
    is_admin = isinstance(role_name, str) and role_name.lower() in ["admin", "superadmin", "administrator"]

    user_perms = set()
    if current_user.role and getattr(current_user.role, "permissions", None):
        for perm in current_user.role.permissions:
            if hasattr(perm, "code") and perm.code:
                user_perms.add(perm.code)
            elif hasattr(perm, "name") and perm.name:
                user_perms.add(perm.name)

    allowed_perms = {
        "HOMEPAGE_BRANDING_MANAGE",
        "HOMEPAGE_CONTENT_MANAGE",
        "HOMEPAGE_LAYOUT_MANAGE",
        "BOOK_MANAGE",
    }

    if not is_admin and not (user_perms & allowed_perms):
        raise HTTPException(status_code=403, detail="You do not have permission to manage about settings")

    merged = _merge_about_settings(payload)
    _write_settings_to_disk(merged)
    return {"message": "About settings updated", "settings": merged}