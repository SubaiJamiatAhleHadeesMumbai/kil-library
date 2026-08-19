# file: schemas/interaction_schema.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# --- Input Schema (Frontend se aayega) ---
class ProgressUpdate(BaseModel):
    book_id: int
    page_no: int
    total_pages: Optional[int] = 0

class BookmarkUpdate(BaseModel):
    book_id: int
    is_bookmarked: bool

# --- Response Schema (Frontend ko jayega) ---
class InteractionResponse(BaseModel):
    book_id: int
    last_page_read: int
    total_pages: int
    is_bookmarked: bool
    updated_at: datetime

    class Config:
        from_attributes = True