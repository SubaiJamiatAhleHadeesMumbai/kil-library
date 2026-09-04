import os
import re
import math
import logging
import urllib.request
from pathlib import Path
import requests
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func # ✅ func add kiya case-insensitive check ke liye

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    limiter = None

logger = logging.getLogger(__name__)

# --- Imports ---
from models import book_model, user_model, book_permission_model, request_user_model, interaction_model, language_model
from schemas import book_schema
from auth import get_current_user_optional 
from database import get_db
from utils.local_helper import resolve_upload_path

router = APIRouter()

# --- Helper: Get Book Internal ---
def get_book_by_id_internal(db: Session, book_id: int):
    return db.query(book_model.Book).options(
        joinedload(book_model.Book.subcategories).joinedload(book_model.Subcategory.category),
        joinedload(book_model.Book.language)
    ).filter(
        book_model.Book.id == book_id,
        book_model.Book.deleted_at.is_(None)
    ).first()


def _is_admin(user: Optional[user_model.User]) -> bool:
    return bool(
        user
        and hasattr(user, "role")
        and user.role
        and user.role.name
        and user.role.name.lower() in ["admin", "superadmin"]
    )


def _get_accessible_book_ids(db: Session, user: Optional[user_model.User]) -> set:
    if not user:
        return set()

    accessible_book_ids = set()

    direct_perms = db.query(book_permission_model.BookPermission).filter(
        book_permission_model.BookPermission.user_id == user.id
    ).all()
    accessible_book_ids.update([p.book_id for p in direct_perms])

    approved_reqs = db.query(request_user_model.AccessRequest).filter(
        request_user_model.AccessRequest.user_id == user.id,
        func.lower(request_user_model.AccessRequest.status) == "approved"
    ).all()
    accessible_book_ids.update([r.book_id for r in approved_reqs])

    return accessible_book_ids


def _book_to_recommendation_payload(book: book_model.Book, score: int, reasons: List[str]) -> dict:
    return {
        "score": score,
        "reasons": reasons,
        "book": {
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "isbn": book.isbn,
            "description": book.description,
            "cover_image_url": book.cover_image_url,
            "is_digital": book.is_digital,
            "is_restricted": book.is_restricted,
            "language": {
                "id": book.language.LanguageID,
                "name": book.language.Name
            } if getattr(book, "language", None) else None,
            "subcategories": [
                {
                    "id": sc.id,
                    "name": sc.name,
                    "category": {
                        "id": sc.category.id,
                        "name": sc.category.name
                    } if getattr(sc, "category", None) else None
                }
                for sc in (book.subcategories or [])
            ]
        }
    }


def normalize_book_title(title: Optional[str]) -> str:
    """Normalizes Urdu, Arabic and English book titles for accurate deduplication."""
    if not title:
        return ""
    t = str(title).strip().lower()
    # Normalize Arabic / Urdu characters
    t = t.replace('ي', 'ی').replace('ى', 'ی').replace('ك', 'ک').replace('ه', 'ہ').replace('ة', 'ہ')
    t = t.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    # Remove punctuation & symbols
    punctuations = ["؟", "?", "،", ",", "۔", ".", "-", "_", ":", "؛", ";", "!", "/", "\\", "|", "(", ")", "[", "]", "{", "}", '"', "'", "`", "~", "*", "^"]
    for p in punctuations:
        t = t.replace(p, ' ')
    # Normalize whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def deduplicate_public_books(books_list: list) -> list:
    """
    For public users, groups duplicate entries by normalized title + author
    and returns the richest/best single version (with cover image / digital assets / PDF).
    """
    seen = {}
    for book in books_list:
        norm_title = normalize_book_title(getattr(book, 'title', ''))
        if not norm_title:
            norm_title = f"book_{getattr(book, 'id', 0)}"
        norm_author = normalize_book_title(getattr(book, 'author', ''))
        key = f"{norm_title}___{norm_author}" if norm_author else norm_title
        
        score = 0
        if getattr(book, 'pdf_url', None) or getattr(book, 'txt_file_url', None) or getattr(book, 'is_digital', False):
            score += 100
        if getattr(book, 'cover_image_url', None) or getattr(book, 'cover_image', None):
            score += 50
        if getattr(book, 'description', None):
            score += 10
        if getattr(book, 'page_count', None):
            score += 5
        score += (getattr(book, 'id', 0) or 0) * 0.0001
        
        if key not in seen or score > seen[key][0]:
            seen[key] = (score, book)
            
    return [item[1] for item in seen.values()]

