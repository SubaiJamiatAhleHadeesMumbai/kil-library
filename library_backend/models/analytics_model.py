# models/analytics_model.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, Float, Text
from sqlalchemy.orm import relationship
from database import Base


class BookReadingSession(Base):
    __tablename__ = "book_reading_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    session_id = Column(String(100), index=True, nullable=False)

    # Visitor Details (Member or Guest)
    user_id = Column(Integer, nullable=True, index=True)
    visitor_id = Column(String(100), index=True, nullable=False)
    visitor_name = Column(String(255), default="Guest Reader", nullable=False)
    is_guest = Column(Integer, default=1, nullable=False)  # 1 = Guest, 0 = Logged-in

    # Book Details
    book_id = Column(Integer, nullable=True, index=True)
    book_title = Column(String(300), nullable=True)
    book_category = Column(String(150), nullable=True)

    # Geo Location
    ip_address = Column(String(60), nullable=True)
    country = Column(String(100), default="India", nullable=True)
    country_code = Column(String(10), default="IN", nullable=True)
    region = Column(String(100), default="Maharashtra", nullable=True)
    city = Column(String(100), default="Mumbai", nullable=True, index=True)

    # Device & Technical
    device_type = Column(String(50), default="desktop", nullable=True)  # mobile, tablet, desktop
    browser = Column(String(100), default="Unknown", nullable=True)
    user_agent = Column(Text, nullable=True)

    # Reading Duration & Depth
    start_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_heartbeat = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    duration_seconds = Column(Integer, default=0, nullable=False)
    last_page = Column(Integer, default=1, nullable=False)
    total_pages = Column(Integer, default=0, nullable=False)

    # Day of the week for quick aggregation
    day_of_week = Column(String(20), nullable=True, index=True)  # Monday, Tuesday, etc.

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "visitor_id": self.visitor_id,
            "visitor_name": self.visitor_name,
            "is_guest": bool(self.is_guest),
            "book_id": self.book_id,
            "book_title": self.book_title or "Untitled Book",
            "book_category": self.book_category or "General",
            "ip_address": self.ip_address,
            "country": self.country,
            "country_code": self.country_code,
            "region": self.region,
            "city": self.city,
            "device_type": self.device_type,
            "browser": self.browser,
            "duration_seconds": self.duration_seconds,
            "duration_minutes": round(self.duration_seconds / 60, 1),
            "last_page": self.last_page,
            "total_pages": self.total_pages,
            "completion_pct": round((self.last_page / self.total_pages * 100), 1) if self.total_pages > 0 else 0,
            "day_of_week": self.day_of_week,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
        }


class PostViewSession(Base):
    __tablename__ = "post_view_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    post_id = Column(String(100), index=True, nullable=False)
    post_title = Column(String(300), nullable=True)
    visitor_id = Column(String(100), index=True, nullable=False)
    ip_address = Column(String(60), nullable=True)
    country = Column(String(100), default="India", nullable=True)
    city = Column(String(100), default="Mumbai", nullable=True)
    device_type = Column(String(50), default="desktop", nullable=True)
    day_of_week = Column(String(20), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "post_id": self.post_id,
            "post_title": self.post_title,
            "country": self.country,
            "city": self.city,
            "device_type": self.device_type,
            "day_of_week": self.day_of_week,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SiteVisit(Base):
    __tablename__ = "site_visits"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    visitor_id = Column(String(100), index=True, nullable=True)
    ip_address = Column(String(60), nullable=True)
    path = Column(String(255), nullable=True)
    country = Column(String(100), default="India", nullable=True)
    city = Column(String(100), default="Mumbai", nullable=True)
    device_type = Column(String(50), default="desktop", nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
