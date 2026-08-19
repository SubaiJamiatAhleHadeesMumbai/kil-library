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

print("Creating all tables...")
Base.metadata.create_all(bind=engine)
print("✅ All tables created successfully!")
