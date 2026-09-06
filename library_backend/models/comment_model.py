"""
Comment & Feedback System Models
=================================
- Comment: User comments/ratings on books, fatawa, posts
- CommentVote: Helpful / Not Helpful votes per user
- CommentSettings: Admin toggles for 10 features (on/off per entity_type)
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, SmallInteger,
    ForeignKey, DateTime, TIMESTAMP, func, JSON, Index
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


# ==========================================
# COMMENT MODEL
# ==========================================
class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)

    # --- What is being commented on ---
    entity_type = Column(String(50), nullable=False, index=True)  # "book" | "fatawa" | "post"
    entity_id   = Column(Integer, nullable=False, index=True)     # book_id / fatawa_id / post_id

    # --- Who commented ---
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # --- Reply support (1 level deep) ---
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True)

    # --- Content ---
    rating = Column(SmallInteger, nullable=True)   # 1-5 (nullable for replies)
    body   = Column(Text, nullable=False)

    # --- Moderation ---
    status         = Column(String(20), default="pending", nullable=False, index=True)
    # Values: "pending" | "approved" | "rejected" | "flagged"

    is_pinned      = Column(Boolean, default=False, nullable=False)
    flagged_reason = Column(String(255), nullable=True)
    report_count   = Column(Integer, default=0, nullable=False)

    # --- Admin reply ---
    admin_reply    = Column(Text, nullable=True)
    admin_reply_at = Column(DateTime, nullable=True)

    # --- Helpful votes (cached counts) ---
    helpful_count     = Column(Integer, default=0, nullable=False)
    not_helpful_count = Column(Integer, default=0, nullable=False)

    # --- Verified Reader (auto from interaction table) ---
    is_verified_read = Column(Boolean, default=False, nullable=False)

    # --- Timestamps ---
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime, nullable=True)  # soft-delete

    # --- Relationships ---
    user    = relationship("User", foreign_keys=[user_id])
    parent  = relationship("Comment", remote_side=[id], foreign_keys=[parent_id], back_populates="replies")
    replies = relationship(
        "Comment",
        foreign_keys=[parent_id],
        back_populates="parent",
        cascade="all, delete-orphan",
        lazy="select"
    )
    votes = relationship("CommentVote", back_populates="comment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_comment_entity",  "entity_type", "entity_id", "status", "deleted_at"),
        Index("idx_comment_status",  "status", "deleted_at"),
        Index("idx_comment_user",    "user_id", "entity_type", "entity_id"),
        {"mysql_engine": "InnoDB"}
    )


# ==========================================
# COMMENT VOTE MODEL (Helpful / Not Helpful)
# ==========================================
class CommentVote(Base):
    __tablename__ = "comment_votes"

    id         = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("users.id",    ondelete="CASCADE"), nullable=False, index=True)
    vote_type  = Column(String(20), nullable=False)  # "helpful" | "not_helpful"

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    comment = relationship("Comment", back_populates="votes")

    __table_args__ = (
        Index("idx_vote_comment_user", "comment_id", "user_id", unique=True),
        {"mysql_engine": "InnoDB"}
    )


# ==========================================
# COMMENT SETTINGS MODEL (Admin On/Off Controls)
# ==========================================
class CommentSettings(Base):
    """
    One row per entity_type (book, fatawa, post).
    Admin can toggle each of the 10 features on/off per entity type.
    """
    __tablename__ = "comment_settings"

    id          = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), unique=True, nullable=False, index=True)

    # ---- Feature Toggles (10 controls) ----
    # 1. Allow new comments at all
    feature_comments_enabled   = Column(Boolean, default=True,  nullable=False)
    # 2. Require login to comment
    feature_login_required     = Column(Boolean, default=True,  nullable=False)
    # 3. Admin must approve before public display
    feature_admin_approval     = Column(Boolean, default=True,  nullable=False)
    # 4. Star rating (1-5) input
    feature_ratings_enabled    = Column(Boolean, default=True,  nullable=False)
    # 5. Helpful / Not Helpful votes
    feature_helpful_votes      = Column(Boolean, default=True,  nullable=False)
    # 6. Verified Reader badge
    feature_verified_badge     = Column(Boolean, default=True,  nullable=False)
    # 7. User replies (1 level)
    feature_replies_enabled    = Column(Boolean, default=True,  nullable=False)
    # 8. User report / flag
    feature_report_enabled     = Column(Boolean, default=True,  nullable=False)
    # 9. Admin can pin comments
    feature_pin_enabled        = Column(Boolean, default=True,  nullable=False)
    # 10. Admin can publicly reply
    feature_admin_reply        = Column(Boolean, default=True,  nullable=False)

    # ---- Global limits ----
    auto_flag_threshold        = Column(Integer, default=3, nullable=False)  # reports before auto-flag
    max_comment_length         = Column(Integer, default=1000, nullable=False)

    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = {"mysql_engine": "InnoDB"}
