from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


class SiteVisit(Base):
    __tablename__ = "site_visits"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    visitor_id = Column(String(100), nullable=False, index=True)
    path = Column(String(255), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, default="visit", index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    referrer = Column(String(512), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    book = relationship("Book", lazy="joined")
    user = relationship("User", lazy="joined")

    __table_args__ = (
        Index("idx_site_visits_visitor_created", "visitor_id", "created_at"),
        Index("idx_site_visits_event_created", "event_type", "created_at"),
    )
