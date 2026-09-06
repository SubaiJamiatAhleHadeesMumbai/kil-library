from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime


def _slugify(value: str) -> str:
    return "-".join(part for part in "".join(ch.lower() if ch.isalnum() else " " for ch in value).split() if part)


class FatawaCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    slug: Optional[str] = Field(None, max_length=180)
    description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True

    @field_validator("slug", mode="before")
    @classmethod
    def normalize_slug(cls, value, info):
        if value:
            return _slugify(str(value))
        name = info.data.get("name")
        if name:
            return _slugify(str(name))
        return value

    @model_validator(mode="after")
    def ensure_slug(self):
        if not self.slug and self.name:
            self.slug = _slugify(self.name)
        return self


class FatawaCategoryCreate(FatawaCategoryBase):
    pass


class FatawaCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    slug: Optional[str] = Field(None, max_length=180)
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("slug", mode="before")
    @classmethod
    def normalize_slug(cls, value, info):
        if value:
            return _slugify(str(value))
        name = info.data.get("name")
        if name:
            return _slugify(str(name))
        return value

    @model_validator(mode="after")
    def ensure_slug(self):
        if not self.slug and self.name:
            self.slug = _slugify(self.name)
        return self


class FatawaCategory(FatawaCategoryBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FatawaQuestionBase(BaseModel):
    category_id: Optional[int] = None
    question_text: str = Field(..., min_length=5)
    visibility: str = Field(default="public")
    is_anonymous: bool = False
    display_name: Optional[str] = Field(None, max_length=255)
    guest_email: Optional[str] = Field(None, max_length=255)


class FatawaQuestionCreate(FatawaQuestionBase):
    pass


class FatawaQuestionUpdate(BaseModel):
    category_id: Optional[int] = None
    question_text: Optional[str] = Field(None, min_length=5)
    visibility: Optional[str] = None
    is_anonymous: Optional[bool] = None
    display_name: Optional[str] = Field(None, max_length=255)
    guest_email: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = None
    answer_text: Optional[str] = None
    pdf_url: Optional[str] = None
    images: Optional[List[Any]] = None
    verdict_summary: Optional[str] = None
    mufti_name: Optional[str] = None
    darul_ifta_reference_no: Optional[str] = None


class FatawaQuestionAnswer(BaseModel):
    answer_text: Optional[str] = ""
    visibility: Optional[str] = None
    status: Optional[str] = None
    pdf_url: Optional[str] = None
    images: Optional[List[Any]] = None
    verdict_summary: Optional[str] = None
    mufti_name: Optional[str] = None
    darul_ifta_reference_no: Optional[str] = None


class FatawaQuestion(FatawaQuestionBase):
    id: int
    user_id: Optional[int] = None
    answer_text: Optional[str] = None
    status: str
    pdf_url: Optional[str] = None
    images: Optional[List[Any]] = None
    verdict_summary: Optional[str] = None
    mufti_name: Optional[str] = None
    darul_ifta_reference_no: Optional[str] = None
    answered_by_id: Optional[int] = None
    answered_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    category: Optional[FatawaCategory] = None

    class Config:
        from_attributes = True


class PaginatedFatawaResponse(BaseModel):
    items: List[FatawaQuestion]
    total: int
    page: int
    limit: int
    total_pages: int