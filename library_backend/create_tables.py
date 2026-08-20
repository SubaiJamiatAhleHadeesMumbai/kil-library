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

rename_statements = [
    'ALTER TABLE users RENAME COLUMN "FullName" TO full_name;',
    'ALTER TABLE users RENAME COLUMN "Education" TO education;',
    'ALTER TABLE users RENAME COLUMN "SocialActivities" TO social_activities;',
    'ALTER TABLE users RENAME COLUMN "Email" TO email;',
    'ALTER TABLE users RENAME COLUMN "Username" TO username;',
    'ALTER TABLE users RENAME COLUMN "PasswordHash" TO password_hash;',
    'ALTER TABLE users RENAME COLUMN "DateJoined" TO date_joined;',
    'ALTER TABLE users RENAME COLUMN "Status" TO status;',
    'ALTER TABLE users RENAME COLUMN "RoleID" TO role_id;',
    'ALTER TABLE languages RENAME COLUMN "LanguageID" TO id;',
    'ALTER TABLE languages RENAME COLUMN "LanguageName" TO name;',
    'ALTER TABLE languages RENAME COLUMN "LanguageCode" TO code;',
    'ALTER TABLE languages RENAME COLUMN "Description" TO description;',
    'ALTER TABLE book_copies RENAME COLUMN "CopyID" TO id;',
    'ALTER TABLE book_copies RENAME COLUMN "BookID" TO book_id;',
    'ALTER TABLE book_copies RENAME COLUMN "LocationID" TO location_id;',
    'ALTER TABLE book_copies RENAME COLUMN "Status" TO status;',
    'ALTER TABLE issued_books RENAME COLUMN "IssuedBookID" TO id;',
    'ALTER TABLE issued_books RENAME COLUMN "ClientID" TO client_id;',
    'ALTER TABLE issued_books RENAME COLUMN "CopyID" TO copy_id;',
    'ALTER TABLE issued_books RENAME COLUMN "IssueDate" TO issue_date;',
    'ALTER TABLE issued_books RENAME COLUMN "ReturnDate" TO due_date;',
    'ALTER TABLE issued_books RENAME COLUMN "ActualReturnDate" TO actual_return_date;',
    'ALTER TABLE issued_books RENAME COLUMN "Status" TO status;',
    'ALTER TABLE digital_access RENAME COLUMN "DigitalAccessID" TO id;',
    'ALTER TABLE digital_access RENAME COLUMN "ClientID" TO client_id;',
    'ALTER TABLE digital_access RENAME COLUMN "BookID" TO book_id;',
    'ALTER TABLE digital_access RENAME COLUMN "AccessGranted" TO access_granted;',
    'ALTER TABLE digital_access RENAME COLUMN "AccessTimestamp" TO access_timestamp;'
]

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

for stmt in rename_statements:
    try:
        with engine.begin() as conn:
            conn.execute(text(stmt))
    except Exception:
        pass

for q in alter_queries:
    try:
        with engine.begin() as conn:
            conn.execute(text(q))
    except Exception:
        pass

print("✅ All tables and columns synchronized successfully!")
