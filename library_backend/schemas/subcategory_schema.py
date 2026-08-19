# file: schemas/subcategory_schema.py
from pydantic import BaseModel, Field
from typing import Optional
from .category_schema import Category 

class SubcategoryBase(BaseModel):
    name: str = Field(..., max_length=100, example="Python Programming")
    description: Optional[str] = Field(None, example="Books related to the Python language.")
    category_id: int = Field(..., example=1)

class SubcategoryCreate(SubcategoryBase):
    pass

class Subcategory(SubcategoryBase):
    id: int
    class Config:
        from_attributes = True

class SubcategoryWithCategory(Subcategory):
    category: Category
    class Config:
        from_attributes = True