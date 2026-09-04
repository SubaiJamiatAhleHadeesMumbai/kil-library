import copy
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import user_model

router = APIRouter()

SETTINGS_FILE = Path(__file__).resolve().parent.parent / "static" / "homepage_settings.json"


def get_default_homepage_settings():
    return {
        "theme": "aurora",
        "theme_palette": "indigo",
        "accent_color": "#007ACC",  # Updated accent color
        "heading_style": "serif",
        "background_style": "aurora",
        "button_style": "solid",
        "spacing_scale": "comfortable",
        "ui_feel": "premium",
        "language": "en",
        "hero_badge": "Adaptive Knowledge Grid",
        "site_title": "Markaz Library",
        "site_subtitle": "Ahle Hadees Kokan",
        "show_site_subtitle": True,
        "site_logo_url": "/static/images/MarkazLogo.png",
        "sections": {
            "hero": {
                "enabled": True,
                "order": 0,
                "badge": "MARKAZ AHLE HADEES KOKAN",
                "show_badge": True,
                "ayah_arabic": "يَا أَيُّهَا الَّذِينَ آمَنُوا أَطِيعُوا اللَّهَ وَأَطِيعُوا الرَّسُولَ",
                "ayah_translation": "",
                "show_ayah": True,
                "title": "Kokan Islamic Library",
                "description": "Explore curated Islamic knowledge with a calm, modern reading experience.",
                "banner_image_url": "",
                "banner_overlay_opacity": 70,
                "show_stars": True,
            },
            "posters": {
                "enabled": True,
                "order": 1,
                "title": "Media Posters",
                "subtitle": "Rotating shareable posters",
                "description": "Admin-uploaded poster carousel",
            },
            "search": {
                "enabled": True,
                "order": 2,
                "title": "Library Search",
                "subtitle": "Find books, authors, and collections",
                "description": "Search, filters, and discovery tools",
            },
            "featured": {
                "enabled": True,
                "order": 3,
                "title": "Library Highlights",
                "subtitle": "Recommended by the library team",
                "description": "Curated recommended titles",
            },
            "gallery": {
                "enabled": True,
                "order": 4,
                "title": "Gallery",
                "subtitle": "Markaz introduction gallery",
                "description": "Public about gallery visibility",
            },
            "fatawa": {
                "enabled": True,
                "order": 5,
                "title": "Fatawa Q&A",
                "subtitle": "Guidance and answers",
                "description": "Public fatawa page link visibility",
            },
            "about": {
                "enabled": True,
                "order": 6,
                "title": "About Page",
                "subtitle": "Library identity and story",
                "description": "Public about page link visibility",
            },
            "education_social_activity": {
                "enabled": True,
                "order": 7,
                "title": "Education, Social & Activity",
                "subtitle": "Community learning, service, and engagement",
                "description": "Community education and social service section visibility",
            },
            "catalog": {
                "enabled": True,
                "order": 8,
                "title": "Explore the Library",
                "subtitle": "Browse the full collection",
                "description": "Main book browsing grid",
            },
            "posts": {
                "enabled": True,
                "order": 9,
                "title": "Latest Announcements",
                "subtitle": "News and updates",
                "description": "News and latest updates",
            },
            "donation": {
                "enabled": True,
                "order": 10,
                "title": "Support the Library",
                "subtitle": "Help the library grow",
                "description": "Support and donation block",
            },
        },
        "layout": {
            "show_stats": True,
            "show_trending": True,
            "show_favorites": True,
            "show_search_strip": True,
            "show_featured_books": True,
            "show_donation_panel": True,
            "show_posters": True,
        },
        "paid_downloads": {
            "global_enabled": False,
            "default_price": 49.0,
            "upi_id": "kokanislamiclibrary@upi",
            "instructions": "Scan QR code or use UPI ID to pay. Enter UTR reference to verify and download.",
            "qr_image_url": "",
        },
        "deep_search": {
            "enabled": True,
            "enable_cloud_caching": True,
            "enable_aerab_normalization": True,
            "enable_boolean_operators": True,
            "enable_scope_filters": True,
            "enable_citation_tool": True,
            "enable_research_export": True,
            "max_snippets_per_book": 5,
            "snippet_context_chars": 80
        },
        "ui_settings": {
            "primary_color": "#002147",
            "primary_hover": "#003166",
            "primary_light": "#EEF4FF",
            "secondary_color": "#064e3b",
            "accent_color": "#2D89C8",
            "border_radius": "rounded",
            "spacing_density": "comfortable",
            "font_scale": "normal",
            "arabic_font": "Noto Naskh Arabic",
            "urdu_font": "Jameel Noori Nastaleeq",
            "default_language": "en",
            "enabled_languages": ["en", "ur", "ar"],
            "theme_mode": "light",
            "allow_user_theme_override": False,
            "site_title": "Kokan Islamic Library",
            "site_subtitle": "Markaz Ahle Hadees Kokan",
            "logo_url": "/static/images/MarkazLogo.png",
            "favicon_url": "/favicon.ico",
        },
    }


