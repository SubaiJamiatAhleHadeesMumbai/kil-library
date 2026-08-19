from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SiteVisitCreate(BaseModel):
    visitor_id: str
    path: str
    event_type: str = "visit"
    book_id: Optional[int] = None
    referrer: Optional[str] = None
    user_agent: Optional[str] = None


class TopItem(BaseModel):
    label: str
    value: int
    meta: Optional[str] = None


class AnalyticsSummary(BaseModel):
    total_visits: int
    unique_visitors: int
    book_read_events: int
    unique_books_read: int
    top_paths: List[TopItem] = []
    top_books: List[TopItem] = []
    generated_at: datetime
