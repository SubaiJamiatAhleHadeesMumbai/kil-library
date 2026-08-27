from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, func
from database import Base

class NewspaperClipping(Base):
    __tablename__ = "newspaper_clippings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True)
    newspaper_name = Column(String(150), nullable=False, index=True)
    edition_date = Column(Date, nullable=True, index=True)
    category = Column(String(100), nullable=False, default="General", index=True)
    image_url = Column(String(500), nullable=False)
    images = Column(Text, nullable=True) # JSON list of image URLs: ["url1", "url2", ...]
    pdf_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    views_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
