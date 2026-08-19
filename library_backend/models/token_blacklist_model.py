"""
✅ Token Blacklist Model - For storing revoked tokens
"""
from sqlalchemy import Column, Integer, String, DateTime
from database import Base
from datetime import datetime

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    
    id = Column(Integer, primary_key=True, index=True)
    token_jti = Column(String(500), unique=True, index=True)  # JWT unique ID
    revoked_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)  # For cleanup
    
    __table_args__ = {'mysql_engine': 'InnoDB'}
