from typing import List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime

class ImageItem(BaseModel):
    url: str
    caption: Optional[str] = None
    title: Optional[str] = None

class SocialWorkBase(BaseModel):
    category: str = Field(..., description="Category: 'education', 'activities', or 'social_work'")
    title: str = Field(..., min_length=1, max_length=255)
    subtitle: Optional[str] = Field(None, max_length=500)
    content: Optional[str] = None
    event_date: Optional[datetime] = None
    location: Optional[str] = Field(None, max_length=255)
    featured_image: Optional[str] = None
    images: Optional[List[Any]] = Field(default_factory=list)
    tags: Optional[str] = Field(None, max_length=255)
    is_published: bool = True

class SocialWorkCreate(SocialWorkBase):
    pass

class SocialWorkUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    content: Optional[str] = None
    event_date: Optional[datetime] = None
    location: Optional[str] = None
    featured_image: Optional[str] = None
    images: Optional[List[Any]] = None
    tags: Optional[str] = None
    is_published: Optional[bool] = None

class SocialWorkResponse(SocialWorkBase):
    id: int
    author_id: Optional[int] = None
    author_name: Optional[str] = "Markaz Admin"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
