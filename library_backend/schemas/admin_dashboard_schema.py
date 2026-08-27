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
    timestamp: datetime
    user: Optional[str] = None

class AdminDashboardResponse(BaseModel):
    stats: DashboardStats
    charts: DashboardCharts
    recent_logs: List[RecentLog]
    generated_at: datetime
