from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class PosterResponse(BaseModel):
    id: int
    title: str
    translations: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    media_type: str = "image"
    desktop_image_url: Optional[str] = None
    mobile_image_url: Optional[str] = None
    desktop_image_size: Optional[str] = None
    mobile_image_size: Optional[str] = None
    desktop_frame_width: int = 1200
    mobile_frame_width: int = 1080
    desktop_fit: str = "cover"
    mobile_fit: str = "cover"
    desktop_height: int = 520
    mobile_height: int = 380
    caption_alignment: str = "bottom"
    program_name: Optional[str] = None
    event_date: Optional[str] = None
    location_name: Optional[str] = None
    location_url: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    author_name: str = "Markaz Admin"

    class Config:
        from_attributes = True