def _load_settings_from_disk():
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not SETTINGS_FILE.exists():
        _write_settings_to_disk(get_default_homepage_settings())
        return get_default_homepage_settings()

    try:
        with SETTINGS_FILE.open("r", encoding="utf-8") as handle:
            saved_settings = json.load(handle)
            # Always merge with defaults to ensure new sections are included
            return _merge_settings(saved_settings)
    except (json.JSONDecodeError, OSError):
        return get_default_homepage_settings()


def _write_settings_to_disk(payload):
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with SETTINGS_FILE.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def _merge_settings(payload: dict):
    merged = copy.deepcopy(get_default_homepage_settings())
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    for key, value in payload.items():
        if key == "sections" and isinstance(value, dict):
            merged_sections = copy.deepcopy(merged.get("sections", {}))
            for section_key, section_value in value.items():
                if isinstance(section_value, dict):
                    merged_sections[section_key] = {**merged_sections.get(section_key, {}), **section_value}
                else:
                    merged_sections[section_key] = section_value
            merged["sections"] = merged_sections
        elif key == "layout" and isinstance(value, dict):
            merged_layout = copy.deepcopy(merged.get("layout", {}))
            merged_layout.update(value)
            merged["layout"] = merged_layout
        elif key == "paid_downloads" and isinstance(value, dict):
            merged_downloads = copy.deepcopy(merged.get("paid_downloads", {}))
            merged_downloads.update(value)
            merged["paid_downloads"] = merged_downloads
        elif key == "ui_settings" and isinstance(value, dict):
            merged_ui = copy.deepcopy(merged.get("ui_settings", {}))
            merged_ui.update(value)
            merged["ui_settings"] = merged_ui
        else:
            merged[key] = value

    return merged


@router.get("/homepage-settings", tags=["Homepage Settings"])
def get_homepage_settings(db: Session = Depends(get_db)):
    return _load_settings_from_disk()


