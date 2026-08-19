from typing import List, Optional
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session, joinedload

# --- Imports ---
from models import book_model, language_model, user_model, request_model, request_user_model
from schemas import book_schema
from auth import require_permission, get_current_user_optional 
from database import get_db
from utils import create_log

# ✅ Changed Imports: Cover image ke liye Cloudinary, PDF aur TXT ke liye Local Helper
from utils.cloudinary_helper import upload_to_cloudinary
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

    # A. Cover Image -> Cloudinary
    if cover_image:
        cover_image_url = upload_to_cloudinary(cover_image, folder="booknest/covers", resource_type="image")
    
    # B. PDF -> Local Directory ✅
    if pdf_file:
        pdf_url = save_pdf_locally(pdf_file)

    # C. Text File -> Local Directory ✅
    if txt_file:
        print(f"🚀 Uploading Text File Locally: {txt_file.filename}")
        txt_file_url = save_txt_locally(txt_file)
        print(f"✅ Text File Uploaded: {txt_file_url}")

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
        page_count=page_count,
        serial_number=serial_number,
        book_number=book_number,
        price=price,
        date_of_purchase=parsed_purchase_date,
        published_date=date(publication_year, 1, 1) if publication_year else None,
        description=description,
        remarks=remarks,
        is_restricted=is_restricted,
        is_digital=is_digital,
        is_approved=False, 
        
        # Saved URLs
        cover_image_url=cover_image_url,
        pdf_url=pdf_url,
        txt_file_url=txt_file_url 
    )
    
    new_book.subcategories = db_subcategories

    db.add(new_book)
    db.flush()

    # 7. Create Pending Upload Approval Request
    pending_request = request_model.UploadRequest(
        book_id=new_book.id,
        submitted_by_id=current_user.id,
        status='Pending',
        remarks='Auto-generated approval request for newly uploaded book.'
    )
    db.add(pending_request)

    # 8. Log Actions
    create_log(
        db=db, user=current_user, action_type="BOOK_CREATED",
        description=f"Book '{new_book.title}' created (ID: {new_book.id}).",
        target_type="Book", target_id=new_book.id
    )
    create_log(
        db=db, user=current_user, action_type="UPLOAD_REQUEST_CREATED",
        description=f"Upload approval requested for Book ID {new_book.id}.",
        target_type="UploadRequest", target_id=pending_request.id
    )

    db.commit()
    db.refresh(new_book)
    return get_book_by_id_internal(db, new_book.id)


@router.put("/{book_id}", response_model=book_schema.Book)
async def update_book(
    book_id: int,
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    publisher: Optional[str] = Form(None),
    isbn: Optional[str] = Form(None),
    language_id: Optional[int] = Form(None),
    page_count: Optional[int] = Form(None),
    publication_year: Optional[int] = Form(None),
    serial_number: Optional[str] = Form(None),
    book_number: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
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
    if page_count is not None: db_book.page_count = page_count
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
    
    if isbn is not None and isbn != db_book.isbn:
         if db.query(book_model.Book).filter(book_model.Book.isbn == isbn, book_model.Book.id != book_id).first():
             raise HTTPException(status_code=409, detail="ISBN already exists.")
         db_book.isbn = isbn

    # Update Files
    if cover_image:
        db_book.cover_image_url = upload_to_cloudinary(cover_image, folder="booknest/covers", resource_type="image")

    # ✅ PDF Update -> Local Directory
    if pdf_file:
        db_book.pdf_url = save_pdf_locally(pdf_file)

    # ✅ Text File Update -> Local Directory
    if txt_file:
        print(f"🚀 Updating Text File Locally: {txt_file.filename}")
        db_book.txt_file_url = save_txt_locally(txt_file)
        print(f"✅ Text File Updated: {db_book.txt_file_url}")

    # Approval Reset Logic
    db_book.is_approved = False 
    
    existing_req = db.query(request_model.UploadRequest).filter(
        request_model.UploadRequest.book_id == book_id
    ).first()

    if existing_req:
        existing_req.status = 'Pending'
        existing_req.remarks = f"Auto: Book updated by {current_user.username}. Re-verify."
        existing_req.reviewed_by_id = None
        existing_req.reviewed_at = None
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