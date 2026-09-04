# models/__init__.py
from database import Base

# Import all models here so Alembic/SQLAlchemy can find them
from .user_model import User, Role
from .book_model import Book, Category, Subcategory
from .fatawa_model import FatawaCategory, FatawaQuestion
from .language_model import Language
from .location_model import Location
from .permission_model import Permission
from .log_model import Log
from .request_model import BookRequest, UploadRequest
from .request_user_model import AccessRequest
from .issue_model import Issue
from .book_permission_model import BookPermission
from .post_model import MarkazPost
from .poster_model import HomepagePoster
from .donation_models import DonationInfo
from .interaction_model import UserBookInteraction
from .analytics_model import SiteVisit
from .library_management_models import BookCopy, IssuedBook, DigitalAccess
from .social_work_model import SocialWorkItem
from .book_order_model import BookDownloadOrder
from .translation_model import Translation
from .comment_model import Comment, CommentVote, CommentSettings
