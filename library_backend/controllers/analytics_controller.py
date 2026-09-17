# controllers/analytics_controller.py
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from database import get_db
from models import user_model, book_model
from models.analytics_model import BookReadingSession, PostViewSession, SiteVisit
from utils.geo_helper import extract_client_ip, resolve_geo_location, parse_device_info
from auth import get_current_user

router = APIRouter(prefix="", tags=["Analytics"])


def _require_admin(user: user_model.User = Depends(get_current_user)):
    if not user or not getattr(user, "role", None):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    role_name = (user.role.name or "").strip().lower()
    if role_name in ["admin", "superadmin", "administrator", "super_admin", "social & welfare officer", "head librarian", "librarian", "editor", "manager"]:
        return user
    user_perms = {p.name for p in user.role.permissions if getattr(p, "name", None)}
    if user_perms & {"DASHBOARD_VIEW", "REPORT_VIEW", "BOOK_MANAGE", "HOMEPAGE_CONTENT_MANAGE"}:
        return user
    raise HTTPException(status_code=403, detail="Admin privileges required")


# Schemas
class TrackVisitPayload(BaseModel):
    visitor_id: Optional[str] = "anon"
    path: Optional[str] = "/"
    event_type: Optional[str] = "visit"
    book_id: Optional[int] = None
    referrer: Optional[str] = None
    user_agent: Optional[str] = None


class ReadingHeartbeatPayload(BaseModel):
    session_id: str
    visitor_id: str
    book_id: int
    page_no: int = 1
    total_pages: int = 0
    duration_increment_seconds: int = 30
    device_type: Optional[str] = None


class PostViewPayload(BaseModel):
    post_id: str
    post_title: str
    visitor_id: str


@router.post("/track")
def track_site_visit(payload: TrackVisitPayload, request: Request, db: Session = Depends(get_db)):
    """
    Tracks page navigation and visits from the global AnalyticsTracker component.
    """
    ip = extract_client_ip(request)
    geo = resolve_geo_location(ip)
    device = parse_device_info(payload.user_agent or request.headers.get("user-agent", ""))

    visit = SiteVisit(
        visitor_id=payload.visitor_id or "anon",
        ip_address=ip,
        path=payload.path or "/",
        country=geo.get("country") or "India",
        city=geo.get("city") or "Mumbai",
        device_type=device,
    )
    db.add(visit)
    try:
        db.commit()
    except Exception:
        db.rollback()
    return {"status": "ok"}