# ==================================
# READ OPERATIONS (Public & Admin)
# ==================================

@router.get("/smart-recommendations", tags=["Books (Read)"])
def get_smart_recommendations(
    limit: int = Query(12, ge=1, le=50),
    seed_book_id: Optional[int] = Query(None, description="Optional current/active book ID for similar recommendations"),
    db: Session = Depends(get_db),
    current_user: Optional[user_model.User] = Depends(get_current_user_optional)
):
    is_admin = _is_admin(current_user)
    accessible_book_ids = _get_accessible_book_ids(db, current_user)

    seed_book = None
    seed_subcategory_ids = set()
    seed_language_id = None
    seed_author = None

    if seed_book_id is not None:
        seed_book = db.query(book_model.Book).options(
            joinedload(book_model.Book.subcategories),
            joinedload(book_model.Book.language)
        ).filter(
            book_model.Book.id == seed_book_id,
            book_model.Book.deleted_at.is_(None)
        ).first()

        if seed_book:
            seed_subcategory_ids = {sc.id for sc in (seed_book.subcategories or [])}
            seed_language_id = seed_book.language_id
            seed_author = (seed_book.author or "").strip().lower()

    consumed_book_ids = set()
    preferred_subcategory_ids = set()
    preferred_language_ids = set()
    preferred_authors = set()

    if current_user:
        user_interactions = db.query(interaction_model.UserBookInteraction).filter(
            interaction_model.UserBookInteraction.user_id == current_user.id
        ).all()

        consumed_book_ids = {
            i.book_id for i in user_interactions
            if i.is_bookmarked or (i.last_page_read and i.last_page_read > 1)
        }

        if consumed_book_ids:
            consumed_books = db.query(book_model.Book).options(
                joinedload(book_model.Book.subcategories),
                joinedload(book_model.Book.language)
            ).filter(
                book_model.Book.id.in_(list(consumed_book_ids)),
                book_model.Book.deleted_at.is_(None)
            ).all()

            for b in consumed_books:
                preferred_subcategory_ids.update([sc.id for sc in (b.subcategories or [])])
                if b.language_id:
                    preferred_language_ids.add(b.language_id)
                if b.author:
                    preferred_authors.add(b.author.strip().lower())

    all_books = db.query(book_model.Book).options(
        joinedload(book_model.Book.subcategories).joinedload(book_model.Subcategory.category),
        joinedload(book_model.Book.language)
    ).filter(
        book_model.Book.deleted_at.is_(None)
    )

    if not is_admin:
        all_books = all_books.filter(book_model.Book.is_approved == True)

    candidate_books = all_books.all()

    if not candidate_books:
        return {
            "strategy": "empty",
            "recommendations": []
        }

    interaction_counts = db.query(
        interaction_model.UserBookInteraction.book_id,
        func.count(interaction_model.UserBookInteraction.id).label("cnt")
    ).group_by(interaction_model.UserBookInteraction.book_id).all()
    popularity_map = {book_id: cnt for book_id, cnt in interaction_counts}

    scored = []
    for book in candidate_books:
        if seed_book_id is not None and book.id == seed_book_id:
            continue
        if book.id in consumed_book_ids:
            continue

        if book.is_restricted and not is_admin and book.id not in accessible_book_ids:
            continue

        score = 0
        reasons = []

        current_subcategory_ids = {sc.id for sc in (book.subcategories or [])}
        current_author = (book.author or "").strip().lower()

        if seed_book:
            overlap_seed_subcat = current_subcategory_ids.intersection(seed_subcategory_ids)
            if overlap_seed_subcat:
                score += min(42, 14 * len(overlap_seed_subcat))
                reasons.append("Similar category to selected book")

            if seed_language_id and book.language_id == seed_language_id:
                score += 18
                reasons.append("Same language as selected book")

            if seed_author and current_author and current_author == seed_author:
                score += 16
                reasons.append("Same author as selected book")

        overlap_user_subcat = current_subcategory_ids.intersection(preferred_subcategory_ids)
        if overlap_user_subcat:
            score += min(36, 12 * len(overlap_user_subcat))
            reasons.append("Matches your reading interests")

        if book.language_id and book.language_id in preferred_language_ids:
            score += 12
            reasons.append("Matches your preferred language")

        if current_author and current_author in preferred_authors:
            score += 10
            reasons.append("From an author you read")

        popularity_score = min(20, (popularity_map.get(book.id, 0) * 2))
        if popularity_score > 0:
            score += popularity_score
            reasons.append("Popular among readers")

        if book.created_at:
            score += 4

        if not reasons:
            reasons.append("High quality catalog match")

        scored.append((score, book, reasons))

    scored.sort(key=lambda item: item[0], reverse=True)
    top_scored = scored[:limit]

    strategy = "popular"
    if current_user and (preferred_subcategory_ids or preferred_language_ids or preferred_authors):
        strategy = "personalized"
    elif seed_book:
        strategy = "seed_based"

    return {
        "strategy": strategy,
        "total_candidates": len(scored),
        "recommendations": [
            _book_to_recommendation_payload(book=b, score=s, reasons=r)
            for s, b, r in top_scored
        ]
    }

