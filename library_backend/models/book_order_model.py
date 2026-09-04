from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, TIMESTAMP, DateTime, func, Float
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class BookDownloadOrder(Base):
    __tablename__ = "book_download_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(64), unique=True, index=True, nullable=False)  # e.g. KIL-ORD-123456
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    buyer_name = Column(String(255), nullable=False)
    buyer_email = Column(String(255), nullable=False, index=True)
    buyer_phone = Column(String(50), nullable=True)
    
    amount = Column(Float, nullable=False, default=0.0)
    payment_method = Column(String(50), default="UPI_MANUAL", nullable=False)  # UPI_MANUAL, GATEWAY
    transaction_ref = Column(String(100), nullable=True, index=True)  # UTR or UPI Transaction Reference
    screenshot_url = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, APPROVED, REJECTED
    admin_remarks = Column(Text, nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    download_token = Column(String(128), unique=True, index=True, nullable=True)
    download_expires_at = Column(DateTime, nullable=True)
    download_count = Column(Integer, default=0, nullable=False)
    max_downloads = Column(Integer, default=5, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    book = relationship("Book")
    user = relationship("User", foreign_keys=[user_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])

    __table_args__ = {'mysql_engine': 'InnoDB'}
