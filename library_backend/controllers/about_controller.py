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
        "title": "مرکز الدعوۃ الاسلامیۃ والخیریہ (سونس، کھیڈ - رتناگری)",
        "subtitle": "شعبے • سرگرمیاں • کارکردگی • مستقبل کے عزائم",
        "content_html": "",
        "languages": {
            "ur": {
                "title": "مرکز الدعوۃ الاسلامیۃ والخیریہ (سونس، کھیڈ - رتناگری)",
                "subtitle": "شعبے • سرگرمیاں • کارکردگی • مستقبل کے عزائم",
                "content_html": "",
            },
            "en": {
                "title": "Markaz Dawah Al-Islamiyyah wal-Khayriyyah",
                "subtitle": "Departments • Activities • Achievements • Future Goals",
                "content_html": "",
            },
            "ar": {
                "title": "مركز الدعوة الإسلامية والخيرية",
                "subtitle": "الأقسام • الأنشطة • الإنجازات • المشاريع المستقبلية",
                "content_html": "",
            },
        },
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
            data = json.load(handle)
            if not isinstance(data, dict):
                return get_default_about_settings()
            if "title" not in data and "hero" in data:
                data["title"] = data["hero"].get("title", "")
            if "subtitle" not in data and "hero" in data:
                data["subtitle"] = data["hero"].get("subtitle", "")
            if "content_html" not in data:
                data["content_html"] = ""

            if "languages" not in data or not isinstance(data["languages"], dict):
                data["languages"] = {
                    "ur": {
                        "title": data.get("title", "مرکز الدعوۃ الاسلامیۃ والخیریہ (سونس، کھیڈ - رتناگری)"),
                        "subtitle": data.get("subtitle", "شعبے • سرگرمیاں • کارکردگی • مستقبل کے عزائم"),
                        "content_html": data.get("content_html", ""),
                    },
                    "en": {
                        "title": "Markaz Dawah Al-Islamiyyah wal-Khayriyyah",
                        "subtitle": "Departments • Activities • Achievements • Future Goals",
                        "content_html": "",
                    },
                    "ar": {
                        "title": "مركز الدعوة الإسلامية والخيرية",
                        "subtitle": "الأقسام • الأنشطة • الإنجازات • المشاريع المستقبلية",
                        "content_html": "",
                    },
                }
            else:
                for lang in ["ur", "en", "ar"]:
                    if lang not in data["languages"] or not isinstance(data["languages"][lang], dict):
                        data["languages"][lang] = {"title": "", "subtitle": "", "content_html": ""}
                if not data["languages"]["ur"].get("title") and data.get("title"):
                    data["languages"]["ur"]["title"] = data["title"]
                if not data["languages"]["ur"].get("subtitle") and data.get("subtitle"):
                    data["languages"]["ur"]["subtitle"] = data["subtitle"]
                if not data["languages"]["ur"].get("content_html") and data.get("content_html"):
                    data["languages"]["ur"]["content_html"] = data["content_html"]

            return data
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
        elif key == "languages" and isinstance(value, dict):
            merged_langs = merged.get("languages", {})
            for l_code, l_val in value.items():
                if isinstance(l_val, dict):
                    merged_langs[l_code] = {**merged_langs.get(l_code, {}), **l_val}
            merged["languages"] = merged_langs
            if "ur" in merged_langs and isinstance(merged_langs["ur"], dict):
                if merged_langs["ur"].get("title"):
                    merged["title"] = merged_langs["ur"]["title"]
                if merged_langs["ur"].get("subtitle"):
                    merged["subtitle"] = merged_langs["ur"]["subtitle"]
                if merged_langs["ur"].get("content_html"):
                    merged["content_html"] = merged_langs["ur"]["content_html"]
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