@router.get("/stats", tags=["Books (Read)"])
def get_book_stats(db: Session = Depends(get_db)):
    base_query = db.query(book_model.Book).filter(book_model.Book.deleted_at.is_(None))
    total = base_query.count()
    restricted = base_query.filter(book_model.Book.is_restricted == True).count()
    public_access = total - restricted
    digital_only = base_query.filter(book_model.Book.is_digital == True).count()
    return {
        "total": total,
        "restricted": restricted,
        "publicAccess": public_access,
        "digitalOnly": digital_only
    }

@router.get("/", response_model=Union[book_schema.PaginatedBookResponse, List[book_schema.Book]])
def read_books(
    skip: int = 0, 
    limit: int = 24,
    page: Optional[int] = None,
    paginated: bool = False,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    subcategory_id: Optional[int] = None,
    language_id: Optional[int] = None,
    language: Optional[str] = None,
    our_publications: Optional[bool] = None,
    approved_only: bool = False,
    sort_order: Optional[str] = "desc",
    distinct: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: Optional[user_model.User] = Depends(get_current_user_optional)
):
    is_paginated = paginated or (page is not None)
    active_page = max(1, page or 1)
    page_limit = max(1, min(limit or 24, 2000))
    offset = (active_page - 1) * page_limit if is_paginated else skip

    # 1. Base Query
    query = db.query(book_model.Book).options(
        joinedload(book_model.Book.subcategories).joinedload(book_model.Subcategory.category),
        joinedload(book_model.Book.language)
    ).filter(book_model.Book.deleted_at.is_(None))

    # 2. Approval filter: only admins can see unapproved books
    is_admin = bool(current_user and hasattr(current_user, 'role') and current_user.role and current_user.role.name.lower() in ['admin', 'superadmin'])
    if not is_admin or approved_only:
        query = query.filter(book_model.Book.is_approved == True)
    
    # 3. Filters
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                book_model.Book.title.ilike(search_term),
                book_model.Book.author.ilike(search_term),
                book_model.Book.isbn.ilike(search_term),
                book_model.Book.book_number.ilike(search_term),
                book_model.Book.serial_number.ilike(search_term),
                book_model.Book.publisher.ilike(search_term),
                book_model.Book.translator.ilike(search_term),
                book_model.Book.description.ilike(search_term)
            )
        )

    if category_id:
        query = query.filter(
            or_(
                book_model.Book.subcategories.any(book_model.Subcategory.category_id == category_id),
                book_model.Book.subcategories.any(book_model.Subcategory.id == category_id)
            )
        )

    if subcategory_id:
        query = query.filter(book_model.Book.subcategories.any(book_model.Subcategory.id == subcategory_id))
    
    if language_id:
        query = query.filter(book_model.Book.language_id == language_id)

    if language and language.strip().lower() != "all":
        lang_term = language.strip().lower()
        query = query.join(book_model.Book.language).filter(
            or_(
                func.lower(language_model.Language.name).ilike(f"%{lang_term}%"),
                func.lower(language_model.Language.code) == lang_term
            )
        )

    if our_publications:
        query = query.filter(
            or_(
                book_model.Book.publisher.ilike("%مرکز%"),
                book_model.Book.publisher.ilike("%مركز%"),
                book_model.Book.publisher.ilike("%markaz%"),
                book_model.Book.publisher.ilike("%dawah%"),
                book_model.Book.publisher.ilike("%دعوة%"),
                book_model.Book.publisher.ilike("%دعوۃ%")
            )
        )

    total_count = query.count()

    # 4. Sorting & Offset Fetch
    if sort_order == "asc":
        books = query.order_by(book_model.Book.id.asc()).offset(offset).limit(page_limit).all()
    else:
        books = query.order_by(book_model.Book.id.desc()).offset(offset).limit(page_limit).all()

    # 5. Access Permission Check
    accessible_book_ids = set()
    if current_user:
        direct_perms = db.query(book_permission_model.BookPermission.book_id).filter(
            book_permission_model.BookPermission.user_id == current_user.id
        ).all()
        accessible_book_ids.update([p[0] for p in direct_perms])

        try:
            approved_reqs = db.query(request_user_model.AccessRequest.book_id).filter(
                request_user_model.AccessRequest.user_id == current_user.id,
                func.lower(request_user_model.AccessRequest.status) == "approved"
            ).all()
            accessible_book_ids.update([req[0] for req in approved_reqs])
        except Exception as e:
            logger.warning(f"Error checking access requests for user {current_user.id}: {e}")

    for book in books:
        has_access = False
        if not book.is_restricted:
            has_access = True
        elif is_admin:
            has_access = True
        elif current_user and book.id in accessible_book_ids:
            has_access = True

        setattr(book, "user_has_access", has_access)

    # 6. Deduplication for non-paginated public requests
    should_deduplicate = distinct if distinct is not None else (not is_admin or approved_only)
    if should_deduplicate and not is_paginated:
        books = deduplicate_public_books(books)

    if is_paginated:
        total_pages = math.ceil(total_count / page_limit) if total_count > 0 else 1
        return {
            "items": books,
            "total": total_count,
            "page": active_page,
            "limit": page_limit,
            "total_pages": total_pages
        }

    return books


