from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BookOrderCreate(BaseModel):
    book_id: int
    buyer_name: str = Field(..., min_length=2, max_length=255)
    buyer_email: str = Field(..., min_length=5, max_length=255)
    buyer_phone: Optional[str] = Field(None, max_length=50)
    transaction_ref: Optional[str] = Field(None, max_length=100)
    screenshot_url: Optional[str] = None
    notes: Optional[str] = None

class BookOrderResponse(BaseModel):
    id: int
    order_code: str
    book_id: int
    user_id: Optional[int] = None
    buyer_name: str
    buyer_email: str
    buyer_phone: Optional[str] = None
    amount: float
    payment_method: str
    transaction_ref: Optional[str] = None
    screenshot_url: Optional[str] = None
    notes: Optional[str] = None
    status: str
    admin_remarks: Optional[str] = None
    download_token: Optional[str] = None
    download_expires_at: Optional[datetime] = None
    download_count: int = 0
    max_downloads: int = 5
    created_at: datetime
    updated_at: Optional[datetime] = None
    book_title: Optional[str] = None
    cover_image_url: Optional[str] = None

    class Config:
        from_attributes = True

class BookOrderApproval(BaseModel):
    status: str = Field(..., pattern="^(APPROVED|REJECTED|PENDING)$")
    admin_remarks: Optional[str] = None
    expiry_hours: Optional[int] = Field(48, ge=1, le=720)
    max_downloads: Optional[int] = Field(5, ge=1, le=100)
