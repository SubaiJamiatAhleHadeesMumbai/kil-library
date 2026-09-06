from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base

class Translation(Base):
    __tablename__ = "translations"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(120), unique=True, nullable=False, index=True)
    category = Column(String(50), default="common", index=True)
    en = Column(Text, nullable=False)
    ur = Column(Text, nullable=True)
    ar = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "key": self.key,
            "category": self.category,
            "en": self.en,
            "ur": self.ur,
            "ar": self.ar,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
