# file: controllers/interaction_controller.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.interaction_model import UserBookInteraction
from models.book_model import Book
from schemas import interaction_schema
from database import get_db
from auth import get_current_user
from models.user_model import User

router = APIRouter()

# --- Helper: Get or Create Interaction ---
def get_or_create_interaction(db: Session, user_id: int, book_id: int):
    interaction = db.query(UserBookInteraction).filter(
        UserBookInteraction.user_id == user_id,
        UserBookInteraction.book_id == book_id
    ).first()
    
    if not interaction:
        interaction = UserBookInteraction(user_id=user_id, book_id=book_id)
        db.add(interaction)
        db.flush() # ID mil jaye
        
    return interaction

# 1. Update Reading Progress (Last Page)
@router.post("/progress", response_model=interaction_schema.InteractionResponse)
def update_progress(
    data: interaction_schema.ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Book Validation
    if not db.query(Book).filter(Book.id == data.book_id).first():
        raise HTTPException(status_code=404, detail="Book not found")

    interaction = get_or_create_interaction(db, current_user.id, data.book_id)
    
    # Update Data
    interaction.last_page_read = data.page_no
    if data.total_pages > 0:
        interaction.total_pages = data.total_pages
    
    db.commit()
    db.refresh(interaction)
    return interaction

# 2. Toggle Bookmark
@router.post("/bookmark", response_model=interaction_schema.InteractionResponse)
def toggle_bookmark(
    data: interaction_schema.BookmarkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interaction = get_or_create_interaction(db, current_user.id, data.book_id)
    
    interaction.is_bookmarked = data.is_bookmarked
    
    db.commit()
    db.refresh(interaction)
    return interaction

# 3. Get User Status for a Book (Frontend Jab Book kholega tab call karega)
@router.get("/{book_id}", response_model=interaction_schema.InteractionResponse)
def get_book_status(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interaction = db.query(UserBookInteraction).filter(
        UserBookInteraction.user_id == current_user.id,
        UserBookInteraction.book_id == book_id
    ).first()
    
    if not interaction:
        # Return default values if never read before
        return {
            "book_id": book_id,
            "last_page_read": 1,
            "total_pages": 0,
            "is_bookmarked": False,
            "updated_at": datetime.now()
        }
        
    return interaction