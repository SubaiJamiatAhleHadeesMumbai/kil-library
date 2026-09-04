import math
from datetime import datetime, timedelta
from uuid import uuid4
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy import desc, func, or_, and_
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, get_current_user_optional
from database import get_db
from models import book_model, user_model
from models.fatawa_model import FatawaCategory, FatawaQuestion
from schemas import fatawa_schema as schemas, book_schema
from utils.cloudinary_helper import upload_to_cloudinary

router = APIRouter()


from utils import create_log

def ensure_admin(user: user_model.User):
    role_name = getattr(getattr(user, "role", None), "name", "") or ""
    role_lower = role_name.lower()
    if role_lower in {"admin", "superadmin", "administrator", "super admin"} or "mufti" in role_lower:
        return
    perms = [p.name for p in getattr(getattr(user, "role", None), "permissions", [])]
    if "FATAWA_MANAGE" in perms:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sirf authorized admin/mufti access allowed hai.")


def slugify(value: str) -> str:
    return "-".join(part for part in "".join(ch.lower() if ch.isalnum() else " " for ch in value).split() if part)


def generate_question_slug(db: Session, base_text: str) -> str:
    base_slug = slugify(base_text) or "question"
    for _ in range(5):
        candidate = f"{base_slug}-{uuid4().hex[:8]}"
        exists = db.query(FatawaQuestion.id).filter(FatawaQuestion.slug == candidate).first()
        if not exists:
            return candidate
    return f"{base_slug}-{uuid4().hex[:12]}"


def normalize_visibility(value: Optional[str]) -> str:
    normalized = (value or "public").strip().lower()
    if normalized not in {"public", "private"}:
        raise HTTPException(status_code=400, detail="Visibility must be public or private.")
    return normalized


