# file: database.py

import os
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# ✅ Load environment variables from the backend-local .env file
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

# ✅ Get DATABASE_URL from .env file
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL environment variable not set in .env file")

def _read_pool_settings():
    try:
        pool_size = int(os.getenv("DATABASE_POOL_SIZE", 20))
        max_overflow = int(os.getenv("DATABASE_MAX_OVERFLOW", 40))
        pool_recycle = int(os.getenv("DATABASE_POOL_RECYCLE", 1800))
    except ValueError:
        pool_size = 20
        max_overflow = 40
        pool_recycle = 1800
    return pool_size, max_overflow, pool_recycle


def _build_engine(database_url: str):
    pool_size, max_overflow, pool_recycle = _read_pool_settings()
    parsed_url = urlparse(database_url)

    engine_kwargs = {
        "echo": False,
    }

    if parsed_url.scheme.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        engine_kwargs.update(
            {
                "pool_pre_ping": True,
                "pool_recycle": pool_recycle,
                "pool_size": pool_size,
                "max_overflow": max_overflow,
                "pool_timeout": 30,
            }
        )

    return create_engine(database_url, **engine_kwargs)


engine = _build_engine(DATABASE_URL)

# ✅ Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ✅ Base class for models
Base = declarative_base()


# Dependency function to use in FastAPI
def get_db():
    """
    This function will provide a database session.
    Use it in your FastAPI routes with Depends(get_db).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 
