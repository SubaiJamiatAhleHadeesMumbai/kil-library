from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from auth import get_db, get_current_user_optional, require_permission
from models import analytics_model, book_model, user_model
from schemas import analytics_schema

router = APIRouter()


@router.post("/track", tags=["Analytics"])
def track_site_visit(
    payload: analytics_schema.SiteVisitCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: user_model.User | None = Depends(get_current_user_optional),
):
    event = analytics_model.SiteVisit(
        visitor_id=payload.visitor_id,
        path=payload.path,
        event_type=payload.event_type or "visit",
        book_id=payload.book_id,
        user_id=current_user.id if current_user else None,
        referrer=payload.referrer,
        user_agent=payload.user_agent or request.headers.get("user-agent"),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return {"ok": True, "id": event.id}


@router.get("/summary", tags=["Analytics"], dependencies=[Depends(require_permission("LOG_VIEW"))])
def get_analytics_summary(db: Session = Depends(get_db)):
    total_visits = db.query(func.count(analytics_model.SiteVisit.id)).scalar() or 0
    unique_visitors = db.query(func.count(func.distinct(analytics_model.SiteVisit.visitor_id))).scalar() or 0
    book_read_events = db.query(func.count(analytics_model.SiteVisit.id)).filter(
        analytics_model.SiteVisit.event_type == "book_read"
    ).scalar() or 0
    unique_books_read = db.query(func.count(func.distinct(analytics_model.SiteVisit.book_id))).filter(
        analytics_model.SiteVisit.book_id.isnot(None),
        analytics_model.SiteVisit.event_type == "book_read",
    ).scalar() or 0

    top_paths_query = (
        db.query(
            analytics_model.SiteVisit.path.label("path"),
            func.count(analytics_model.SiteVisit.id).label("cnt"),
        )
        .group_by(analytics_model.SiteVisit.path)
        .order_by(func.count(analytics_model.SiteVisit.id).desc())
        .limit(5)
        .all()
    )

    top_books_query = (
        db.query(
            book_model.Book.id.label("book_id"),
            book_model.Book.title.label("title"),
            book_model.Book.author.label("author"),
            func.count(analytics_model.SiteVisit.id).label("cnt"),
        )
        .join(book_model.Book, analytics_model.SiteVisit.book_id == book_model.Book.id)
        .filter(analytics_model.SiteVisit.event_type == "book_read")
        .group_by(book_model.Book.id, book_model.Book.title, book_model.Book.author)
        .order_by(func.count(analytics_model.SiteVisit.id).desc())
        .limit(5)
        .all()
    )

    return {
        "total_visits": int(total_visits),
        "unique_visitors": int(unique_visitors),
        "book_read_events": int(book_read_events),
        "unique_books_read": int(unique_books_read),
        "top_paths": [
            {"label": row.path, "value": int(row.cnt), "meta": "page visits"}
            for row in top_paths_query
        ],
        "top_books": [
            {
                "label": row.title,
                "value": int(row.cnt),
                "meta": row.author or "Unknown Author",
            }
            for row in top_books_query
        ],
        "generated_at": datetime.now(timezone.utc),
    }
