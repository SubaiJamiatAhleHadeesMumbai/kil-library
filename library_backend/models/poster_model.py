from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from database import Base


class HomepagePoster(Base):
    __tablename__ = "homepage_posters"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)
    translations = Column(JSON, nullable=False, default=dict)

    media_type = Column(String(20), nullable=False, default="image")
    desktop_image_url = Column(String(500), nullable=True)
    mobile_image_url = Column(String(500), nullable=True)
    desktop_image_size = Column(String(100), nullable=True)
    mobile_image_size = Column(String(100), nullable=True)
    desktop_frame_width = Column(Integer, nullable=False, default=1200)
    mobile_frame_width = Column(Integer, nullable=False, default=1080)
    desktop_fit = Column(String(20), nullable=False, default="cover")
    mobile_fit = Column(String(20), nullable=False, default="cover")
    desktop_height = Column(Integer, nullable=False, default=520)
    mobile_height = Column(Integer, nullable=False, default=380)
    caption_alignment = Column(String(20), nullable=False, default="bottom")

    program_name = Column(String(255), nullable=True)
    event_date = Column(String(100), nullable=True)
    location_name = Column(String(255), nullable=True)
    location_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)

    sort_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # ✅ Content Scheduling Fields
    status = Column(String(20), nullable=False, default="published", index=True)  # draft | scheduled | published
    published_at = Column(DateTime, nullable=True)  # When to auto-publish (for scheduled posters)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author = relationship("User", lazy="joined")

    __table_args__ = {"mysql_engine": "InnoDB"}

    def __repr__(self):
        return f"<HomepagePoster id={self.id} title='{self.title}'>"