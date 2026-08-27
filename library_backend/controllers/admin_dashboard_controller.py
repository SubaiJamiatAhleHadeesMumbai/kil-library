from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
import calendar

from database import get_db
from models.book_model import Book
from models.user_model import User
from models.request_model import BookRequest
from models.issue_model import Issue
from models.log_model import Log
from schemas.admin_dashboard_schema import AdminDashboardResponse
from auth import require_permission

router = APIRouter()

@router.get("/dashboard", response_model=AdminDashboardResponse, dependencies=[Depends(require_permission("LOG_VIEW"))])
def get_dashboard_stats(db: Session = Depends(get_db)):
    # Stats
    total_books = db.query(func.count(Book.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.status == "Active").scalar() or 0
    pending_requests = db.query(func.count(BookRequest.id)).filter(BookRequest.status == "Pending").scalar() or 0
    books_on_loan = db.query(func.count(Issue.id)).filter(Issue.status == "Issued").scalar() or 0

    # Monthly Growth Chart
    current_year = datetime.now().year
    monthly_data = (
        db.query(
            func.extract('month', Book.created_at).label('month'),
            func.count(Book.id).label('count')
        )
        .filter(func.extract('year', Book.created_at) == current_year)
        .group_by(func.extract('month', Book.created_at))
        .all()
    )

    monthly_dict = {int(m.month): m.count for m in monthly_data if m.month}
    
    monthly_growth = []
    for month_num in range(1, 13):
        month_name = calendar.month_abbr[month_num]
        monthly_growth.append({
            "month": month_name,
            "books": monthly_dict.get(month_num, 0)
        })

    # Request Breakdown
    approved_reqs = db.query(func.count(BookRequest.id)).filter(BookRequest.status == "Approved").scalar() or 0
    pending_reqs = db.query(func.count(BookRequest.id)).filter(BookRequest.status == "Pending").scalar() or 0
    rejected_reqs = db.query(func.count(BookRequest.id)).filter(BookRequest.status == "Rejected").scalar() or 0

    request_breakdown = [
        {"name": "Approved", "value": approved_reqs, "color": "#10B981"},
        {"name": "Pending", "value": pending_reqs, "color": "#F59E0B"},
        {"name": "Rejected", "value": rejected_reqs, "color": "#EF4444"}
    ]

    # Recent Logs
    recent_logs_query = (
        db.query(Log)
        .order_by(Log.id.desc())
        .limit(5)
        .all()
    )

    recent_logs = []
    for log in recent_logs_query:
        user_name = None
        if log.action_by:
            user_name = log.action_by.full_name or log.action_by.username
        elif log.user:
            user_name = log.user.full_name or log.user.username
            
        recent_logs.append({
            "id": log.id,
            "action": log.action_type,
            "timestamp": log.timestamp,
            "user": user_name
        })

    return {
        "stats": {
            "total_books": total_books,
            "active_users": active_users,
            "pending_requests": pending_requests,
            "books_on_loan": books_on_loan
        },
        "charts": {
            "monthly_growth": monthly_growth,
            "request_breakdown": request_breakdown
        },
        "recent_logs": recent_logs,
        "generated_at": datetime.now(timezone.utc)
    }
