import os
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func # ✅ func add kiya case-insensitive check ke liye

# --- Imports ---
from models import book_model, user_model, book_permission_model, request_user_model, interaction_model
from schemas import book_schema
from auth import get_current_user_optional 
from database import get_db

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

@router.get("/", response_model=List[book_schema.Book])
def read_books(
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    language_id: Optional[int] = None,
    approved_only: bool = False,
    db: Session = Depends(get_db),
    current_user: Optional[user_model.User] = Depends(get_current_user_optional)
):
    print("\n" + "="*50)
    print("🔍 DEBUG: Searching Books...")
    
    if current_user:
        print(f"👤 User Logged In: {current_user.username} (ID: {current_user.id})")
    else:
        print("👤 Guest User (Not Logged In)")

    # 1. Fetch Books
    query = db.query(book_model.Book).options(
        joinedload(book_model.Book.subcategories).joinedload(book_model.Subcategory.category),
        joinedload(book_model.Book.language)
    ).filter(book_model.Book.deleted_at.is_(None))

    # 2. Approval filter: only admins can see unapproved books
    if not current_user or not (hasattr(current_user, 'role') and current_user.role.name.lower() in ['admin', 'superadmin']):
        query = query.filter(book_model.Book.is_approved == True)
    elif approved_only:
        query = query.filter(book_model.Book.is_approved == True)
    
    # Filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                book_model.Book.title.ilike(search_term),
                book_model.Book.author.ilike(search_term),
                book_model.Book.isbn.ilike(search_term)
            )
        )

    if category_id:
        query = query.filter(book_model.Book.subcategories.any(id=category_id))
    
    if language_id:
        query = query.filter(book_model.Book.language_id == language_id)
        
    books = query.order_by(book_model.Book.id.desc()).offset(skip).limit(limit).all()

    # =========================================================
    # ✅ LOGIC: User Access Permission Check (DEBUGGED)
    # =========================================================
    
    accessible_book_ids = set()

    if current_user:
        # A. Check Direct Permissions
        direct_perms = db.query(book_permission_model.BookPermission).filter(
            book_permission_model.BookPermission.user_id == current_user.id
        ).all()
        accessible_book_ids.update([p.book_id for p in direct_perms])

        # B. Check Approved Requests (Case Insensitive Fix)
        try:
            # 🔍 Debug: User ki saari requests print karo
            all_reqs = db.query(request_user_model.AccessRequest).filter(
                request_user_model.AccessRequest.user_id == current_user.id
            ).all()
            
            print(f"📋 Total Requests found for user: {len(all_reqs)}")
            for req in all_reqs:
                print(f"   - Book ID: {req.book_id} | Status in DB: '{req.status}'")

            # ✅ FIX: Case Insensitive Check (Approved, approved, APPROVED sab chalega)
            approved_reqs = db.query(request_user_model.AccessRequest).filter(
                request_user_model.AccessRequest.user_id == current_user.id,
                func.lower(request_user_model.AccessRequest.status) == "approved"
            ).all()
            
            found_ids = [req.book_id for req in approved_reqs]
            accessible_book_ids.update(found_ids)
            print(f"✅ Approved Book IDs found: {found_ids}")

        except Exception as e:
            print(f"❌ Error fetching requests: {e}")

    # Step 2: Set Flag
    for book in books:
        has_access = False

        if not book.is_restricted:
            has_access = True
        elif current_user and hasattr(current_user, 'role') and current_user.role.name.lower() in ['admin', 'superadmin']:
            has_access = True
        elif current_user and book.id in accessible_book_ids:
            has_access = True
            print(f"🔓 Unlocking Restricted Book ID: {book.id} for User")

        setattr(book, "user_has_access", has_access)

    print("="*50 + "\n")
    return books


# ==================================
# 🚀 NEW: DEEP SEARCH ROUTE (Isko /book_id se UPAR rakhna zaroori hai!)
# ==================================
@router.get("/deep-search", tags=["Global Search"])
def deep_search_all_books(
    query: str = Query(..., min_length=3, description="Search keyword"),
    db: Session = Depends(get_db)
):
    print(f"\n🔍 [DEEP SEARCH START] Query: '{query}'")
    results = []
    
    # 1. Wo saari books nikalo jinka TXT file available hai
    books_with_text = db.query(book_model.Book).filter(
        book_model.Book.txt_file_url.isnot(None),
        book_model.Book.deleted_at.is_(None)
    ).all()

    print(f"📚 Found {len(books_with_text)} books with TXT files attached.")

    # 2. Page delimiter ka regex
    page_delimiter_pattern = re.compile(r'_{5,}|===PAGE===|PAGE_SEPARATOR', re.IGNORECASE)
    
    # 3. Search pattern: Keyword aur uske aage-peeche ke 60 characters nikalna
    safe_query = re.escape(query)
    search_pattern = re.compile(f'(.{{0,60}})({safe_query})(.{{0,60}})', re.IGNORECASE)

    for book in books_with_text:
        # File path formatting
        url_path = str(book.txt_file_url)
        print(f"➡️ Checking Book ID {book.id} | TXT URL: {url_path}")
        
        # Agar URL me "static" na ho, toh add karo (local file ke liye)
        if url_path.startswith("/uploads"):
            file_path = os.path.join("static", url_path.lstrip("/"))
        else:
            file_path = url_path
            
        print(f"📂 Looking for physical file at: {file_path}")

        if not os.path.exists(file_path):
            print("❌ FILE NOT FOUND ON SYSTEM! Skipping...\n")
            continue

        try:
            # File read karo
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # File ko pages me split karo
            pages = page_delimiter_pattern.split(content)

            # Har page me search karo
            book_match_count = 0
            for page_idx, page_text in enumerate(pages):
                matches = search_pattern.finditer(page_text)
                
                for match in matches:
                    before_text = match.group(1).strip()
                    matched_word = match.group(2)
                    after_text = match.group(3).strip()
                    
                    snippet = f"...{before_text} <mark>{matched_word}</mark> {after_text}..."

                    results.append({
                        "book_id": book.id,
                        "title": book.title,
                        "author": book.author,
                        "cover_image": book.cover_image_url,
                        "page_number": page_idx + 1,
                        "snippet": snippet
                    })
                    
                    book_match_count += 1
                    # Ek book me maximum 5 results dikhayenge
                    if book_match_count >= 5:
                        break
                        
        except Exception as e:
            print(f"❌ Error reading file {file_path}: {e}")

    print(f"✅ [DEEP SEARCH END] Total Results Found: {len(results)}\n")
    return {
        "total_results": len(results),
        "query": query,
        "results": results
    }


# ==================================
# 📖 READ SINGLE BOOK BY ID
# ==================================
@router.get("/{book_id}", response_model=book_schema.Book)
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
        # Check Permission Table
        perm = db.query(book_permission_model.BookPermission).filter(
            book_permission_model.BookPermission.book_id == book_id,
            book_permission_model.BookPermission.user_id == current_user.id
        ).first()
        
        # Check Request Table (Case Insensitive)
        req = db.query(request_user_model.AccessRequest).filter(
            request_user_model.AccessRequest.book_id == book_id,
            request_user_model.AccessRequest.user_id == current_user.id,
            func.lower(request_user_model.AccessRequest.status) == "approved"
        ).first()

        if perm or req:
            has_access = True

    if db_book.is_restricted and not has_access:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this restricted book.")

    setattr(db_book, "user_has_access", has_access)
    return db_book