# ==================================
# 🚀 ADVANCED TRILINGUAL DEEP SEARCH ENGINE & LOCAL CACHE
# ==================================
CACHE_TEXTS_DIR = Path(__file__).resolve().parent.parent / "cache" / "texts"
CACHE_TEXTS_DIR.mkdir(parents=True, exist_ok=True)

ARABIC_URDU_DIACRITICS = re.compile(
    r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]'
)


def get_or_cache_txt_content(book_id: int, url_path: str, enable_cache: bool = True) -> Optional[str]:
    """
    Reads local TXT file or fetches remote Cloudinary file and caches it locally
    to ensure ultra-fast (0.01s) search times on subsequent queries.
    """
    if not url_path:
        return None
    
    clean_url = str(url_path).strip()
    cache_file = CACHE_TEXTS_DIR / f"book_{book_id}.txt"

    # 1. If caching is enabled and file is already cached, read from local cache
    if enable_cache and cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        except Exception as e:
            logger.warning(f"Error reading from cache for book {book_id}: {e}")

    # 2. Check if it's a local file on disk
    local_path = resolve_upload_path(clean_url) or clean_url
    if os.path.exists(local_path) and os.path.isfile(local_path):
        try:
            with open(local_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
                if enable_cache and not cache_file.exists():
                    try:
                        with open(cache_file, "w", encoding="utf-8") as cf:
                            cf.write(content)
                    except Exception:
                        pass
                return content
        except Exception as e:
            logger.warning(f"Error reading local file {local_path}: {e}")

    # 3. If it's a remote URL (Cloudinary, S3, etc.)
    if clean_url.startswith("http://") or clean_url.startswith("https://"):
        try:
            resp = requests.get(clean_url, timeout=12)
            if resp.status_code == 200:
                resp.encoding = "utf-8"
                content = resp.text
                if enable_cache:
                    try:
                        with open(cache_file, "w", encoding="utf-8") as cf:
                            cf.write(content)
                    except Exception as ce:
                        logger.warning(f"Error saving cache for book {book_id}: {ce}")
                return content
        except Exception as e:
            logger.error(f"Failed to fetch remote text file for book {book_id}: {e}")

    return None


def build_trilingual_search_regex(
    query_str: str, 
    enable_normalization: bool = True,
    context_chars: int = 80
) -> Optional[re.Pattern]:
    """
    Constructs a flexible regex pattern supporting English, Urdu, and Arabic:
    - Normalizes Harakaat / Tashkeel
    - Unifies Alif variants (ا, أ, إ, آ, ٱ)
    - Unifies Yeh variants (ی, ي, ى, ے, ئ)
    - Unifies Kaf variants (ک, ك)
    - Unifies Heh variants (ہ, ه, ۂ, ۃ, ة)
    - Handles whitespace flexibility
    """
    clean_q = query_str.strip()
    if not clean_q:
        return None

    if not enable_normalization:
        safe_q = re.escape(clean_q)
        return re.compile(f'(.{{0,{context_chars}}})({safe_q})(.{{0,{context_chars}}})', re.IGNORECASE)

    # Strip diacritics from incoming query
    q_stripped = ARABIC_URDU_DIACRITICS.sub('', clean_q)
    
    char_patterns = []
    for char in q_stripped:
        if char in 'اأإآٱ':
            char_patterns.append(r'[اأإآٱ]')
        elif char in 'يىےئی':
            char_patterns.append(r'[يىےئی]')
        elif char in 'کك':
            char_patterns.append(r'[کك]')
        elif char in 'ہھۂۃةه':
            char_patterns.append(r'[ہھۂۃةه]')
        elif char in 'وؤ':
            char_patterns.append(r'[وؤ]')
        elif char.isalnum():
            char_patterns.append(re.escape(char))
        elif char.isspace():
            char_patterns.append(r'\s+')
        else:
            char_patterns.append(re.escape(char))

    diacritics_sub = r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]*'
    pattern_body = diacritics_sub.join(char_patterns)
    
    try:
        return re.compile(f'(.{{0,{context_chars}}})({pattern_body})(.{{0,{context_chars}}})', re.IGNORECASE)
    except Exception as e:
        logger.warning(f"Regex build error: {e}")
        safe_fallback = re.escape(clean_q)
        return re.compile(f'(.{{0,{context_chars}}})({safe_fallback})(.{{0,{context_chars}}})', re.IGNORECASE)


