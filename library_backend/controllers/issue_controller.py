import math
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

# --- Imports ---
from models import library_management_models as models, user_model
from schemas import library_management_schemas as schemas
from auth import require_permission
from database import get_db
from utils import create_log

router = APIRouter()

# ==================================
# ISSUE & RETURN ENDPOINTS
# ==================================

# --- READ ALL ISSUES (History/Returns) ---
@router.get("/", response_model=Union[schemas.PaginatedIssuedBookResponse, List[schemas.IssuedBook]])
def get_all_issues(
    skip: int = 0, 
    limit: int = 20, 
    page: Optional[int] = None,
    paginated: bool = False,
    status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    # ✅ FIX: 'BOOK_ISSUE' allow kiya taake 'Returns' tab load ho sake
    current_user: user_model.User = Depends(require_permission("BOOK_ISSUE"))
):
    """
    Get list of all issued books with search, date range, status, and pagination support.
    """
    is_paginated = paginated or (page is not None)
    active_page = max(1, page or 1)
    page_limit = max(1, min(limit or 20, 1000))
    offset = (active_page - 1) * page_limit if is_paginated else skip

    query = db.query(models.IssuedBook).options(
        joinedload(models.IssuedBook.book_copy).joinedload(models.BookCopy.book),
        joinedload(models.IssuedBook.client)
    )

    if status and status.strip() and status.strip().lower() != "all":
        query = query.filter(models.IssuedBook.status.ilike(status.strip()))

    if date_from:
        query = query.filter(models.IssuedBook.issue_date >= date_from)

    if date_to:
        query = query.filter(models.IssuedBook.issue_date <= date_to)

    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.join(models.IssuedBook.client).filter(
            or_(
                user_model.User.username.ilike(search_term),
                user_model.User.full_name.ilike(search_term),
                user_model.User.email.ilike(search_term)
            )
        )

    total_count = query.count()

    issues = query.order_by(models.IssuedBook.id.desc()).offset(offset).limit(page_limit).all()

    if is_paginated:
        total_pages = math.ceil(total_count / page_limit) if total_count > 0 else 1
        return {
            "items": issues,
            "total": total_count,
            "page": active_page,
            "limit": page_limit,
            "total_pages": total_pages
        }

    return issues


# --- ISSUE A BOOK ---
@router.post("/issue", response_model=schemas.IssuedBook, status_code=status.HTTP_201_CREATED)
def issue_book_to_client(
    issue_data: schemas.IssuedBookCreate, 
    db: Session = Depends(get_db),
    # 🔒 Strict: Sirf Issuer hi book issue kar sake
    current_user: user_model.User = Depends(require_permission("BOOK_ISSUE"))
):
    """
    Issues a book copy to a user.
    """
    # 1. Validate Copy
    db_copy = db.query(models.BookCopy).filter(models.BookCopy.id == issue_data.copy_id).first()
    if not db_copy:
        raise HTTPException(status_code=404, detail="Book copy not found")
    
    # Check availability (Allow 'Available' or 'Reference' if policy permits, strictly block 'Issued'/'Lost')
    if db_copy.status not in ["Available", "New"]:
        raise HTTPException(status_code=400, detail=f"Book copy is not available. Current status: {db_copy.status}")
    
    # 2. Validate Client (User exists?)
    client = db.query(user_model.User).filter(user_model.User.id == issue_data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client (User) not found")

    # 3. Create Issue Record
    db_issue = models.IssuedBook(**issue_data.dict())
    
    # 4. Update Copy Status
    db_copy.status = "Issued"
    
    db.add(db_issue)
    
    # 5. Log Action
    log_desc = f"Copy ID {db_copy.id} issued to '{client.username}'."
    create_log(db, current_user, "BOOK_ISSUED", log_desc, "IssuedBook", db_issue.id)
    
    db.commit()
    db.refresh(db_issue)
    return db_issue


# --- RETURN A BOOK ---
@router.post("/return/{issue_id}", response_model=schemas.IssuedBook)
def return_book(
    issue_id: int, 
    db: Session = Depends(get_db),
    # 🔒 Strict: Sirf Issuer hi book return le sake
    current_user: user_model.User = Depends(require_permission("BOOK_ISSUE"))
):
    """
    Returns a book and marks copy as Available.
    """
    db_issue = db.query(models.IssuedBook).filter(models.IssuedBook.id == issue_id).first()
    if not db_issue:
        raise HTTPException(status_code=404, detail="Issue record not found")
    
    if db_issue.status == "Returned":
        raise HTTPException(status_code=400, detail="Book has already been returned")

    # 1. Update Issue Record
    db_issue.status = "Returned"
    db_issue.actual_return_date = datetime.utcnow()
    
    # 2. Update Copy Status -> Available
    db_copy = db.query(models.BookCopy).filter(models.BookCopy.id == db_issue.copy_id).first()
    if db_copy:
        db_copy.status = "Available"
    
    # 3. Log Action
    log_desc = f"Copy ID {db_issue.copy_id} returned."
    create_log(db, current_user, "BOOK_RETURNED", log_desc, "IssuedBook", db_issue.id)

    db.commit()
    db.refresh(db_issue)
    return db_issue