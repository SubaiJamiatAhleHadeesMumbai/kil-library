"""
Run this script to create all database tables directly from models.
Usage: python create_tables.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from database import engine, Base

# Import all models so Base knows about them
from models.user_model import *
from models.book_model import *
from models.language_model import *
from models.location_model import *
from models.library_management_models import *
from models.permission_model import *
from models.request_model import *
from models.log_model import *
from models.book_permission_model import *
from models.donation_models import *
from models.interaction_model import *
from models.issue_model import *
from models.post_model import *
from models.request_user_model import *
from models.fatawa_model import *
from models.poster_model import *

from sqlalchemy import text

print("Creating all tables...")
Base.metadata.create_all(bind=engine)

print("Synchronizing schema columns...")
alter_queries = [
    # users table columns
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS education VARCHAR(500);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS social_activities VARCHAR(1000);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
    
    # books table columns
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS fatawa_category_id INTEGER;",
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS txt_file_url VARCHAR;",
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS total_copies INTEGER DEFAULT 1;",
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS available_copies INTEGER DEFAULT 1;",
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS published_date DATE;",
    "ALTER TABLE books ADD COLUMN IF NOT EXISTS edition VARCHAR(100);",
    
    # roles table columns
    "ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;",
]

with engine.connect() as conn:
    for q in alter_queries:
        try:
            conn.execute(text(q))
        except Exception as e:
            print(f"Notice on query: {e}")
    conn.commit()

print("✅ All tables and columns synchronized successfully!")
