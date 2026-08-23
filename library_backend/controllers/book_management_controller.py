from typing import List, Optional
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session, joinedload

# --- Imports ---
from models import book_model, language_model, user_model, request_model, request_user_model, fatawa_model
from schemas import book_schema
from auth import require_permission, get_current_user_optional 
from database import get_db
from utils import create_log

# ✅ Smart Multi-Storage Upload Helper
from utils.storage_helper import smart_upload, smart_delete
from utils.local_helper import save_pdf_locally, save_txt_locally

router = APIRouter()

# ==================================
# HELPER FUNCTIONS
# ==================================

def get_book_by_id_internal(db: Session, book_id: int):
    """Fetches a book with all relationships loaded (Used for returning response)."""
    return db.query(book_model.Book).options(
        joinedload(book_model.Book.subcategories).joinedload(book_model.Subcategory.category),
        joinedload(book_model.Book.language)
    ).filter(
        book_model.Book.id == book_id,
        book_model.Book.deleted_at.is_(None)
    ).first()

# ==================================
# WRITE OPERATIONS (Admin Only)
# ==================================

@router.post("/", response_model=book_schema.Book, status_code=status.HTTP_201_CREATED)
async def create_book(
    title: str = Form(...),
    author: Optional[str] = Form(None),
    publisher: Optional[str] = Form(None),
    translator: Optional[str] = Form(None),
    isbn: Optional[str] = Form(None),
    edition: Optional[str] = Form(None),
    parts_or_volumes: Optional[str] = Form(None),
    subject_number: Optional[str] = Form(None),
    language_id: int = Form(...),
    fatawa_category_id: Optional[int] = Form(None),
    page_count: Optional[int] = Form(None),
    publication_year: Optional[int] = Form(None),
    serial_number: Optional[str] = Form(None),
    book_number: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    is_restricted: bool = Form(False),
    is_digital: bool = Form(False),
    date_of_purchase: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    remarks: Optional[str] = Form(None),
    total_copies: Optional[int] = Form(1),
    extra_data: Optional[str] = Form(None),
    subcategory_ids: List[int] = Form([]),
    
    # 📂 FILES
    cover_image: Optional[UploadFile] = File(None),
    pdf_file: Optional[UploadFile] = File(None),
    txt_file: Optional[UploadFile] = File(None), 
      
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    # 1. Validation: Language
    if not db.query(language_model.Language).filter(language_model.Language.id == language_id).first():
        raise HTTPException(status_code=400, detail=f"Language ID {language_id} not found.")

    if fatawa_category_id is not None:
        if not db.query(fatawa_model.FatawaCategory).filter(
            fatawa_model.FatawaCategory.id == fatawa_category_id,
            fatawa_model.FatawaCategory.deleted_at.is_(None),
        ).first():
            raise HTTPException(status_code=400, detail=f"Fatawa category ID {fatawa_category_id} not found.")

    # 2. Validation: ISBN
    if isbn:
        existing = db.query(book_model.Book).filter(
            book_model.Book.isbn == isbn, 
            book_model.Book.deleted_at.is_(None)
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"ISBN {isbn} already exists.")

    # 3. Parse Date
    parsed_purchase_date = None
    if date_of_purchase:
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y"):
            try:
                parsed_purchase_date = datetime.strptime(date_of_purchase, fmt).date()
                break
            except ValueError:
                continue

    # 4. Handle Files (Hybrid Upload)
    cover_image_url = None
    pdf_url = None
    txt_file_url = None 

    print(f"📥 Received Files -> Cover: {cover_image.filename if cover_image else 'No'}, PDF: {pdf_file.filename if pdf_file else 'No'}, TXT: {txt_file.filename if txt_file else 'No'}")

    # A. Cover Image -> Smart Upload (R2 / Cloudinary / Local Fallback)
    if cover_image:
        cover_image_url = smart_upload(cover_image, folder="booknest/covers", resource_type="image")
    
    # B. PDF -> Smart Upload (R2 / Cloudinary / Local Fallback)
    if pdf_file:
        pdf_url = smart_upload(pdf_file, folder="booknest/pdfs")

    # C. Text File -> Smart Upload (R2 / Cloudinary / Local Fallback)
    if txt_file:
        txt_file_url = smart_upload(txt_file, folder="booknest/texts")

    # 5. Handle Subcategories
    db_subcategories = []
    if subcategory_ids:
        db_subcategories = db.query(book_model.Subcategory).filter(
            book_model.Subcategory.id.in_(subcategory_ids)
        ).all()

    # 6. Create Object
    new_book = book_model.Book(
        title=title,
        author=author,
        publisher=publisher,
        translator=translator,
        isbn=isbn,
        edition=edition,
        parts_or_volumes=parts_or_volumes,
        subject_number=subject_number,
        language_id=language_id,
        fatawa_category_id=fatawa_category_id,
        page_count=page_count,
        serial_number=serial_number,
        book_number=book_number,
        price=price,
        date_of_purchase=parsed_purchase_date,
        published_date=date(publication_year, 1, 1) if publication_year else None,
        description=description,
        remarks=remarks,
        total_copies=total_copies or 1,
        available_copies=total_copies or 1,
        extra_data=extra_data,
        is_restricted=is_restricted,
        is_digital=is_digital,
        is_approved=True, 
        
        # Saved URLs
        cover_image_url=cover_image_url,
        pdf_url=pdf_url,
        txt_file_url=txt_file_url 
    )
    
    new_book.subcategories = db_subcategories

    db.add(new_book)
    db.flush()

    # 7. Create Upload Approval Record
    upload_request = request_model.UploadRequest(
        book_id=new_book.id,
        submitted_by_id=current_user.id,
        reviewed_by_id=current_user.id,
        status='Approved',
        remarks='Auto-approved book uploaded by Admin.'
    )
    db.add(upload_request)

    # 8. Log Actions
    create_log(
        db=db, user=current_user, action_type="BOOK_CREATED",
        description=f"Book '{new_book.title}' created (ID: {new_book.id}).",
        target_type="Book", target_id=new_book.id
    )
    create_log(
        db=db, user=current_user, action_type="UPLOAD_REQUEST_CREATED",
        description=f"Upload approval requested for Book ID {new_book.id}.",
        target_type="UploadRequest", target_id=upload_request.id
    )

    db.commit()
    db.refresh(new_book)
    return get_book_by_id_internal(db, new_book.id)


# ==============================================================================
# 🟣 BULK EXCEL IMPORT & STAGED BOOKS (Persistent Database Storage)
# ==============================================================================

@router.post("/bulk-import", response_model=List[book_schema.Book], status_code=status.HTTP_201_CREATED)
def bulk_import_books(
    payload: List[book_schema.StagedBookBase],
    replace_existing: bool = False,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    """
    Directly insert bulk books parsed from Excel spreadsheet into MySQL database (books table).
    If replace_existing is True, previous books are cleared so only the new file's data is active.
    """
    if replace_existing:
        db.query(book_model.Book).filter(book_model.Book.deleted_at.is_(None)).update({"deleted_at": datetime.utcnow()})
        db.commit()

    languages = db.query(language_model.Language).filter(language_model.Language.deleted_at.is_(None)).all()
    default_lang = languages[0] if languages else None
    
    LANGUAGE_MAP = {
        'urdu': 'Urdu', 'اردو': 'Urdu',
        'english': 'English', 'eng': 'English', 'انگریزی': 'English', 'انگريزي': 'English', 'انگلش': 'English',
        'arabic': 'Arabic', 'عربی': 'Arabic', 'عربي': 'Arabic',
        'hindi': 'Hindi', 'ہندی': 'Hindi', 'हिन्दी': 'Hindi',
        'marathi': 'Marathi', 'مراٹھی': 'Marathi', 'मराठी': 'Marathi',
        'persian': 'Persian', 'فارسی': 'Persian'
    }

    def resolve_language_id(name_str):
        if not name_str or not languages:
            return default_lang.id if default_lang else 1
        name_clean = name_str.strip().lower()
        mapped_name = LANGUAGE_MAP.get(name_clean, name_clean).lower()
        for lang in languages:
            if lang.name.lower() in mapped_name or mapped_name in lang.name.lower():
                return lang.id
            if hasattr(lang, 'code') and lang.code and lang.code.lower() == mapped_name:
                return lang.id
        return default_lang.id if default_lang else 1

    import re
    def safe_str(val, max_len=None):
        if val is None:
            return None
        s = str(val).strip()
        if not s:
            return None
        return s[:max_len] if max_len else s

    def safe_int(val, min_val=0, max_val=2147483647, default=None):
        if val is None or str(val).strip() == '':
            return default
        try:
            clean = re.sub(r'[^\d-]', '', str(val))
            if not clean or clean == '-':
                return default
            num = int(clean)
            if num < min_val or num > max_val:
                return default
            return num
        except Exception:
            return default

    def safe_float(val, min_val=0.0, max_val=999999999.0, default=None):
        if val is None or str(val).strip() == '':
            return default
        try:
            clean = re.sub(r'[^\d.-]', '', str(val))
            if not clean or clean == '-' or clean == '.':
                return default
            num = float(clean)
            if num < min_val or num > max_val:
                return default
            return num
        except Exception:
            return default

    created_books = []
    for item in payload:
        if not item.title and not item.author and not item.book_number:
            continue
            
        lang_id = resolve_language_id(item.language_name)
        
        parsed_pub_date = None
        if item.publication_year:
            try:
                clean_y = safe_int(str(item.publication_year)[:4], min_val=1000, max_val=2100)
                if clean_y:
                    parsed_pub_date = date(clean_y, 1, 1)
            except Exception:
                pass
                
        qty = safe_int(item.quantity, min_val=1, max_val=10000, default=1)
        pages = safe_int(item.page_count, min_val=1, max_val=50000, default=None)
        price_val = safe_float(item.price, min_val=0.0, max_val=10000000.0, default=None)

        new_book = book_model.Book(
            title=safe_str(item.title, 250) or "Untitled Book",
            author=safe_str(item.author, 250),
            publisher=safe_str(item.publisher, 250),
            translator=safe_str(item.translator, 250),
            serial_number=safe_str(item.serial_number, 90),
            book_number=safe_str(item.book_number, 90),
            language_id=lang_id,
            page_count=pages,
            parts_or_volumes=safe_str(item.parts_or_volumes, 90),
            subject_number=safe_str(item.subject_number, 90),
            edition=safe_str(item.edition, 90),
            total_copies=qty if qty and qty > 0 else 1,
            available_copies=qty if qty and qty > 0 else 1,
            price=price_val,
            remarks=safe_str(item.remarks),
            description=safe_str(item.description),
            extra_data=item.extra_data or item.raw_data,
            published_date=parsed_pub_date,
            is_digital=True,
            is_approved=True,  # Approved by default when admin imports via Excel so it appears in the catalog!
            is_restricted=False
        )
        db.add(new_book)
        created_books.append(new_book)

    db.commit()
    for b in created_books:
        db.refresh(b)

    create_log(
        db=db, user=current_user, action_type="BULK_EXCEL_IMPORT",
        description=f"Admin {current_user.username} imported {len(created_books)} books via Excel spreadsheet.",
        target_type="Book", target_id=created_books[0].id if created_books else 0
    )

    return created_books


@router.delete("/bulk-clear", status_code=status.HTTP_204_NO_CONTENT)
def clear_all_books(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    """Soft delete all active books in the library catalog."""
    db.query(book_model.Book).filter(book_model.Book.deleted_at.is_(None)).update({"deleted_at": datetime.utcnow()})
    create_log(
        db=db, user=current_user, action_type="BULK_BOOKS_CLEARED",
        description=f"Admin {current_user.username} cleared all books from library catalog.",
        target_type="Book", target_id=0
    )
    db.commit()
    return None


@router.post("/staged/bulk", response_model=List[book_schema.StagedBook], status_code=status.HTTP_201_CREATED)
def save_bulk_staged_books(
    payload: book_schema.StagedBookBulkCreate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    """Save bulk parsed books from Excel into persistent staged_books table."""
    saved_items = []
    for b in payload.books:
        staged = book_model.StagedBook(
            title=b.title,
            author=b.author,
            publisher=b.publisher,
            translator=b.translator,
            serial_number=b.serial_number,
            book_number=b.book_number,
            language_name=b.language_name,
            page_count=b.page_count,
            publication_year=b.publication_year,
            edition=b.edition,
            parts_or_volumes=b.parts_or_volumes,
            subject_number=b.subject_number,
            quantity=b.quantity or 1,
            price=b.price,
            description=b.description,
            remarks=b.remarks,
            extra_data=b.extra_data,
            raw_data=b.raw_data,
            file_name=payload.file_name,
            uploaded_by_id=current_user.id,
            status="PENDING"
        )
        db.add(staged)
        saved_items.append(staged)

    db.commit()
    for item in saved_items:
        db.refresh(item)
    return saved_items


@router.get("/staged", response_model=List[book_schema.StagedBook])
def get_staged_books(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    """Retrieve all pending staged books uploaded from Excel across all devices."""
    return db.query(book_model.StagedBook).filter(
        book_model.StagedBook.status == "PENDING"
    ).order_by(book_model.StagedBook.id.asc()).all()


@router.delete("/staged/{staged_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staged_book(
    staged_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    """Remove a single staged book item."""
    staged = db.query(book_model.StagedBook).filter(book_model.StagedBook.id == staged_id).first()
    if staged:
        db.delete(staged)
        db.commit()
    return None


@router.delete("/staged", status_code=status.HTTP_204_NO_CONTENT)
def clear_all_staged_books(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    """Clear all pending staged books."""
    db.query(book_model.StagedBook).delete()
    db.commit()
    return None


@router.put("/{book_id}", response_model=book_schema.Book)
@router.put("/{book_id}/", response_model=book_schema.Book, include_in_schema=False)
async def update_book(
    book_id: int,
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    publisher: Optional[str] = Form(None),
    isbn: Optional[str] = Form(None),
    language_id: Optional[int] = Form(None),
    fatawa_category_id: Optional[int] = Form(None),
    page_count: Optional[int] = Form(None),
    publication_year: Optional[int] = Form(None),
    serial_number: Optional[str] = Form(None),
    book_number: Optional[str] = Form(None),
    translator: Optional[str] = Form(None),
    edition: Optional[str] = Form(None),
    parts_or_volumes: Optional[str] = Form(None),
    subject_number: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    remarks: Optional[str] = Form(None),
    total_copies: Optional[int] = Form(None),
    extra_data: Optional[str] = Form(None),
    is_restricted: Optional[bool] = Form(None),
    subcategory_ids: List[int] = Form(None),
    
    # 📂 FILES UPDATE
    cover_image: Optional[UploadFile] = File(None),
    pdf_file: Optional[UploadFile] = File(None),
    txt_file: Optional[UploadFile] = File(None), 
    
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    db_book = get_book_by_id_internal(db, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Update Relations
    if subcategory_ids is not None:
        subcats = db.query(book_model.Subcategory).filter(
            book_model.Subcategory.id.in_(subcategory_ids)
        ).all()
        db_book.subcategories = subcats

    # Update Fields
    if title is not None: db_book.title = title
    if author is not None: db_book.author = author
    if publisher is not None: db_book.publisher = publisher
    if translator is not None: db_book.translator = translator
    if edition is not None: db_book.edition = edition
    if parts_or_volumes is not None: db_book.parts_or_volumes = parts_or_volumes
    if subject_number is not None: db_book.subject_number = subject_number
    if page_count is not None: db_book.page_count = page_count
    if price is not None: db_book.price = price
    if remarks is not None: db_book.remarks = remarks
    if total_copies is not None:
        db_book.total_copies = total_copies
        db_book.available_copies = total_copies
    if extra_data is not None: db_book.extra_data = extra_data
    if serial_number is not None: db_book.serial_number = serial_number
    if book_number is not None: db_book.book_number = book_number
    if description is not None: db_book.description = description
    if is_restricted is not None: db_book.is_restricted = is_restricted

    if publication_year is not None:
        db_book.published_date = date(publication_year, 1, 1)
    
    if language_id is not None:
         if not db.query(language_model.Language).filter(language_model.Language.id == language_id).first():
             raise HTTPException(status_code=400, detail="Invalid Language ID")
         db_book.language_id = language_id

    if fatawa_category_id is not None:
        if not db.query(fatawa_model.FatawaCategory).filter(
            fatawa_model.FatawaCategory.id == fatawa_category_id,
            fatawa_model.FatawaCategory.deleted_at.is_(None),
        ).first():
            raise HTTPException(status_code=400, detail="Invalid Fatawa category ID")
        db_book.fatawa_category_id = fatawa_category_id
    
    if isbn is not None and isbn != db_book.isbn:
         if db.query(book_model.Book).filter(book_model.Book.isbn == isbn, book_model.Book.id != book_id).first():
             raise HTTPException(status_code=409, detail="ISBN already exists.")
         db_book.isbn = isbn

    # Update Files (Auto-Delete Old Files to Save Cloud Storage Memory)
    if cover_image:
        old_cover = db_book.cover_image_url
        new_cover = smart_upload(cover_image, folder="booknest/covers", resource_type="image")
        if new_cover:
            db_book.cover_image_url = new_cover
            if old_cover and old_cover != new_cover:
                smart_delete(old_cover)

    # ✅ PDF Update -> Smart Upload + Auto-Delete Old PDF
    if pdf_file:
        old_pdf = db_book.pdf_url
        new_pdf = smart_upload(pdf_file, folder="booknest/pdfs")
        if new_pdf:
            db_book.pdf_url = new_pdf
            if old_pdf and old_pdf != new_pdf:
                smart_delete(old_pdf)

    # ✅ Text File Update -> Smart Upload + Auto-Delete Old Research Text
    if txt_file:
        old_txt = db_book.txt_file_url or db_book.txt_file
        new_txt = smart_upload(txt_file, folder="booknest/texts")
        if new_txt:
            db_book.txt_file_url = new_txt
            if old_txt and old_txt != new_txt:
                smart_delete(old_txt)

    # Approval Logic - Admin updates remain approved
    db_book.is_approved = True 
    
    existing_req = db.query(request_model.UploadRequest).filter(
        request_model.UploadRequest.book_id == book_id
    ).first()

    if existing_req:
        existing_req.status = 'Approved'
        existing_req.remarks = f"Auto: Book updated by {current_user.username}."
        existing_req.reviewed_by_id = current_user.id
        existing_req.reviewed_at = datetime.utcnow()
    else:
        new_req = request_model.UploadRequest(
            book_id=book_id,
            submitted_by_id=current_user.id,
            status='Pending',
            remarks="Auto: Book updated"
        )
        db.add(new_req)

    create_log(
        db=db, user=current_user, action_type="BOOK_UPDATED",
        description=f"Book '{db_book.title}' updated.",
        target_type="Book", target_id=book_id
    )
    
    db.commit()
    db.refresh(db_book)
    return get_book_by_id_internal(db, book_id)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/{book_id}/", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=False)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("BOOK_MANAGE"))
):
    db_book = db.query(book_model.Book).filter(
        book_model.Book.id == book_id,
        book_model.Book.deleted_at.is_(None)
    ).first()
    
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")

    db_book.deleted_at = datetime.utcnow()
    
    create_log(
        db=db, user=current_user, action_type="BOOK_DELETED",
        description=f"Book '{db_book.title}' soft-deleted.",
        target_type="Book", target_id=book_id
    )
    db.commit()
    return None