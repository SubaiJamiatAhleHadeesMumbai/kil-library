from pydantic import BaseModel
from typing import List, Optional

class BulkBookAction(BaseModel):
    action: str
    book_ids: List[int]

class BulkUserAction(BaseModel):
    action: str
    user_ids: List[int]

class BulkRequestAction(BaseModel):
    action: str
    request_ids: List[int]
    rejection_reason: Optional[str] = None

class BulkActionResponse(BaseModel):
    success: bool
    action: str
    affected_count: int
    message: str
