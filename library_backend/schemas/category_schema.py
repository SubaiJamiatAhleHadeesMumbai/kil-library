# file: schemas/category_schema.py
from pydantic import BaseModel, Field
from typing import Optional

class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100, example="Science Fiction")
    description: Optional[str] = Field(None, example="Books about futuristic science and technology...")

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    class Config:
        from_attributes = True