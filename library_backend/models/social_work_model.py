from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base

class SocialWorkItem(Base):
    __tablename__ = "social_work_items"

    id = Column(Integer, primary_key=True, index=True)
    
    # Category: "education", "activities", "social_work"
    category = Column(String(50), nullable=False, index=True, default="social_work")
    
    title = Column(String(255), nullable=False)
    subtitle = Column(String(500), nullable=True)
    content = Column(Text, nullable=True)
    
    # Event or Publication Date
    event_date = Column(DateTime, nullable=True, default=datetime.utcnow)
    location = Column(String(255), nullable=True)
    
    # Featured image URL and List of gallery images: [{"url": "...", "caption": "..."}]
    featured_image = Column(String(500), nullable=True)
    images = Column(JSON, nullable=True, default=list)
    
    # Tags / Badges
    tags = Column(String(255), nullable=True)
    
    # Status
    is_published = Column(Boolean, default=True, nullable=False, index=True)
    
    # Author link
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author = relationship("User", lazy="joined")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = {"mysql_engine": "InnoDB"}

    def __repr__(self):
        return f"<SocialWorkItem id={self.id} category='{self.category}' title='{self.title}'>"
