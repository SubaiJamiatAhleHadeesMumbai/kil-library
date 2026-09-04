# models/gallery_model.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class GalleryAlbum(Base):
    __tablename__ = "gallery_albums"

    id = Column(String(100), primary_key=True, index=True)
    title_en = Column(String(255), nullable=True)
    title_ur = Column(String(255), nullable=True)
    title_ar = Column(String(255), nullable=True)
    description_en = Column(Text, nullable=True)
    description_ur = Column(Text, nullable=True)
    description_ar = Column(Text, nullable=True)
    year = Column(String(20), default="2026", nullable=True)
    cover_image = Column(Text, default="", nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    items = relationship("GalleryItem", back_populates="album", cascade="all, delete-orphan", order_by="GalleryItem.sort_order")

    def to_dict(self):
        return {
            "id": self.id,
            "title": {
                "en": self.title_en or "",
                "ur": self.title_ur or "",
                "ar": self.title_ar or "",
            },
            "description": {
                "en": self.description_en or "",
                "ur": self.description_ur or "",
                "ar": self.description_ar or "",
            },
            "year": self.year or "2026",
            "cover_image": self.cover_image or "",
            "sort_order": self.sort_order,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class GalleryItem(Base):
    __tablename__ = "gallery_items"

    id = Column(String(100), primary_key=True, index=True)
    album_id = Column(String(100), ForeignKey("gallery_albums.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(Text, default="", nullable=True)
    video_url = Column(Text, default="", nullable=True)
    title_en = Column(String(255), nullable=True)
    title_ur = Column(String(255), nullable=True)
    title_ar = Column(String(255), nullable=True)
    caption_en = Column(Text, nullable=True)
    caption_ur = Column(Text, nullable=True)
    caption_ar = Column(Text, nullable=True)
    year = Column(String(20), default="2026", nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    album = relationship("GalleryAlbum", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "album_id": self.album_id,
            "image_url": self.image_url or "",
            "video_url": self.video_url or "",
            "title": {
                "en": self.title_en or "",
                "ur": self.title_ur or "",
                "ar": self.title_ar or "",
            },
            "caption": {
                "en": self.caption_en or "",
                "ur": self.caption_ur or "",
                "ar": self.caption_ar or "",
            },
            "year": self.year or "2026",
            "sort_order": self.sort_order,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
