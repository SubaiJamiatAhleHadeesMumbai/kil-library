import json
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List, Union
from datetime import date, datetime

class NewspaperClippingBase(BaseModel):
    title: str
    newspaper_name: str
    edition_date: Optional[date] = None
    category: str = "General"
    image_url: str
    images: Optional[List[str]] = []
    pdf_url: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

    @field_validator("images", mode="before")
    @classmethod
    def parse_images_json(cls, v: Union[str, List[str], None]):
        if v is None:
            return []
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                return [parsed] if parsed else []
            except Exception:
                return [v] if v.strip() else []
        return []

class NewspaperClippingCreate(NewspaperClippingBase):
    pass

class NewspaperClippingUpdate(BaseModel):
    title: Optional[str] = None
    newspaper_name: Optional[str] = None
    edition_date: Optional[date] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    pdf_url: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class NewspaperClippingResponse(NewspaperClippingBase):
    id: int
    views_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NewspaperClippingListResponse(BaseModel):
    items: List[NewspaperClippingResponse]
    total: int
    page: int
    limit: int
    pages: int
