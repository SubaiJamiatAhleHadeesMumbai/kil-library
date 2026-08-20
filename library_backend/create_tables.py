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

rename_queries = [
    # Users table renames
    """
    DO $$ 
    BEGIN
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='FullName') THEN
        ALTER TABLE users RENAME COLUMN "FullName" TO full_name;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='Education') THEN
        ALTER TABLE users RENAME COLUMN "Education" TO education;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='SocialActivities') THEN
        ALTER TABLE users RENAME COLUMN "SocialActivities" TO social_activities;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='Email') THEN
        ALTER TABLE users RENAME COLUMN "Email" TO email;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='Username') THEN
        ALTER TABLE users RENAME COLUMN "Username" TO username;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='PasswordHash') THEN
        ALTER TABLE users RENAME COLUMN "PasswordHash" TO password_hash;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='DateJoined') THEN
        ALTER TABLE users RENAME COLUMN "DateJoined" TO date_joined;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='Status') THEN
        ALTER TABLE users RENAME COLUMN "Status" TO status;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='RoleID') THEN
        ALTER TABLE users RENAME COLUMN "RoleID" TO role_id;
      END IF;
    END $$;
    """,
    # Languages table renames
    """
    DO $$ 
    BEGIN
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='languages' AND column_name='LanguageID') THEN
        ALTER TABLE languages RENAME COLUMN "LanguageID" TO id;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='languages' AND column_name='LanguageName') THEN
        ALTER TABLE languages RENAME COLUMN "LanguageName" TO name;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='languages' AND column_name='LanguageCode') THEN
        ALTER TABLE languages RENAME COLUMN "LanguageCode" TO code;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='languages' AND column_name='Description') THEN
        ALTER TABLE languages RENAME COLUMN "Description" TO description;
      END IF;
    END $$;
    """,
    # Book copies and issued books renames
    """
    DO $$ 
    BEGIN
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='book_copies' AND column_name='CopyID') THEN
        ALTER TABLE book_copies RENAME COLUMN "CopyID" TO id;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='book_copies' AND column_name='BookID') THEN
        ALTER TABLE book_copies RENAME COLUMN "BookID" TO book_id;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='book_copies' AND column_name='LocationID') THEN
        ALTER TABLE book_copies RENAME COLUMN "LocationID" TO location_id;
      END IF;
      IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='book_copies' AND column_name='Status') THEN
        ALTER TABLE book_copies RENAME COLUMN "Status" TO status;
      END IF;
    END $$;
    """
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

with engine.connect() as conn:
    for q in rename_queries + alter_queries:
        try:
            conn.execute(text(q))
        except Exception as e:
            print(f"Notice on query: {e}")
    conn.commit()

print("✅ All tables and columns synchronized successfully!")