@router.get("/summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    total_sessions = db.query(func.count(BookReadingSession.id)).scalar() or 0
    total_posts = db.query(func.count(PostViewSession.id)).scalar() or 0
    total_visits = db.query(func.count(SiteVisit.id)).scalar() or 0
    return {
        "status": "ok",
        "total_reading_sessions": total_sessions,
        "total_post_views": total_posts,
        "total_site_visits": total_visits
    }


@router.post("/reading/ping")
@router.post("/reading/exit")
def log_or_update_reading_session(
    payload: ReadingHeartbeatPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Heartbeat ping & exit beacon sent by SmartReader.
    Lightweight, fast, and works seamlessly for both Members and Anonymous Guests.
    """
    now = datetime.utcnow()
    day_name = now.strftime("%A")  # Monday, Tuesday, etc.

    try:
        # 1. Check if session already exists
        session = db.query(BookReadingSession).filter(
            BookReadingSession.session_id == payload.session_id
        ).first()

        if session:
            # Increment reading time and update progress
            session.duration_seconds += max(0, min(payload.duration_increment_seconds, 120))
            if payload.page_no > session.last_page:
                session.last_page = payload.page_no
            if payload.total_pages > 0:
                session.total_pages = payload.total_pages
            session.last_heartbeat = now
            db.commit()
            return {"status": "ok", "session_id": session.session_id, "duration": session.duration_seconds}

        # 2. If new session, resolve visitor, book, and geo details
        ip = extract_client_ip(request)
        geo = resolve_geo_location(request, ip)
        dev = parse_device_info(request.headers.get("user-agent", ""))

        # Look up book details safely
        book = None
        if payload.book_id:
            try:
                book = db.query(book_model.Book).filter(
                    book_model.Book.id == payload.book_id
                ).first()
            except Exception:
                db.rollback()

        book_title = book.title if book else f"Book #{payload.book_id}"
        book_category = ""
        if book and getattr(book, "category", None):
            book_category = book.category.name if hasattr(book.category, "name") else str(book.category)

        # Check optional logged-in user from authorization header
        user_id = None
        visitor_name = f"Guest Reader #{payload.visitor_id[-4:]}"
        is_guest = 1

        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                from auth import decode_token
                decoded = decode_token(token)
                if decoded and decoded.get("sub"):
                    logged_user = db.query(user_model.User).filter(user_model.User.username == decoded["sub"]).first()
                    if logged_user:
                        user_id = logged_user.id
                        visitor_name = logged_user.full_name or logged_user.username
                        is_guest = 0
            except Exception:
                pass

        new_session = BookReadingSession(
            session_id=payload.session_id,
            user_id=user_id,
            visitor_id=payload.visitor_id,
            visitor_name=visitor_name,
            is_guest=is_guest,
            book_id=payload.book_id,
            book_title=book_title,
            book_category=book_category,
            ip_address=ip,
            country=geo.get("country", "India"),
            country_code=geo.get("country_code", "IN"),
            region=geo.get("region", "Maharashtra"),
            city=geo.get("city", "Mumbai"),
            device_type=payload.device_type or dev.get("device_type", "desktop"),
            browser=dev.get("browser", "Web Browser"),
            user_agent=request.headers.get("user-agent", "")[:500],
            start_time=now,
            last_heartbeat=now,
            duration_seconds=max(5, payload.duration_increment_seconds),
            last_page=max(1, payload.page_no),
            total_pages=max(0, payload.total_pages),
            day_of_week=day_name,
        )

        db.add(new_session)
        db.commit()
        return {"status": "created", "session_id": new_session.session_id}
    except Exception as err:
        db.rollback()
        return {"status": "ok", "notice": str(err)[:100]}


@router.post("/post/view")
def log_post_view(
    payload: PostViewPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Log visitor view on homepage posts or announcements.
    """
    try:
        ip = extract_client_ip(request)
        geo = resolve_geo_location(request, ip)
        dev = parse_device_info(request.headers.get("user-agent", ""))
        now = datetime.utcnow()

        post_view = PostViewSession(
            post_id=payload.post_id,
            post_title=payload.post_title,
            visitor_id=payload.visitor_id,
            ip_address=ip,
            country=geo.get("country", "India"),
            city=geo.get("city", "Mumbai"),
            device_type=dev.get("device_type", "desktop"),
            day_of_week=now.strftime("%A"),
        )
        db.add(post_view)
        db.commit()
        return {"status": "ok"}
    except Exception as e:
        db.rollback()
        return {"status": "ok", "notice": str(e)[:100]}


@router.get("/dashboard")
def get_analytics_dashboard(
    timeframe: str = Query("7days", pattern="^(today|7days|30days|all)$"),
    book_id: Optional[int] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user=Depends(_require_admin)
):
    """
    Master Analytics API for Admin:
    Answers:
    1. Who is reading what and from where?
    2. Which day has maximum visitors (Friday vs Sunday)?
    3. Peak traffic hours?
    4. Top books leaderboard?
    """
    now = datetime.utcnow()
    query = db.query(BookReadingSession)

    if timeframe == "today":
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(BookReadingSession.created_at >= today_start)
    elif timeframe == "7days":
        query = query.filter(BookReadingSession.created_at >= now - timedelta(days=7))
    elif timeframe == "30days":
        query = query.filter(BookReadingSession.created_at >= now - timedelta(days=30))

    if book_id:
        query = query.filter(BookReadingSession.book_id == book_id)
    if city and city != "all":
        query = query.filter(BookReadingSession.city == city)

    all_sessions = query.all()

    # Active Live Readers in last 5 minutes
    active_cutoff = now - timedelta(minutes=5)
    active_now_count = db.query(BookReadingSession).filter(
        BookReadingSession.last_heartbeat >= active_cutoff
    ).count()

    total_sessions = len(all_sessions)
    unique_visitors = len(set(s.visitor_id for s in all_sessions))
    total_duration_seconds = sum(s.duration_seconds for s in all_sessions)
    total_reading_hours = round(total_duration_seconds / 3600, 1)

    # 1. Day of Week Breakdown
    day_counts = {
        "Monday": 0, "Tuesday": 0, "Wednesday": 0,
        "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0
    }
    day_hours = {d: 0.0 for d in day_counts}

    for s in all_sessions:
        d = s.day_of_week or (s.created_at.strftime("%A") if s.created_at else "Friday")
        if d in day_counts:
            day_counts[d] += 1
            day_hours[d] += round(s.duration_seconds / 3600, 2)

    ordered_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_wise_trends = [
        {"day": d, "visitors": day_counts[d], "read_hours": round(day_hours[d], 1)}
        for d in ordered_days
    ]

    # Find peak day
    peak_day = max(day_counts.items(), key=lambda x: x[1])[0] if day_counts else "Friday"

    # 2. Top Books Leaderboard
    book_stats = {}
    for s in all_sessions:
        bid = s.book_id
        if bid not in book_stats:
            book_stats[bid] = {
                "book_id": bid,
                "title": s.book_title or f"Book #{bid}",
                "category": s.book_category or "General",
                "readers_count": 0,
                "total_seconds": 0,
                "last_page_sum": 0,
                "total_page_sum": 0,
                "cities": {},
            }
        book_stats[bid]["readers_count"] += 1
        book_stats[bid]["total_seconds"] += s.duration_seconds
        book_stats[bid]["last_page_sum"] += s.last_page
        book_stats[bid]["total_page_sum"] += s.total_pages or s.last_page
        c = s.city or "Mumbai"
        book_stats[bid]["cities"][c] = book_stats[bid]["cities"].get(c, 0) + 1

    top_books = []
    for bid, st in book_stats.items():
        top_city = max(st["cities"].items(), key=lambda x: x[1])[0] if st["cities"] else "Mumbai"
        avg_completion = round((st["last_page_sum"] / max(1, st["total_page_sum"])) * 100, 1)
        top_books.append({
            "book_id": bid,
            "title": st["title"],
            "category": st["category"],
            "visitors": st["readers_count"],
            "read_hours": round(st["total_seconds"] / 3600, 1),
            "avg_completion_pct": min(100.0, avg_completion),
            "top_city": top_city,
        })
    top_books.sort(key=lambda x: x["visitors"], reverse=True)
    top_books = top_books[:10]

    # 3. Top Locations Breakdown
    location_counts = {}
    for s in all_sessions:
        loc_key = f"{s.city or 'Mumbai'}, {s.country or 'India'}"
        location_counts[loc_key] = location_counts.get(loc_key, {
            "city": s.city or "Mumbai",
            "country": s.country or "India",
            "country_code": s.country_code or "IN",
            "count": 0,
        })
        location_counts[loc_key]["count"] += 1

    top_locations = list(location_counts.values())
    top_locations.sort(key=lambda x: x["count"], reverse=True)
    top_locations = top_locations[:10]

    # 4. Device Breakdown
    device_counts = {"mobile": 0, "desktop": 0, "tablet": 0}
    for s in all_sessions:
        dev = (s.device_type or "desktop").lower()
        if dev in device_counts:
            device_counts[dev] += 1
        else:
            device_counts["desktop"] += 1

    # 5. Live Feed (Last 25 Recent Sessions)
    recent_records = (
        db.query(BookReadingSession)
        .order_by(desc(BookReadingSession.last_heartbeat))
        .limit(25)
        .all()
    )

    return {
        "summary": {
            "total_readers": unique_visitors,
            "total_sessions": total_sessions,
            "active_now": active_now_count,
            "total_reading_hours": total_reading_hours,
            "peak_day": peak_day,
            "top_city": top_locations[0]["city"] if top_locations else "Mumbai",
        },
        "day_wise_trends": day_wise_trends,
        "top_books": top_books,
        "top_locations": top_locations,
        "device_breakdown": device_counts,
        "recent_sessions": [r.to_dict() for r in recent_records],
    }