@router.get("/deep-search", tags=["Global Search"])
@limiter.limit("10/minute") if limiter else lambda f: f
def deep_search_all_books(
    request: Request,
    query: str = Query(..., min_length=1, description="Search keyword"),
    category_id: Optional[int] = Query(None, description="Optional category filter"),
    book_id: Optional[int] = Query(None, description="Optional single book filter"),
    author: Optional[str] = Query(None, description="Optional author filter"),
    db: Session = Depends(get_db)
):
    """
    Trilingual Deep Search across book TXT files with local Cloud caching,
    Urdu/Arabic normalization, and full admin controller integration.
    """
    # 1. Fetch Deep Search settings from Admin Controller
    try:
        from controllers.settings_controller import _load_settings_from_disk, get_default_homepage_settings
        homepage_settings = _load_settings_from_disk()
        ds_settings = homepage_settings.get("deep_search", get_default_homepage_settings()["deep_search"])
    except Exception as e:
        logger.warning(f"Error loading deep search settings: {e}")
        ds_settings = {
            "enabled": True,
            "enable_cloud_caching": True,
            "enable_aerab_normalization": True,
            "enable_boolean_operators": True,
            "enable_scope_filters": True,
            "enable_citation_tool": True,
            "enable_research_export": True,
            "max_snippets_per_book": 5,
            "snippet_context_chars": 80
        }

    # Clean arguments when invoked directly or via FastAPI
    query_str = str(query).strip() if query and not hasattr(query, "default") else ""
    cat_id = category_id if (category_id is not None and not hasattr(category_id, "default")) else None
    b_id = book_id if (book_id is not None and not hasattr(book_id, "default")) else None
    author_str = str(author).strip() if (author is not None and not hasattr(author, "default")) else None

    # If Deep Search is disabled globally by Admin:
    if not ds_settings.get("enabled", True):
        return {
            "total_results": 0,
            "query": query_str,
            "results": [],
            "disabled": True,
            "message": "Deep Content Search is currently disabled by administrator."
        }

    max_per_book = int(ds_settings.get("max_snippets_per_book", 5))
    context_chars = int(ds_settings.get("snippet_context_chars", 80))
    enable_cache = bool(ds_settings.get("enable_cloud_caching", True))
    enable_norm = bool(ds_settings.get("enable_aerab_normalization", True))
    enable_scopes = bool(ds_settings.get("enable_scope_filters", True))

    results = []

    # 2. Query books with attached text
    query_filters = [
        book_model.Book.txt_file_url.isnot(None),
        book_model.Book.deleted_at.is_(None),
        book_model.Book.is_approved.is_(True)
    ]

    if enable_scopes:
        if b_id:
            query_filters.append(book_model.Book.id == b_id)
        if author_str:
            query_filters.append(book_model.Book.author.ilike(f"%{author_str}%"))

    books_query = db.query(book_model.Book).filter(*query_filters)

    if enable_scopes and cat_id:
        books_query = books_query.filter(
            book_model.Book.subcategories.any(
                book_model.Subcategory.category_id == cat_id
            )
        )

    books_with_text = books_query.all()

    # 3. Delimiter & Search Pattern
    page_delimiter_pattern = re.compile(r'_{5,}|===PAGE===|PAGE_SEPARATOR|\x0c', re.IGNORECASE)
    search_pattern = build_trilingual_search_regex(query_str, enable_normalization=enable_norm, context_chars=context_chars)

    if not search_pattern:
        return {"total_results": 0, "query": query_str, "results": []}

    for book in books_with_text:
        content = get_or_cache_txt_content(book.id, book.txt_file_url, enable_cache=enable_cache)
        if not content:
            continue

        pages = page_delimiter_pattern.split(content)
        book_matches = 0

        for page_idx, page_text in enumerate(pages):
            if not page_text or not page_text.strip():
                continue

            matches = list(search_pattern.finditer(page_text))
            if not matches:
                continue

            for match in matches:
                before_text = match.group(1).strip()
                matched_word = match.group(2)
                after_text = match.group(3).strip()
                
                snippet = f"...{before_text} <mark class='bg-amber-300 text-slate-950 font-bold px-1 rounded'>{matched_word}</mark> {after_text}..."

                results.append({
                    "book_id": book.id,
                    "title": book.title,
                    "author": book.author or "Unknown",
                    "publisher": book.publisher or "",
                    "cover_image": book.cover_image_url,
                    "page_number": page_idx + 1,
                    "snippet": snippet,
                    "matched_text": matched_word,
                    "is_restricted": bool(book.is_restricted)
                })

                book_matches += 1
                if book_matches >= max_per_book:
                    break

            if book_matches >= max_per_book:
                break

    return {
        "total_results": len(results),
        "query": query,
        "results": results,
        "settings": {
            "citation_enabled": ds_settings.get("enable_citation_tool", True),
            "export_enabled": ds_settings.get("enable_research_export", True),
            "scopes_enabled": ds_settings.get("enable_scope_filters", True),
        }
    }


