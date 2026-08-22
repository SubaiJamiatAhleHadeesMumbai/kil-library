# file: schemas/book_schema.py
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Union, Any
from datetime import date, datetime

# --- Import Dependent Schemas ---
from .language_schema import Language as LanguageSchema
from .subcategory_schema import Subcategory as SubcategorySchema 

# ==============================================================================
# 🟢 1. BASE SCHEMA (Shared Fields)
# ==============================================================================
class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    author: Optional[str] = Field(None, max_length=255)
    publisher: Optional[str] = Field(None, max_length=255)
    publication_year: Optional[int] = Field(None, gt=0, lt=9999)
    isbn: Optional[str] = Field(None, max_length=20)
    is_digital: bool = Field(False)
    description: Optional[str] = None
    language_id: int = Field(...) 
    is_restricted: bool = Field(False)
    fatawa_category_id: Optional[int] = None
    
    # Additional Fields
    serial_number: Optional[str] = Field(None, max_length=100)
    book_number: Optional[str] = Field(None, max_length=100)
    parts_or_volumes: Optional[str] = Field(None, max_length=100)
    page_count: Optional[int] = Field(None, gt=0)
    pages: Optional[int] = Field(None, gt=0)
    subject_number: Optional[str] = Field(None, max_length=100)
    translator: Optional[str] = Field(None, max_length=255)
    price: Optional[float] = Field(None, ge=0)
    date_of_purchase: Optional[date] = None
    edition: Optional[str] = Field(None, max_length=100)
    remarks: Optional[str] = None
    total_copies: Optional[int] = Field(1, ge=0)
    extra_data: Optional[str] = None  # Admin-only extra metadata / unmatched columns JSON

    # Images
    cover_image: Optional[str] = None 
    cover_image_url: Optional[str] = None
    
    # PDFs
    pdf_url: Optional[str] = None
    pdf_file: Optional[str] = None

    # ✅ NEW: Text File Fields (Added Here)
    txt_file_url: Optional[str] = None
    txt_file: Optional[str] = None

# ==============================================================================
# 🟡 2. CREATE SCHEMA (Input)
# ==============================================================================
class BookCreate(BookBase):
    subcategory_ids: List[int] = [] 

# ==============================================================================
# 🟠 3. UPDATE SCHEMA (Input)
# ==============================================================================
class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    author: Optional[str] = Field(None, max_length=255)
    publisher: Optional[str] = Field(None, max_length=255)
    publication_year: Optional[int] = Field(None, gt=0, lt=9999)
    isbn: Optional[str] = Field(None, max_length=20)
    is_digital: Optional[bool] = None
    description: Optional[str] = None
    language_id: Optional[int] = None
    is_restricted: Optional[bool] = None
    fatawa_category_id: Optional[int] = None
    
    serial_number: Optional[str] = Field(None, max_length=100)
    book_number: Optional[str] = Field(None, max_length=100)
    parts_or_volumes: Optional[str] = Field(None, max_length=100)
    page_count: Optional[int] = Field(None, gt=0)
    pages: Optional[int] = Field(None, gt=0)
    subject_number: Optional[str] = Field(None, max_length=100)
    translator: Optional[str] = Field(None, max_length=255)
    price: Optional[float] = Field(None, ge=0)
    date_of_purchase: Optional[date] = None
    edition: Optional[str] = Field(None, max_length=100)
    remarks: Optional[str] = None
    total_copies: Optional[int] = Field(None, ge=0)
    extra_data: Optional[str] = None  # Admin-only extra metadata JSON
    
    subcategory_ids: Optional[List[int]] = None
    
    # Files update support
    cover_image: Optional[str] = None
    cover_image_url: Optional[str] = None
    pdf_url: Optional[str] = None
    pdf_file: Optional[str] = None
    
    # ✅ NEW: Text File Update Support
    txt_file_url: Optional[str] = None
    txt_file: Optional[str] = None

# ==============================================================================
# 🔵 4. RESPONSE SCHEMA (Output)
# ==============================================================================
class Book(BookBase):
    id: int
    is_approved: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    user_has_access: bool = False 

    # Nested Relationships
    language: Optional[LanguageSchema] = None
    subcategories: List[SubcategorySchema] = []

    # ✅ SMART VALIDATOR UPDATE
    @model_validator(mode='after')
    def sync_file_urls(self):
        # Sync Cover Image
        if self.cover_image and not self.cover_image_url:
            self.cover_image_url = self.cover_image
        elif self.cover_image_url and not self.cover_image:
            self.cover_image = self.cover_image_url

        # Sync PDF
        if self.pdf_file and not self.pdf_url:
            self.pdf_url = self.pdf_file
        elif self.pdf_url and not self.pdf_file:
            self.pdf_file = self.pdf_url
            
        # ✅ Sync Text File (New Logic)
        if self.txt_file and not self.txt_file_url:
            self.txt_file_url = self.txt_file
        elif self.txt_file_url and not self.txt_file:
            self.txt_file = self.txt_file_url
            
        return self

    class Config:
        from_attributes = True


# ==============================================================================
# 🟣 5. STAGED / IMPORTED BOOKS SCHEMAS (Persistent Storage)
# ==============================================================================
class StagedBookBase(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    translator: Optional[str] = None
    serial_number: Optional[str] = None
    book_number: Optional[str] = None
    language_name: Optional[str] = None
    page_count: Optional[Union[int, str]] = None
    publication_year: Optional[Union[int, str]] = None
    edition: Optional[str] = None
    parts_or_volumes: Optional[str] = None
    subject_number: Optional[str] = None
    quantity: Optional[Union[int, str]] = 1
    price: Optional[Union[float, int, str]] = None
    description: Optional[str] = None
    remarks: Optional[str] = None
    extra_data: Optional[str] = None  # JSON string of unmatched / extra admin metadata
    raw_data: Optional[str] = None  # JSON string containing all original columns
    status: Optional[str] = "PENDING"
    file_name: Optional[str] = None

class StagedBookCreate(StagedBookBase):
    pass

class StagedBook(StagedBookBase):
    id: int
    uploaded_by_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class StagedBookBulkCreate(BaseModel):
    file_name: Optional[str] = "Imported Spreadsheet"
    books: List[StagedBookBase]