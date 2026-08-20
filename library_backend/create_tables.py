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

from sqlalchemy import text, inspect

print("Creating all tables...")
Base.metadata.create_all(bind=engine)

print("Synchronizing schema columns...")
inspector = inspect(engine)

def sync_table_columns(table_name, column_mappings, required_columns):
    try:
        existing_cols = {c['name']: c for c in inspector.get_columns(table_name)}
    except Exception:
        return
    
    print(f"Table '{table_name}' existing columns:", list(existing_cols.keys()))
    
    for old_name, new_name in column_mappings.items():
        if old_name in existing_cols and new_name not in existing_cols:
            try:
                with engine.begin() as conn:
                    conn.execute(text(f'ALTER TABLE {table_name} RENAME COLUMN "{old_name}" TO {new_name};'))
                print(f"  -> Renamed {table_name}.\"{old_name}\" to {new_name}")
            except Exception as e:
                print(f"  -> Error renaming {old_name}: {e}")
        elif old_name in existing_cols and new_name in existing_cols and old_name != new_name:
            try:
                with engine.begin() as conn:
                    conn.execute(text(f'ALTER TABLE {table_name} DROP COLUMN "{old_name}";'))
                print(f"  -> Dropped duplicate {table_name}.\"{old_name}\"")
            except Exception as e:
                print(f"  -> Error dropping {old_name}: {e}")
                
    # Refresh existing columns
    try:
        existing_cols = {c['name']: c for c in inspect(engine).get_columns(table_name)}
    except Exception:
        existing_cols = {}

    for col_name, col_type in required_columns.items():
        if col_name not in existing_cols:
            try:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                print(f"  -> Added {table_name}.{col_name} {col_type}")
            except Exception as e:
                print(f"  -> Error adding {col_name}: {e}")

# 1. Users table
sync_table_columns(
    "users",
    {
        "FullName": "full_name",
        "Education": "education",
        "SocialActivities": "social_activities",
        "Email": "email",
        "Username": "username",
        "PasswordHash": "password_hash",
        "DateJoined": "date_joined",
        "Status": "status",
        "RoleID": "role_id"
    },
    {
        "full_name": "VARCHAR(255)",
        "education": "VARCHAR(500)",
        "social_activities": "VARCHAR(1000)",
        "email": "VARCHAR(255)",
        "username": "VARCHAR(100)",
        "password_hash": "VARCHAR(255)",
        "date_joined": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "status": "VARCHAR(50) DEFAULT 'Active'",
        "role_id": "INTEGER",
        "otp_code": "VARCHAR(6)",
        "otp_expires_at": "TIMESTAMP",
        "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "deleted_at": "TIMESTAMP"
    }
)

# 2. Languages table
sync_table_columns(
    "languages",
    {
        "LanguageID": "id",
        "LanguageName": "name",
        "LanguageCode": "code",
        "Description": "description"
    },
    {
        "name": "VARCHAR(100)",
        "code": "VARCHAR(10)",
        "description": "TEXT",
        "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "deleted_at": "TIMESTAMP"
    }
)

# 3. Book copies
sync_table_columns(
    "book_copies",
    {
        "CopyID": "id",
        "BookID": "book_id",
        "LocationID": "location_id",
        "Status": "status"
    },
    {
        "book_id": "INTEGER",
        "location_id": "INTEGER",
        "status": "VARCHAR(50) DEFAULT 'Available'",
        "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "deleted_at": "TIMESTAMP"
    }
)

# 4. Books
sync_table_columns(
    "books",
    {},
    {
        "fatawa_category_id": "INTEGER",
        "txt_file_url": "VARCHAR",
        "is_digital": "BOOLEAN DEFAULT FALSE",
        "is_approved": "BOOLEAN DEFAULT FALSE",
        "is_restricted": "BOOLEAN DEFAULT FALSE",
        "total_copies": "INTEGER DEFAULT 1",
        "available_copies": "INTEGER DEFAULT 1",
        "published_date": "DATE",
        "edition": "VARCHAR(100)"
    }
)

# 5. Issued Books
sync_table_columns(
    "issued_books",
    {
        "IssuedBookID": "id",
        "ClientID": "client_id",
        "CopyID": "copy_id",
        "IssueDate": "issue_date",
        "ReturnDate": "due_date",
        "ActualReturnDate": "actual_return_date",
        "Status": "status"
    },
    {
        "client_id": "INTEGER",
        "copy_id": "INTEGER",
        "issue_date": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "due_date": "TIMESTAMP",
        "actual_return_date": "TIMESTAMP",
        "status": "VARCHAR(50) DEFAULT 'Issued'",
        "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    }
)

# 6. Digital Access
sync_table_columns(
    "digital_access",
    {
        "DigitalAccessID": "id",
        "ClientID": "client_id",
        "BookID": "book_id",
        "AccessGranted": "access_granted",
        "AccessTimestamp": "access_timestamp"
    },
    {
        "client_id": "INTEGER",
        "book_id": "INTEGER",
        "access_granted": "BOOLEAN DEFAULT TRUE",
        "access_timestamp": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    }
)

print("✅ All tables and columns synchronized successfully!")