# ==================================
# 📖 READ SINGLE BOOK BY ID
# ==================================
@router.get("/{book_id}", response_model=book_schema.Book)
@router.get("/{book_id}/", response_model=book_schema.Book, include_in_schema=False)
def read_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[user_model.User] = Depends(get_current_user_optional)
):
    db_book = get_book_by_id_internal(db, book_id)
    
    if not db_book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    # 1. Approval Check
    if not db_book.is_approved:
        if not current_user or (current_user.role.name.lower() not in ['admin', 'superadmin']):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")
            
    # 2. Restricted Access Check Logic
    has_access = False

    if not db_book.is_restricted:
        has_access = True
    elif current_user and hasattr(current_user, 'role') and current_user.role.name.lower() in ['admin', 'superadmin']:
        has_access = True
    elif current_user:
        accessible_ids = _get_accessible_book_ids(db, current_user)
        if db_book.id in accessible_ids:
            has_access = True

    setattr(db_book, "user_has_access", has_access)

    # Hide private URLs for unauthorized users while allowing metadata view
    if db_book.is_restricted and not has_access:
        db_book.pdf_url = None
        db_book.pdf_file = None
        db_book.txt_file_url = None
        db_book.txt_file = None

    return db_book


# ==================================
# 📥 SAME-ORIGIN PDF STREAM ROUTE (Zero CORS Issue)
# ==================================
@router.get("/{book_id}/stream-pdf", tags=["Books (Read)"])
@router.get("/{book_id}/pdf", tags=["Books (Read)"])
async def stream_book_pdf(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[user_model.User] = Depends(get_current_user_optional)
):
    db_book = get_book_by_id_internal(db, book_id)
    if not db_book or not db_book.pdf_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF not found for this book")

    # 1. Approval Check
    if not db_book.is_approved:
        if not current_user or (current_user.role.name.lower() not in ['admin', 'superadmin']):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")

    # 2. Restricted Access Check
    if db_book.is_restricted:
        has_access = False
        if current_user and hasattr(current_user, 'role') and current_user.role.name.lower() in ['admin', 'superadmin']:
            has_access = True
        elif current_user:
            accessible_ids = _get_accessible_book_ids(db, current_user)
            if db_book.id in accessible_ids:
                has_access = True
        if not has_access:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this restricted PDF is not granted.")

    raw_url = str(db_book.pdf_url).strip()

    # Determine safe filename and media_type
    import urllib.parse
    import mimetypes

    url_path_clean = raw_url.split("?")[0]
    file_ext = os.path.splitext(url_path_clean)[1].lower()
    media_type, _ = mimetypes.guess_type(url_path_clean)
    if not media_type:
        if file_ext == ".pdf":
            media_type = "application/pdf"
        elif file_ext in [".docx", ".doc"]:
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif file_ext in [".txt", ".text"]:
            media_type = "text/plain; charset=utf-8"
        else:
            media_type = "application/octet-stream"

    # Always use safe ASCII filename in HTTP header to avoid Latin-1 header encoding crashes
    safe_filename = f"book_{book_id}{file_ext if file_ext else '.pdf'}"

    # Case A: Local File
    if not raw_url.startswith("http://") and not raw_url.startswith("https://"):
        local_path = resolve_upload_path(raw_url)
        if local_path and os.path.exists(local_path):
            return FileResponse(
                path=local_path,
                media_type=media_type,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                    "Content-Disposition": f'inline; filename="{safe_filename}"',
                    "Cache-Control": "public, max-age=86400"
                }
            )
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local document file not found")

    # Case B: Cloudflare R2 / Remote CDN URL (Handles Unicode / Urdu / Spaces gracefully)
    # SECURITY: Validate that remote URLs belong to trusted CDN domains only (prevent SSRF)
    TRUSTED_DOMAINS = {
        "res.cloudinary.com",
        "cloudinary.com",
        "r2.cloudflarestorage.com",
        "pub-",  # R2 public bucket prefix pattern
    }
    try:
        parsed = urllib.parse.urlsplit(raw_url)

        # SSRF Prevention: block private/internal IPs and non-trusted domains
        hostname = parsed.hostname or ""
        if not any(hostname.endswith(d) or hostname.startswith(d) for d in TRUSTED_DOMAINS):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Remote URL is not from a trusted CDN domain."
            )

        quoted_path = urllib.parse.quote(parsed.path)
        encoded_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, quoted_path, parsed.query, parsed.fragment))

        req = urllib.request.Request(encoded_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        remote_resp = urllib.request.urlopen(req, timeout=30)

        remote_content_type = remote_resp.headers.get("Content-Type")
        if remote_content_type and "text/html" not in remote_content_type:
            media_type = remote_content_type

        def file_stream_generator(resp):
            try:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    yield chunk
            finally:
                resp.close()

        return StreamingResponse(
            file_stream_generator(remote_resp),
            media_type=media_type,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Content-Disposition": f'inline; filename="{safe_filename}"',
                "Cache-Control": "public, max-age=86400"
            }
        )
    except urllib.error.HTTPError as he:
        raise HTTPException(status_code=he.code, detail=f"Remote document error: {he.reason}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unable to load document: {str(e)}")

