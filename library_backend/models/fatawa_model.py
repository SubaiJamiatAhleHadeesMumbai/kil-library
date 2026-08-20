from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, TIMESTAMP, Index, func
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class FatawaCategory(Base):
    __tablename__ = "fatawa_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, unique=True, index=True)
    slug = Column(String(180), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    books = relationship("Book", back_populates="fatawa_category")
    questions = relationship("FatawaQuestion", back_populates="category", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_fatawa_category_active', 'is_active', 'deleted_at'),
        Index('idx_fatawa_category_sort', 'sort_order', 'deleted_at'),
        {'mysql_engine': 'InnoDB'}
    )


class FatawaQuestion(Base):
    __tablename__ = "fatawa_questions"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    category_id = Column(Integer, ForeignKey("fatawa_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=True)

    display_name = Column(String(255), nullable=True)
    guest_email = Column(String(255), nullable=True)
    asked_by_name = Column(String(255), nullable=True)
    asked_by_email = Column(String(255), nullable=True)
    reference_link = Column(Text, nullable=True)
    answered_by = Column(String(255), nullable=True)

    is_anonymous = Column(Boolean, default=False, nullable=False)
    visibility = Column(String(20), default="public", nullable=False)
    status = Column(String(20), default="pending", nullable=False)

    answered_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    answered_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)

    category = relationship("FatawaCategory", back_populates="questions")
    user = relationship("User", foreign_keys=[user_id])
    answered_by = relationship("User", foreign_keys=[answered_by_id])

    __table_args__ = (
        Index('idx_fatawa_question_status_visibility', 'status', 'visibility', 'deleted_at'),
        Index('idx_fatawa_question_category_created', 'category_id', 'created_at'),
        Index('idx_fatawa_question_user_status', 'user_id', 'status', 'deleted_at'),
        {'mysql_engine': 'InnoDB'}
    )