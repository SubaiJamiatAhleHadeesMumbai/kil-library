from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class DashboardStats(BaseModel):
    total_books: int
    active_users: int
    pending_requests: int
    books_on_loan: int

class MonthlyGrowthChart(BaseModel):
    month: str
    books: int

class RequestBreakdownChart(BaseModel):
    name: str
    value: int
    color: str

class DashboardCharts(BaseModel):
    monthly_growth: List[MonthlyGrowthChart]
    request_breakdown: List[RequestBreakdownChart]

class RecentLog(BaseModel):
    id: int
    action: str
    action_type: Optional[str] = None
    description: Optional[str] = None
    timestamp: datetime
    user: Optional[str] = None

class AnalyticsItem(BaseModel):
    label: str
    value: int
    meta: Optional[str] = None

class AnalyticsSummary(BaseModel):
    total_visits: int = 0
    unique_visitors: int = 0
    book_read_events: int = 0
    unique_books_read: int = 0
    top_paths: List[AnalyticsItem] = []
    top_books: List[AnalyticsItem] = []
    generated_at: Optional[datetime] = None

class AdminDashboardResponse(BaseModel):
    stats: DashboardStats
    charts: DashboardCharts
    recent_logs: List[RecentLog]
    generated_at: datetime
    analytics: Optional[AnalyticsSummary] = None