# ==================================
# 📥 SAME-ORIGIN TEXT STREAM ROUTE (Zero CORS Issue)
# ==================================
@router.get("/{book_id}/stream-text", tags=["Books (Read)"])
@router.get("/{book_id}/text", tags=["Books (Read)"])
async def stream_book_text(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[user_model.User] = Depends(get_current_user_optional)
):
    db_book = get_book_by_id_internal(db, book_id)
    if not db_book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
        
    txt_url = getattr(db_book, 'txt_file_url', None) or getattr(db_book, 'txt_file', None)
    if not txt_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Text content not found for this book")

    # 1. Approval Check
    if not db_book.is_approved:
        if not current_user or (current_user.role.name.lower() not in ['admin', 'superadmin']):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")

    # 2. Restricted Access Check
    if db_book.is_restricted:
        has_access = False
        if current_user and hasattr(current_user, 'role') and current_user.role.name.lower() in ['admin', 'superadmin']:
            has_access = True
        elif current_user:
            accessible_ids = _get_accessible_book_ids(db, current_user)
            if db_book.id in accessible_ids:
                has_access = True
        if not has_access:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this restricted text is not granted.")

    raw_url = str(getattr(db_book, 'txt_file_url', None) or getattr(db_book, 'txt_file', None) or '').strip()
    safe_filename = f"book_{book_id}.txt"

    # Case A: Local File
    if not raw_url.startswith("http://") and not raw_url.startswith("https://"):
        local_path = resolve_upload_path(raw_url)
        if local_path and os.path.exists(local_path):
            return FileResponse(
                path=local_path,
                media_type="text/plain; charset=utf-8",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                    "Content-Disposition": f'inline; filename="{safe_filename}"',
                    "Cache-Control": "public, max-age=86400"
                }
            )

    # Case B: Remote R2 / Cloudinary / CDN
    # SECURITY: Validate that remote URLs belong to trusted CDN domains only (prevent SSRF)
    TRUSTED_TEXT_DOMAINS = {
        "res.cloudinary.com",
        "cloudinary.com",
        "r2.cloudflarestorage.com",
        "pub-",  # R2 public bucket prefix pattern
    }
    try:
        import urllib.parse
        parsed = urllib.parse.urlsplit(raw_url)

        # SSRF Prevention: block private/internal IPs and non-trusted domains
        hostname = parsed.hostname or ""
        if not any(hostname.endswith(d) or hostname.startswith(d) for d in TRUSTED_TEXT_DOMAINS):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Remote URL is not from a trusted CDN domain."
            )

        quoted_path = urllib.parse.quote(parsed.path)
        encoded_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, quoted_path, parsed.query, parsed.fragment))

        req = urllib.request.Request(encoded_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        remote_resp = urllib.request.urlopen(req, timeout=30)

        def text_stream_generator(resp):
            try:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    yield chunk
            finally:
                resp.close()

        return StreamingResponse(
            text_stream_generator(remote_resp),
            media_type="text/plain; charset=utf-8",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Content-Disposition": f'inline; filename="{safe_filename}"',
                "Cache-Control": "public, max-age=86400"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unable to load text: {str(e)}")
