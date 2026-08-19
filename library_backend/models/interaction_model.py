# file: models/interaction_model.py
from sqlalchemy import Column, Integer, Boolean, ForeignKey, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class UserBookInteraction(Base):
    """
    Tracks user specific data for a book:
    - Where they stopped reading (last_page)
    - If they bookmarked it
    - Personal notes (optional)
    """
    __tablename__ = "user_book_interactions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)

    # Tracking Data
    last_page_read = Column(Integer, default=1)  # Default Page 1
    total_pages = Column(Integer, default=0)     # To calculate % completion
    is_bookmarked = Column(Boolean, default=False)
    
    # Future Proofing: Private Notes
    # Hum isay JSON string ki tarah store kar sakte hain later
    notes = Column(Text, nullable=True)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Constraint: Ek user ka ek book ke liye ek hi record hona chahiye
    __table_args__ = (
        UniqueConstraint('user_id', 'book_id', name='unique_user_book_interaction'),
        {'mysql_engine': 'InnoDB'}
    )

    # Relations
    user = relationship("User")
    book = relationship("Book")