from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# -----------------------------
# Shared Base Schema
# -----------------------------
class PostBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: Optional[str] = None
    tags: Optional[str] = None

    # media_type allowed values
    media_type: Literal["image", "pdf", "none"] = "none"


# -----------------------------
# Response Schema (Read)
# -----------------------------
class PostResponse(PostBase):
    id: int
    file_url: Optional[str] = None
    created_at: datetime

    # Display author name (Public feed)
    author_name: str = "Markaz Admin"

    class Config:
        from_attributes = True