@router.put("/homepage-settings", tags=["Homepage Settings"])
def update_homepage_settings(payload: dict, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    role_name = (current_user.role.name if current_user.role and getattr(current_user.role, 'name', None) else '')
    is_admin = isinstance(role_name, str) and role_name.lower() in ['admin', 'superadmin', 'administrator']

    user_perms = set()
    if current_user.role and getattr(current_user.role, 'permissions', None):
        for p in current_user.role.permissions:
            if hasattr(p, 'code') and p.code:
                user_perms.add(p.code)
            elif hasattr(p, 'name') and p.name:
                user_perms.add(p.name)

    homepage_manage_perms = {
        'HOMEPAGE_BRANDING_MANAGE',
        'HOMEPAGE_CONTENT_MANAGE',
        'HOMEPAGE_LAYOUT_MANAGE',
        'HOMEPAGE_VISIBILITY_MANAGE',
        'HOMEPAGE_SEARCH_MANAGE',
        'HOMEPAGE_THEME_MANAGE',
        'BOOK_MANAGE',
    }

    if not is_admin and not (user_perms & homepage_manage_perms):
        raise HTTPException(status_code=403, detail="You do not have permission to manage homepage settings")

    # If payload attempts to modify search-specific settings, ensure user has HOMEPAGE_SEARCH_MANAGE
    try:
        sections = payload.get('sections', {}) if isinstance(payload, dict) else {}
    except Exception:
        sections = {}

    if isinstance(sections, dict) and 'search' in sections:
        # Check if current_user effectively has the HOMEPAGE_SEARCH_MANAGE permission
        if not is_admin:
            if 'HOMEPAGE_SEARCH_MANAGE' not in user_perms:
                raise HTTPException(status_code=403, detail="You do not have permission: HOMEPAGE_SEARCH_MANAGE")

    merged = _merge_settings(payload)
    _write_settings_to_disk(merged)
    return {"message": "Homepage settings updated", "settings": merged}


@router.get("/deep-search")
def get_deep_search_settings():
    """Returns deep search configuration."""
    settings = _load_settings_from_disk()
    default_ds = get_default_homepage_settings()["deep_search"]
    current_ds = settings.get("deep_search", {})
    # Merge defaults so any newly added keys exist
    merged = {**default_ds, **current_ds}
    return merged


@router.put("/deep-search")
def update_deep_search_settings(
    payload: dict,
    current_user: user_model.User = Depends(get_current_user)
):
    """Admin Only: Updates deep search configuration."""
    role_name = (current_user.role.name if hasattr(current_user, 'role') and current_user.role else str(getattr(current_user, 'role', ''))).lower()
    is_admin = role_name in ["admin", "superadmin", "administrator"]
    
    perms = set()
    if hasattr(current_user, 'permissions') and current_user.permissions:
        for p in current_user.permissions:
            if hasattr(p, 'code') and p.code:
                perms.add(p.code)
            elif hasattr(p, 'name') and p.name:
                perms.add(p.name)

    if not is_admin and not (perms & {'HOMEPAGE_LAYOUT_MANAGE', 'BOOK_MANAGE', 'HOMEPAGE_SEARCH_MANAGE', 'ADMIN_ACCESS'}):
        raise HTTPException(status_code=403, detail="Permission denied to update Deep Search settings.")

    settings = _load_settings_from_disk()
    default_ds = get_default_homepage_settings()["deep_search"]
    current_ds = settings.get("deep_search", default_ds)
    current_ds.update(payload)
    settings["deep_search"] = current_ds
    _write_settings_to_disk(settings)
    return {"message": "Deep Search settings updated successfully", "deep_search": current_ds}


@router.get("/ui-config")
def get_ui_settings():
    """Returns global UI/UX design token and theme settings."""
    settings = _load_settings_from_disk()
    default_ui = get_default_homepage_settings()["ui_settings"]
    current_ui = settings.get("ui_settings", {})
    return {**default_ui, **current_ui}


@router.put("/ui-config")
def update_ui_settings(
    payload: dict,
    current_user: user_model.User = Depends(get_current_user)
):
    """Admin Only: Updates global UI/UX design tokens and theme settings."""
    role_name = (current_user.role.name if hasattr(current_user, 'role') and current_user.role else str(getattr(current_user, 'role', ''))).lower()
    is_admin = role_name in ["admin", "superadmin", "administrator"]
    
    perms = set()
    if hasattr(current_user, 'permissions') and current_user.permissions:
        for p in current_user.permissions:
            if hasattr(p, 'code') and p.code:
                perms.add(p.code)
            elif hasattr(p, 'name') and p.name:
                perms.add(p.name)

    if not is_admin and not (perms & {'HOMEPAGE_BRANDING_MANAGE', 'HOMEPAGE_THEME_MANAGE', 'BOOK_MANAGE', 'ADMIN_ACCESS'}):
        raise HTTPException(status_code=403, detail="Permission denied to update UI/UX settings.")

    settings = _load_settings_from_disk()
    default_ui = get_default_homepage_settings()["ui_settings"]
    current_ui = settings.get("ui_settings", default_ui)
    current_ui.update(payload)
    settings["ui_settings"] = current_ui
    _write_settings_to_disk(settings)
    return {"message": "UI/UX settings updated successfully", "ui_settings": current_ui}
