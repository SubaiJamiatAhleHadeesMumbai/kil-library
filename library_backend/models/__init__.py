# models/__init__.py
from database import Base

# Import all models here so Alembic/SQLAlchemy can find them
from .user_model import User, Role
from .book_model import Book, Category, Subcategory
from .language_model import Language
from .location_model import Location
from .permission_model import Permission
from .log_model import Log
from .request_model import BookRequest, UploadRequest
from .request_user_model import AccessRequest
from .issue_model import Issue
from .book_permission_model import BookPermission
from .post_model import MarkazPost
from .donation_models import DonationInfo
from .interaction_model import UserBookInteraction
from .analytics_model import SiteVisit
from .library_management_models import BookCopy, IssuedBook, DigitalAccess
