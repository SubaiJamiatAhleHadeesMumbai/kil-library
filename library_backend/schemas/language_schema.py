# file: schemas/language_schema.py
from pydantic import BaseModel, Field
from typing import Optional

class LanguageBase(BaseModel):
    # Model 'name' attribute se match karega
    name: str = Field(..., max_length=100, example="English")
    description: Optional[str] = None

class LanguageCreate(LanguageBase):
    pass

class Language(LanguageBase):
    # Model 'id' attribute se match karega
    id: int

    class Config:
        from_attributes = True