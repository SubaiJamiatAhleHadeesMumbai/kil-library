from fastapi import APIRouter, Depends, HTTPException, status
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
from models.analytics_model import SiteVisit, BookReadingSession
from schemas.admin_dashboard_schema import AdminDashboardResponse
from auth import get_current_user

router = APIRouter()

PUBLIC_ROLES = {
    "user",
    "student",
    "member",
    "public",
    "viewer",
    "registered member / student",
    "registered member",
    "guest",
}

SUPER_ADMIN_ROLES = {
    "admin",
    "superadmin",
    "administrator",
    "super admin",
}

STAFF_ROLES = {
    "manager",
    "editor",
    "librarian",
    "staff",
    "mufti / dar-ul-ifta",
    "head librarian",
    "social & welfare officer",
}

STAFF_PERMISSIONS = {
    "BOOK_MANAGE",
    "BOOK_ISSUE",
    "CATEGORY_MANAGE",
    "LANGUAGE_MANAGE",
    "LOCATION_MANAGE",
    "COPY_MANAGE",
    "FATAWA_MANAGE",
    "SOCIAL_WORK_MANAGE",
    "USER_VIEW",
    "USER_MANAGE",
    "ROLE_VIEW",
    "ROLE_MANAGE",
    "ROLE_PERMISSION_ASSIGN",
    "REQUEST_VIEW",
    "REQUEST_APPROVE",
    "REQUEST_MANAGE",
    "LOG_VIEW",
    "LOGS_VIEW",
    "HOMEPAGE_BRANDING_MANAGE",
    "HOMEPAGE_CONTENT_MANAGE",
    "HOMEPAGE_LAYOUT_MANAGE",
    "HOMEPAGE_VISIBILITY_MANAGE",
    "HOMEPAGE_SEARCH_MANAGE",
}


def _get_role_name(user: User) -> str:
    if user and getattr(user, "role", None) and getattr(user.role, "name", None):
        return user.role.name.strip().lower()
    return ""


def _extract_user_permissions(user: User) -> set[str]:
    perms: set[str] = set()
    if user and getattr(user, "role", None) and getattr(user.role, "permissions", None):
        for p in user.role.permissions:
            code = getattr(p, "code", None)
            name = getattr(p, "name", None)
            if code:
                perms.add(str(code).strip().upper())
            if name:
                perms.add(str(name).strip().upper())
    return perms


def _is_super_admin(user: User) -> bool:
    return _get_role_name(user) in SUPER_ADMIN_ROLES