def normalize_status(value: Optional[str]) -> str:
    normalized = (value or "pending").strip().lower()
    if normalized not in {"pending", "answered", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid question status.")
    return normalized


def get_category_or_404(db: Session, category_id: int) -> FatawaCategory:
    category = db.query(FatawaCategory).filter(
        FatawaCategory.id == category_id,
        FatawaCategory.deleted_at.is_(None),
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Fatawa category not found.")
    return category


def get_question_or_404(db: Session, question_id: int) -> FatawaQuestion:
    question = db.query(FatawaQuestion).options(joinedload(FatawaQuestion.category)).filter(
        FatawaQuestion.id == question_id,
        FatawaQuestion.deleted_at.is_(None),
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Fatawa question not found.")
    return question


@router.get("/categories", response_model=List[schemas.FatawaCategory])
def list_categories(db: Session = Depends(get_db)):
    return db.query(FatawaCategory).filter(
        FatawaCategory.deleted_at.is_(None),
        FatawaCategory.is_active.is_(True),
    ).order_by(FatawaCategory.sort_order.asc(), FatawaCategory.id.asc()).all()


@router.post("/categories", response_model=schemas.FatawaCategory, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: schemas.FatawaCategoryCreate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    ensure_admin(current_user)
    slug = payload.slug or slugify(payload.name)
    if db.query(FatawaCategory).filter(
        or_(FatawaCategory.name == payload.name, FatawaCategory.slug == slug),
        FatawaCategory.deleted_at.is_(None),
    ).first():
        raise HTTPException(status_code=409, detail="Category already exists.")

    category = FatawaCategory(
        name=payload.name,
        slug=slug,
        description=payload.description,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=schemas.FatawaCategory)
def update_category(
    category_id: int,
    payload: schemas.FatawaCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    ensure_admin(current_user)
    category = get_category_or_404(db, category_id)

    if payload.name and payload.name != category.name:
        duplicate = db.query(FatawaCategory).filter(
            FatawaCategory.name == payload.name,
            FatawaCategory.deleted_at.is_(None),
            FatawaCategory.id != category_id,
        ).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="Category name already exists.")
        category.name = payload.name

    if payload.slug:
        duplicate_slug = db.query(FatawaCategory).filter(
            FatawaCategory.slug == payload.slug,
            FatawaCategory.deleted_at.is_(None),
            FatawaCategory.id != category_id,
        ).first()
        if duplicate_slug:
            raise HTTPException(status_code=409, detail="Category slug already exists.")
        category.slug = payload.slug
    elif payload.name:
        category.slug = slugify(payload.name)

    if payload.description is not None:
        category.description = payload.description
    if payload.sort_order is not None:
        category.sort_order = payload.sort_order
    if payload.is_active is not None:
        category.is_active = payload.is_active

    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    ensure_admin(current_user)
    category = get_category_or_404(db, category_id)

    linked_books = db.query(func.count(book_model.Book.id)).filter(
        book_model.Book.fatawa_category_id == category_id,
        book_model.Book.deleted_at.is_(None),
    ).scalar() or 0
    linked_questions = db.query(func.count(FatawaQuestion.id)).filter(
        FatawaQuestion.category_id == category_id,
        FatawaQuestion.deleted_at.is_(None),
    ).scalar() or 0

    if linked_books or linked_questions:
        raise HTTPException(status_code=400, detail="Category is still linked with books or questions.")

    category.deleted_at = datetime.utcnow()
    db.commit()
    return None


@router.get("/categories/{category_id}/books", response_model=List[book_schema.Book])
def list_related_books(category_id: int, db: Session = Depends(get_db)):
    get_category_or_404(db, category_id)
    return db.query(book_model.Book).filter(
        book_model.Book.fatawa_category_id == category_id,
        book_model.Book.deleted_at.is_(None),
        book_model.Book.is_approved.is_(True),
    ).order_by(desc(book_model.Book.id)).all()


@router.get("/questions", response_model=Union[schemas.PaginatedFatawaResponse, List[schemas.FatawaQuestion]])
def list_questions(
    skip: int = 0,
    limit: int = 20,
    page: Optional[int] = None,
    paginated: bool = False,
    before_id: Optional[int] = None,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[user_model.User] = Depends(get_current_user_optional),
):
    is_paginated = paginated or (page is not None)
    active_page = max(1, page or 1)
    page_limit = max(1, min(limit or 20, 500))
    offset = (active_page - 1) * page_limit if is_paginated else skip

    query = db.query(FatawaQuestion).options(joinedload(FatawaQuestion.category)).filter(
        FatawaQuestion.deleted_at.is_(None)
    )

    if before_id is not None:
        query = query.filter(FatawaQuestion.id < before_id)

    if current_user:
        role_name = getattr(getattr(current_user, "role", None), "name", "") or ""
        if role_name.lower() not in {"admin", "superadmin", "administrator"}:
            query = query.filter(
                or_(
                    and_(FatawaQuestion.visibility == "public", FatawaQuestion.status == "answered"),
                    FatawaQuestion.user_id == current_user.id,
                )
            )
    else:
        query = query.filter(
            FatawaQuestion.visibility == "public",
            FatawaQuestion.status == "answered",
        )

    if category_id is not None:
        query = query.filter(FatawaQuestion.category_id == category_id)

    if status and status.strip() and status.strip().lower() != "all":
        query = query.filter(FatawaQuestion.status.ilike(status.strip()))

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(
            FatawaQuestion.question_text.ilike(term),
            FatawaQuestion.answer_text.ilike(term),
            FatawaQuestion.display_name.ilike(term),
        ))

    total_count = query.count()

    questions = query.order_by(desc(FatawaQuestion.created_at)).offset(offset).limit(page_limit).all()

    if is_paginated:
        total_pages = math.ceil(total_count / page_limit) if total_count > 0 else 1
        return {
            "items": questions,
            "total": total_count,
            "page": active_page,
            "limit": page_limit,
            "total_pages": total_pages
        }

    return questions


@router.get("/questions/my-questions", response_model=List[schemas.FatawaQuestion])
def my_questions(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    return db.query(FatawaQuestion).options(joinedload(FatawaQuestion.category)).filter(
        FatawaQuestion.deleted_at.is_(None),
        FatawaQuestion.user_id == current_user.id,
    ).order_by(desc(FatawaQuestion.created_at)).all()


@router.post("/questions", response_model=schemas.FatawaQuestion, status_code=status.HTTP_201_CREATED)
def create_question(
    payload: schemas.FatawaQuestionCreate,
    db: Session = Depends(get_db),
    current_user: Optional[user_model.User] = Depends(get_current_user_optional),
):
    if payload.category_id is not None:
        get_category_or_404(db, payload.category_id)

    recent_cutoff = datetime.utcnow() - timedelta(minutes=1)
    rate_query = db.query(func.count(FatawaQuestion.id)).filter(
        FatawaQuestion.created_at >= recent_cutoff,
        FatawaQuestion.deleted_at.is_(None),
    )

    if current_user:
        rate_query = rate_query.filter(FatawaQuestion.user_id == current_user.id)
    elif payload.guest_email:
        rate_query = rate_query.filter(FatawaQuestion.guest_email == payload.guest_email)

    recent_count = rate_query.scalar() or 0
    if recent_count >= 3:
        raise HTTPException(status_code=429, detail="Too many questions. Please wait a moment and try again.")

    if not current_user and not payload.display_name:
        raise HTTPException(status_code=400, detail="Display name is required for guest questions.")

    question = FatawaQuestion(
        slug=generate_question_slug(db, payload.question_text),
        category_id=payload.category_id,
        user_id=current_user.id if current_user else None,
        question_text=payload.question_text,
        visibility=normalize_visibility(payload.visibility),
        is_anonymous=payload.is_anonymous,
        display_name=payload.display_name or getattr(current_user, "full_name", None) or getattr(current_user, "username", None) or "Anonymous",
        guest_email=payload.guest_email,
        asked_by_name=payload.display_name or getattr(current_user, "full_name", None) or getattr(current_user, "username", None) or "Anonymous",
        asked_by_email=payload.guest_email,
        status="pending",
        updated_at=datetime.utcnow(),
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return get_question_or_404(db, question.id)


@router.get("/admin/questions", response_model=List[schemas.FatawaQuestion])
def admin_questions(
    skip: int = 0,
    limit: int = 50,
    before_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    ensure_admin(current_user)
    query = db.query(FatawaQuestion).options(joinedload(FatawaQuestion.category)).filter(
        FatawaQuestion.deleted_at.is_(None)
    )

    if before_id is not None:
        query = query.filter(FatawaQuestion.id < before_id)

    return query.order_by(desc(FatawaQuestion.created_at)).offset(skip).limit(limit).all()


@router.post("/upload-attachment")
async def upload_fatawa_attachment(
    file: UploadFile = File(...),
    current_user: user_model.User = Depends(get_current_user),
):
    ensure_admin(current_user)
    if not file:
        raise HTTPException(status_code=400, detail="No file provided.")
    
    url = upload_to_cloudinary(file, folder="booknest/fatawa")
    if not url:
        raise HTTPException(status_code=500, detail="File upload failed on server.")
    
    return {"url": url, "filename": file.filename, "content_type": file.content_type}


@router.patch("/admin/questions/{question_id}", response_model=schemas.FatawaQuestion)
def update_question(
    question_id: int,
    payload: schemas.FatawaQuestionUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    ensure_admin(current_user)
    question = get_question_or_404(db, question_id)

    if payload.category_id is not None:
        get_category_or_404(db, payload.category_id)
        question.category_id = payload.category_id
    if payload.question_text is not None:
        question.question_text = payload.question_text
    if payload.visibility is not None:
        question.visibility = normalize_visibility(payload.visibility)
    if payload.is_anonymous is not None:
        question.is_anonymous = payload.is_anonymous
    if payload.display_name is not None:
        question.display_name = payload.display_name
    if payload.guest_email is not None:
        question.guest_email = payload.guest_email
    if payload.status is not None:
        question.status = normalize_status(payload.status)
    if payload.answer_text is not None:
        question.answer_text = payload.answer_text.strip()
    if payload.pdf_url is not None:
        question.pdf_url = payload.pdf_url
    if payload.images is not None:
        question.images = payload.images
    if payload.verdict_summary is not None:
        question.verdict_summary = payload.verdict_summary
    if payload.mufti_name is not None:
        question.mufti_name = payload.mufti_name
    if payload.darul_ifta_reference_no is not None:
        question.darul_ifta_reference_no = payload.darul_ifta_reference_no

    db.commit()
    db.refresh(question)
    return get_question_or_404(db, question.id)


@router.put("/admin/questions/{question_id}/answer", response_model=schemas.FatawaQuestion)
def answer_question(
    question_id: int,
    payload: schemas.FatawaQuestionAnswer,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    ensure_admin(current_user)
    question = get_question_or_404(db, question_id)
    question.answer_text = (payload.answer_text or "").strip()
    question.status = normalize_status(payload.status or ("answered" if question.answer_text or payload.pdf_url else question.status))
    if payload.visibility is not None:
        question.visibility = normalize_visibility(payload.visibility)
    if payload.pdf_url is not None:
        question.pdf_url = payload.pdf_url
    if payload.images is not None:
        question.images = payload.images
    if payload.verdict_summary is not None:
        question.verdict_summary = payload.verdict_summary
    if payload.mufti_name is not None:
        question.mufti_name = payload.mufti_name
    if payload.darul_ifta_reference_no is not None:
        question.darul_ifta_reference_no = payload.darul_ifta_reference_no

    question.answered_by_id = current_user.id
    question.answered_at = datetime.utcnow()
    question.published_at = datetime.utcnow()
    
    create_log(
        db=db,
        user=current_user,
        action_type="FATWA_ANSWERED",
        description=f"Fatwa #{question.id} answered/updated by {current_user.username}",
        target_type="Fatwa",
        target_id=question.id
    )
    
    db.commit()
    db.refresh(question)
    return get_question_or_404(db, question.id)


@router.delete("/admin/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user),
):
    ensure_admin(current_user)
    question = get_question_or_404(db, question_id)
    question.deleted_at = datetime.utcnow()
    
    create_log(
        db=db,
        user=current_user,
        action_type="FATWA_DELETED",
        description=f"Fatwa #{question.id} deleted by {current_user.username}",
        target_type="Fatwa",
        target_id=question.id
    )
    
    db.commit()
    return None