def _is_staff_or_admin(user: User) -> bool:
    rname = _get_role_name(user)
    if rname in PUBLIC_ROLES:
        return False
    if rname in SUPER_ADMIN_ROLES or rname in STAFF_ROLES:
        return True
    perms = _extract_user_permissions(user)
    return bool(perms & STAFF_PERMISSIONS)


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_staff_or_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Admin access required for dashboard.",
        )

    is_admin = _is_super_admin(current_user)
    perms = _extract_user_permissions(current_user)

    can_view_issues = is_admin or bool(perms & {"BOOK_ISSUE", "COPY_MANAGE", "COPY_VIEW"})
    can_view_users = is_admin or bool(perms & {"USER_VIEW", "USER_MANAGE"})
    can_view_requests = is_admin or bool(perms & {"REQUEST_VIEW", "REQUEST_MANAGE", "REQUEST_APPROVE"})
    can_view_logs = is_admin or bool(perms & {"LOG_VIEW", "LOGS_VIEW"})

    # Stats (scoped by staff permissions)
    total_books = (
        db.query(func.count(Book.id))
        .filter(Book.deleted_at.is_(None))
        .scalar()
        or 0
    )
    active_users = (
        (db.query(func.count(User.id)).filter(User.status == "Active").scalar() or 0)
        if can_view_users
        else 0
    )
    pending_requests = (
        (db.query(func.count(BookRequest.id)).filter(BookRequest.status == "Pending").scalar() or 0)
        if can_view_requests
        else 0
    )
    books_on_loan = (
        (db.query(func.count(Issue.id)).filter(Issue.status == "Issued").scalar() or 0)
        if can_view_issues
        else 0
    )

    # Monthly Growth Chart
    current_year = datetime.now().year
    monthly_data = (
        db.query(
            func.extract('month', Book.created_at).label('month'),
            func.count(Book.id).label('count')
        )
        .filter(
            Book.deleted_at.is_(None),
            Book.created_at.isnot(None),
            func.extract('year', Book.created_at) == current_year,
        )
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
    request_breakdown = []
    if can_view_requests:
        approved_reqs = db.query(func.count(BookRequest.id)).filter(BookRequest.status == "Approved").scalar() or 0
        pending_reqs = db.query(func.count(BookRequest.id)).filter(BookRequest.status == "Pending").scalar() or 0
        rejected_reqs = db.query(func.count(BookRequest.id)).filter(BookRequest.status == "Rejected").scalar() or 0

        request_breakdown = [
            {"name": "Approved", "value": approved_reqs, "color": "#10B981"},
            {"name": "Pending", "value": pending_reqs, "color": "#F59E0B"},
            {"name": "Rejected", "value": rejected_reqs, "color": "#EF4444"}
        ]

    # Recent Logs (only for users with LOG_VIEW / LOGS_VIEW or Admin)
    recent_logs = []
    if can_view_logs:
        try:
            recent_logs_query = (
                db.query(Log)
                .order_by(Log.id.desc())
                .limit(5)
                .all()
            )

            for log in recent_logs_query:
                user_name = None
                if log.action_by:
                    user_name = log.action_by.full_name or log.action_by.username
                elif log.user:
                    user_name = log.user.full_name or log.user.username

                recent_logs.append({
                    "id": log.id,
                    "action": log.action_type,
                    "action_type": log.action_type,
                    "description": log.description or log.action_type,
                    "timestamp": log.timestamp,
                    "user": user_name
                })
        except Exception:
            db.rollback()
            recent_logs = []

    # Platform Analytics (only for users with LOG_VIEW / LOGS_VIEW or Admin)
    analytics_summary = None
    if can_view_logs:
        try:
            total_visits = db.query(func.count(SiteVisit.id)).scalar() or 0
            unique_visitors = db.query(func.count(func.distinct(SiteVisit.visitor_id))).scalar() or 0
            book_read_events = db.query(func.count(BookReadingSession.id)).scalar() or 0
            unique_books_read = db.query(func.count(func.distinct(BookReadingSession.book_id))).scalar() or 0

            top_paths_query = (
                db.query(SiteVisit.path.label('label'), func.count(SiteVisit.id).label('value'))
                .filter(SiteVisit.path.isnot(None), SiteVisit.path != '')
                .group_by(SiteVisit.path)
                .order_by(func.count(SiteVisit.id).desc())
                .limit(5)
                .all()
            )
            top_paths = [{"label": p.label or "/", "value": p.value} for p in top_paths_query]

            top_books_query = (
                db.query(
                    BookReadingSession.book_title.label('label'),
                    func.count(BookReadingSession.id).label('value'),
                    func.max(BookReadingSession.book_category).label('meta')
                )
                .filter(BookReadingSession.book_title.isnot(None))
                .group_by(BookReadingSession.book_title)
                .order_by(func.count(BookReadingSession.id).desc())
                .limit(5)
                .all()
            )
            top_books = [
                {
                    "label": b.label or "Unknown Book",
                    "value": b.value,
                    "meta": f"{b.meta or 'Library Book'} • {b.value} reads"
                }
                for b in top_books_query
            ]

            analytics_summary = {
                "total_visits": total_visits,
                "unique_visitors": unique_visitors,
                "book_read_events": book_read_events,
                "unique_books_read": unique_books_read,
                "top_paths": top_paths,
                "top_books": top_books,
                "generated_at": datetime.now(timezone.utc)
            }
        except Exception:
            db.rollback()
            analytics_summary = None

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
        "analytics": analytics_summary,
        "generated_at": datetime.now(timezone.utc)
    }
