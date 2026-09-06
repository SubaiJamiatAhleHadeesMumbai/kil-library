import copy
import urllib.parse
import urllib.request
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models import translation_model, user_model
from auth import get_current_user, require_permission

router = APIRouter()

# ==============================================================================
# 🌐 COMPREHENSIVE DEFAULT SEEDS ACROSS ALL SYSTEM PAGES
# ==============================================================================
DEFAULT_SEEDS = [
    # --- 1. Header & Navigation (navbar) ---
    {"key": "navbar.home", "category": "navbar", "en": "Home", "ur": "صفحہ اول", "ar": "الرئيسية"},
    {"key": "navbar.library", "category": "navbar", "en": "Library", "ur": "کتب خانہ", "ar": "المكتبة"},
    {"key": "navbar.about", "category": "navbar", "en": "About", "ur": "ہمارے متعلق", "ar": "عن المركز"},
    {"key": "navbar.gallery", "category": "navbar", "en": "Gallery", "ur": "نگارخانہ", "ar": "معرض الصور"},
    {"key": "navbar.fatawa", "category": "navbar", "en": "Fatawa", "ur": "فتاویٰ", "ar": "الفتاوى"},
    {"key": "navbar.social_work", "category": "navbar", "en": "Social Work", "ur": "سماجی خدمات", "ar": "العمل الاجتماعي"},
    {"key": "navbar.activities", "category": "navbar", "en": "Activities", "ur": "سرگرمیاں", "ar": "الأنشطة"},
    {"key": "navbar.education", "category": "navbar", "en": "Education", "ur": "تعلیم", "ar": "التعليم"},
    {"key": "navbar.clippings", "category": "navbar", "en": "Newspaper Clippings", "ur": "اخبارات کے تراشے", "ar": "قصاصات الصحف"},
    {"key": "navbar.authors", "category": "navbar", "en": "Authors", "ur": "مصنفین", "ar": "المؤلفون"},
    {"key": "navbar.publishers", "category": "navbar", "en": "Publishers", "ur": "ناشرین", "ar": "الناشرون"},
    {"key": "navbar.updates", "category": "navbar", "en": "Updates", "ur": "تازہ ترین", "ar": "التحديثات"},
    {"key": "navbar.donate", "category": "navbar", "en": "Donate", "ur": "تعاون کریں", "ar": "تبرع الآن"},
    {"key": "navbar.login", "category": "navbar", "en": "Log In", "ur": "لاگ ان", "ar": "تسجيل الدخول"},
    {"key": "navbar.logout", "category": "navbar", "en": "Log Out", "ur": "لاگ آؤٹ", "ar": "تسجيل الخروج"},
    {"key": "navbar.profile", "category": "navbar", "en": "My Profile", "ur": "میری پروفائل", "ar": "الملف الشخصي"},
    {"key": "navbar.dashboard", "category": "navbar", "en": "Admin Dashboard", "ur": "ایڈمن ڈیش بورڈ", "ar": "لوحة الإدارة"},

    # --- 2. Hero & Homepage (hero & home) ---
    {"key": "hero.markaz_title", "category": "hero", "en": "Markaz Ahle Hadees Kokan", "ur": "مرکز اہل حدیث کوکن", "ar": "مركز أهل الحديث كوكان"},
    {"key": "hero.title", "category": "hero", "en": "Welcome to the Future of the Library", "ur": "لائبریری کے مستقبل میں خوش آمدید", "ar": "مرحباً بكم في مستقبل المكتبة"},
    {"key": "hero.description", "category": "hero", "en": "Explore curated Islamic knowledge with a calm, modern reading experience.", "ur": "پرسکون اور جدید انداز میں اسلامی کتب و معلومات کا مطالعہ کریں۔", "ar": "استكشف المعرفة الإسلامية المنتقاة بتجربة قراءة حديثة وهادئة."},
    {"key": "hero.cta_explore", "category": "hero", "en": "Explore Catalog", "ur": "کتب کا معائنہ کریں", "ar": "استعرض الفهرس"},
    {"key": "home.latest_books", "category": "hero", "en": "Latest Arrivals", "ur": "تازہ ترین کتب", "ar": "أحدث الكتب"},
    {"key": "home.popular_books", "category": "hero", "en": "Popular Titles", "ur": "مقبول کتب", "ar": "الكتب الشائعة"},
    {"key": "home.read_more", "category": "hero", "en": "Read More", "ur": "مزید پڑھیں", "ar": "اقرأ المزيد"},
    {"key": "home.show_less", "category": "hero", "en": "Show Less", "ur": "مختصر کریں", "ar": "عرض أقل"},
    {"key": "home.open_full_about", "category": "hero", "en": "Open Full Page", "ur": "مکمل صفحہ کھولیں", "ar": "فتح الصفحة الكاملة"},
    {"key": "home.quick_search", "category": "hero", "en": "Quick Library Search", "ur": "فوری تلاش", "ar": "البحث السريع"},

    # --- 3. About Us Page (about) ---
    {"key": "about.title", "category": "about", "en": "About the Markaz", "ur": "مرکز کا تعارف و تاریخ", "ar": "عن المركز وتاريخه"},
    {"key": "about.subtitle", "category": "about", "en": "A trusted place for learning, reflection, and community growth", "ur": "تعلیم، تدبر اور اصلاحِ معاشرہ کا ایک معتبر علمی مرکز", "ar": "منصة موثوقة للتعلم والتدبر وخدمة المجتمع"},
    {"key": "about.background", "category": "about", "en": "Background & History", "ur": "تعارف و پس منظر", "ar": "الخلفية والتاريخ"},
    {"key": "about.objectives", "category": "about", "en": "Aims & Objectives", "ur": "اغراض و مقاصد", "ar": "الأهداف والغايات"},
    {"key": "about.leadership", "category": "about", "en": "Markaz Leadership", "ur": "انتظامیہ و سرپرستان", "ar": "قيادة المركز"},
    {"key": "about.ulma_reviews", "category": "about", "en": "Scholarly Testimonials", "ur": "اکابر علماء کرام کے تاثرات", "ar": "انطباعات كبار العلماء"},
    {"key": "about.branches", "category": "about", "en": "Branches & Institutions", "ur": "شعبہ جات و ذیلی ادارے", "ar": "الفروع والمؤسسات"},
    {"key": "about.view_full_gallery", "category": "about", "en": "Explore Full Gallery", "ur": "مکمل تصویری نگارخانہ دیکھیں", "ar": "استكشف معرض الصور بالكامل"},

    # --- 4. Photo & Event Gallery (gallery) ---
    {"key": "gallery.title", "category": "gallery", "en": "Markaz Photo & Event Gallery", "ur": "مرکز کا تصویری نگارخانہ و تقریبات", "ar": "معرض صور وفعاليات المركز"},
    {"key": "gallery.subtitle", "category": "gallery", "en": "Events, Conferences, Library & Programs Showcase", "ur": "تقریبات، سیمینارز، لائبریری اور فلاحی کاموں کی تصویری جھلکیاں", "ar": "توثيق بالصور للفعاليات والمؤتمرات والمكتبة"},
    {"key": "gallery.all_albums", "category": "gallery", "en": "All Albums", "ur": "تمام البم", "ar": "جميع الألبومات"},
    {"key": "gallery.all_photos", "category": "gallery", "en": "All Photos", "ur": "تمام تصاویر", "ar": "جميع الصور"},
    {"key": "gallery.filter_by_year", "category": "gallery", "en": "Filter by Year", "ur": "سال کے اعتبار سے دیکھیں", "ar": "تصفية حسب السنة"},
    {"key": "gallery.all_years", "category": "gallery", "en": "All Years", "ur": "تمام سال", "ar": "كل السنوات"},
    {"key": "gallery.download_photo", "category": "gallery", "en": "Download", "ur": "ڈاؤن لوڈ", "ar": "تحميل"},
    {"key": "gallery.share_whatsapp", "category": "gallery", "en": "Share on WhatsApp", "ur": "واٹس ایپ پر شیئر کریں", "ar": "مشاركة عبر واتساب"},
    {"key": "gallery.view_in_hd", "category": "gallery", "en": "View in HD", "ur": "ایچ ڈی میں دیکھیں", "ar": "عرض بدقة عالية"},
    {"key": "gallery.search_gallery", "category": "gallery", "en": "Search photos or events...", "ur": "تصاویر یا تقریبات تلاش کریں...", "ar": "ابحث في الصور أو الفعاليات..."},
    {"key": "gallery.photo_count", "category": "gallery", "en": "Photos", "ur": "تصاویر", "ar": "صور"},
    {"key": "gallery.no_photos", "category": "gallery", "en": "No photos found in this album.", "ur": "اس البم میں کوئی تصویر موجود نہیں ہے۔", "ar": "لم يتم العثور على صور في هذا الألبوم."},

    # --- 5. Fatawa & Dar-ul-Ifta (fatawa) ---
    {"key": "fatawa.title", "category": "fatawa", "en": "Dar-ul-Ifta & Islamic Rulings", "ur": "دار الافتاء اور شرعی سوالات", "ar": "دار الإفتاء والأحكام الشرعية"},
    {"key": "fatawa.subtitle", "category": "fatawa", "en": "Verified Islamic guidance based on the Quran and Sunnah", "ur": "قرآن و سنت کی روشنی میں مستند شرعی رہنمائی", "ar": "فتاوى شرعية موثقة وفق الكتاب والسنة"},
    {"key": "fatawa.ask_question", "category": "fatawa", "en": "Ask a Question", "ur": "سوال پوچھیں", "ar": "اطرح سؤالك"},
    {"key": "fatawa.search_placeholder", "category": "fatawa", "en": "Search fatawa by topic or question...", "ur": "موضوع یا فتویٰ تلاش کریں...", "ar": "ابحث في الفتاوى حسب الموضوع..."},
    {"key": "fatawa.question", "category": "fatawa", "en": "Question", "ur": "سوال", "ar": "السؤال"},
    {"key": "fatawa.answer", "category": "fatawa", "en": "Answer", "ur": "جواب", "ar": "الجواب"},
    {"key": "fatawa.mufti", "category": "fatawa", "en": "Approved by Mufti", "ur": "تصدیق شدہ از مفتی", "ar": "معتمد من المفتي"},
    {"key": "fatawa.date", "category": "fatawa", "en": "Fatwa Date", "ur": "تاریخِ فتویٰ", "ar": "تاريخ الفتوى"},
    {"key": "fatawa.verified", "category": "fatawa", "en": "Verified Fatwa", "ur": "مستند فتویٰ", "ar": "فتوى معتمدة"},
    {"key": "fatawa.submit", "category": "fatawa", "en": "Submit Question", "ur": "سوال جمع کروائیں", "ar": "إرسال السؤال"},

    # --- 6. Social Work & Welfare (social_work) ---
    {"key": "social_work.title", "category": "social_work", "en": "Social Welfare & Community Service", "ur": "سماجی خدمات و رفاہی کام", "ar": "الخدمات الاجتماعية والعمل الخيري"},
    {"key": "social_work.subtitle", "category": "social_work", "en": "Ration distribution, medical camps, relief drives & education aid", "ur": "راشن تقسیم، میڈیکل کیمپ، ریلیف اور مستحقین کی امداد", "ar": "توزيع السلال الغذائية، القوافل الطبية، والإغاثة"},
    {"key": "social_work.all_drives", "category": "social_work", "en": "All Welfare Initiatives", "ur": "تمام رفاہی سرگرمیاں", "ar": "كافة المبادرات الخيرية"},
    {"key": "social_work.event_date", "category": "social_work", "en": "Date", "ur": "تاریخ", "ar": "التاريخ"},
    {"key": "social_work.location", "category": "social_work", "en": "Location / Venue", "ur": "مقام", "ar": "الموقع / المكان"},
    {"key": "social_work.participate", "category": "social_work", "en": "Support this Cause", "ur": "اس کارِ خیر میں حصہ لیں", "ar": "ساهم في هذا العمل"},

    # --- 7. Education & Courses (education) ---
    {"key": "education.title", "category": "education", "en": "Educational Programs & Courses", "ur": "تعلیمی شعبہ جات و کورسز", "ar": "البرامج التعليمية والدورات"},
    {"key": "education.subtitle", "category": "education", "en": "Empowering minds with authentic Islamic & contemporary learning", "ur": "مستند اسلامی علوم اور مفید عصری تربیت", "ar": "تعليم إسلامي أصيل ومهارات معاصرة"},
    {"key": "education.departments", "category": "education", "en": "Departments", "ur": "شعبہ جات", "ar": "الأقسام التعليمية"},
    {"key": "education.admissions", "category": "education", "en": "Admissions", "ur": "داخلے", "ar": "القبول والتسجيل"},
    {"key": "education.curriculum", "category": "education", "en": "Curriculum", "ur": "نصابِ تعلیم", "ar": "المنهج الدراسي"},
    {"key": "education.faculty", "category": "education", "en": "Scholars & Faculty", "ur": "اساتذہ کرام", "ar": "هيئة التدريس"},

    # --- 8. Activities & Events (activities) ---
    {"key": "activities.title", "category": "activities", "en": "Conferences & Activities", "ur": "تقریبات و سیمینارز", "ar": "المؤتمرات والأنشطة"},
    {"key": "activities.subtitle", "category": "activities", "en": "Scholarly gatherings, youth seminars & public lectures", "ur": "علمی دورہ جات، نوجوانوں کی تربیت اور عوامی خطابات", "ar": "ملتقيات علمية، ندوات شبابية ومحاضرات عامة"},
    {"key": "activities.upcoming", "category": "activities", "en": "Upcoming Events", "ur": "آنے والے پروگرام", "ar": "الفعاليات القادمة"},
    {"key": "activities.past", "category": "activities", "en": "Past Activities", "ur": "سابقہ سرگرمیاں", "ar": "الأنشطة السابقة"},

    # --- 9. Newspaper Clippings (clippings) ---
    {"key": "clippings.title", "category": "clippings", "en": "Newspaper Clippings Archive", "ur": "اخبارات کے تراشے", "ar": "أرشيف قصاصات الصحف"},
    {"key": "clippings.subtitle", "category": "clippings", "en": "Media coverage, press reports & news features about the Markaz", "ur": "مرکز کی سرگرمیوں کے اخباری مضامین اور پریس کوریج", "ar": "التغطية الإعلامية وتقارير الصحف عن المركز"},
    {"key": "clippings.newspaper_name", "category": "clippings", "en": "Newspaper", "ur": "اخبار کا نام", "ar": "اسم الصحيفة"},
    {"key": "clippings.edition_date", "category": "clippings", "en": "Edition Date", "ur": "اشاعت کی تاریخ", "ar": "تاريخ النشر"},
    {"key": "clippings.zoom", "category": "clippings", "en": "View High-Res", "ur": "بڑا کر کے پڑھیں", "ar": "تكبير القصاصة"},

    # --- 10. Books & Library (books) ---
    {"key": "books.all_books", "category": "books", "en": "All Books", "ur": "تمام کتب", "ar": "جميع الكتب"},
    {"key": "books.authors", "category": "books", "en": "Authors", "ur": "مصنفین", "ar": "المؤلفون"},
    {"key": "books.publishers", "category": "books", "en": "Publishers", "ur": "ناشرین", "ar": "الناشرون"},
    {"key": "books.categories", "category": "books", "en": "Categories", "ur": "زمرہ جات", "ar": "التصنيفات"},
    {"key": "books.read_online", "category": "books", "en": "Read Online", "ur": "آن لائن پڑھیں", "ar": "اقرأ عبر الإنترنت"},
    {"key": "books.download_pdf", "category": "books", "en": "Download PDF", "ur": "پی ڈی ایف ڈاؤن لوڈ", "ar": "تحميل PDF"},
    {"key": "books.download_paid", "category": "books", "en": "Download Offline PDF", "ur": "آف لائن کاپی حاصل کریں", "ar": "تحميل نسخة أوفلاين"},
    {"key": "books.free_read_notice", "category": "books", "en": "Free to read online • Paid permanent copy", "ur": "آن لائن پڑھنا مفت • دائمی ڈاؤن لوڈ فیس", "ar": "قراءة مجانية أونلاين • رسوم للتحميل الدائم"},
    {"key": "books.search_placeholder", "category": "books", "en": "Search books, authors, topics...", "ur": "کتابیں، مصنفین یا موضوعات تلاش کریں...", "ar": "ابحث في الكتب والمؤلفين والموضوعات..."},
    {"key": "books.order_book", "category": "books", "en": "Order Hard Copy", "ur": "مطبوعہ کاپی کا آرڈر دیں", "ar": "طلب نسخة ورقية"},
    {"key": "books.book_details", "category": "books", "en": "Book Details", "ur": "کتاب کی تفصیلات", "ar": "تفاصيل الكتاب"},
    {"key": "books.pages", "category": "books", "en": "Pages", "ur": "صفحات", "ar": "الصفحات"},
    {"key": "books.language", "category": "books", "en": "Language", "ur": "زبان", "ar": "اللغة"},

    # --- 11. Authors & Publishers (authors_publishers) ---
    {"key": "authors.title", "category": "authors_publishers", "en": "Islamic Scholars & Authors", "ur": "اہلِ قلم و مصنفین", "ar": "المؤلفون والعلماء"},
    {"key": "publishers.title", "category": "authors_publishers", "en": "Publishing Houses", "ur": "مکتبات و ناشرین", "ar": "دور النشر والمطابع"},
    {"key": "authors.written_books", "category": "authors_publishers", "en": "Books Written", "ur": "تصانیف", "ar": "الكتب المؤلفة"},

    # --- 12. User Profile & Account (profile) ---
    {"key": "profile.title", "category": "profile", "en": "My Account & Profile", "ur": "میری پروفائل و ترتیبات", "ar": "الملف الشخصي والحساب"},
    {"key": "profile.history", "category": "profile", "en": "Reading History", "ur": "مطالعہ کا ریکارڈ", "ar": "سجل القراءة"},
    {"key": "profile.saved_books", "category": "profile", "en": "Saved Books", "ur": "محفوظ کردہ کتب", "ar": "الكتب المحفوظة"},
    {"key": "profile.change_password", "category": "profile", "en": "Change Password", "ur": "پاس ورڈ تبدیل کریں", "ar": "تغيير كلمة المرور"},
    {"key": "profile.role", "category": "profile", "en": "Membership Status", "ur": "رکنیت کی حیثیت", "ar": "نوع العضوية"},

    # --- 13. Authentication & Security (auth) ---
    {"key": "auth.login", "category": "auth", "en": "Log In to Portal", "ur": "پورٹل میں لاگ ان کریں", "ar": "تسجيل الدخول إلى البوابة"},
    {"key": "auth.username", "category": "auth", "en": "Username or Email", "ur": "صارف نام یا ای میل", "ar": "اسم المستخدم أو البريد"},
    {"key": "auth.password", "category": "auth", "en": "Password", "ur": "پاس ورڈ", "ar": "كلمة المرور"},
    {"key": "auth.google_login", "category": "auth", "en": "Continue with Google", "ur": "گوگل کے ذریعے جاری رکھیں", "ar": "المتابعة باستخدام جوجل"},
    {"key": "auth.forgot_password", "category": "auth", "en": "Forgot Password?", "ur": "پاس ورڈ بھول گئے؟", "ar": "نسيت كلمة المرور؟"},
    {"key": "auth.access_denied", "category": "auth", "en": "Access Denied", "ur": "رسائی کی اجازت نہیں ہے", "ar": "تم رفض الوصول"},

    # --- 14. Universal Common & Buttons (common) ---
    {"key": "common.save", "category": "common", "en": "Save", "ur": "محفوظ کریں", "ar": "حفظ"},
    {"key": "common.cancel", "category": "common", "en": "Cancel", "ur": "منسوخ", "ar": "إلغاء"},
    {"key": "common.close", "category": "common", "en": "Close", "ur": "بند کریں", "ar": "إغلاق"},
    {"key": "common.loading", "category": "common", "en": "Loading...", "ur": "لوڈ ہو رہا ہے...", "ar": "جاري التحميل..."},
    {"key": "common.clear", "category": "common", "en": "Clear", "ur": "صاف کریں", "ar": "مسح"},
    {"key": "common.search", "category": "common", "en": "Search", "ur": "تلاش کریں", "ar": "بحث"},
    {"key": "common.filter", "category": "common", "en": "Filter", "ur": "فلٹر", "ar": "تصفية"},
    {"key": "common.edit", "category": "common", "en": "Edit", "ur": "ترمیم", "ar": "تعديل"},
    {"key": "common.delete", "category": "common", "en": "Delete", "ur": "حذف کریں", "ar": "حذف"},
    {"key": "common.back", "category": "common", "en": "Back", "ur": "واپس", "ar": "رجوع"},
    {"key": "common.next", "category": "common", "en": "Next", "ur": "اگلا", "ar": "التالي"},
    {"key": "common.prev", "category": "common", "en": "Previous", "ur": "پچھلا", "ar": "السابق"},
]


def sync_and_seed_translations(db: Session):
    """
    Intelligently ensures all default seed keys exist in the database.
    Does NOT overwrite any existing key that has already been edited by the admin.
    """
    try:
        existing_keys = {row.key for row in db.query(translation_model.Translation.key).all()}
        new_items = []
        for item in DEFAULT_SEEDS:
            if item["key"] not in existing_keys:
                trans = translation_model.Translation(
                    key=item["key"],
                    category=item["category"],
                    en=item["en"],
                    ur=item["ur"],
                    ar=item["ar"],
                )
                new_items.append(trans)
                existing_keys.add(item["key"])

        if new_items:
            db.add_all(new_items)
            db.commit()
            print(f"[Translations] Automatically seeded {len(new_items)} new keys across pages.")
    except Exception as e:
        db.rollback()
        print(f"[WARN] Translation seed notice: {e}")


# ==============================================================================
# 1. PUBLIC: Get All Translations (For Instant React Client Hydration)
# ==============================================================================
@router.get("")
@router.get("/")
def get_translations_dictionary(db: Session = Depends(get_db)):
    """
    Returns translations formatted as:
    {
      "en": { "navbar.home": "Home", "home": "Home", ... },
      "ur": { ... },
      "ar": { ... }
    }
    Automatically maps both 'category.key' and 'key' for instant zero-friction lookup.
    """
    sync_and_seed_translations(db)
    items = db.query(translation_model.Translation).all()

    en_dict: Dict[str, str] = {}
    ur_dict: Dict[str, str] = {}
    ar_dict: Dict[str, str] = {}

    for item in items:
        # Full scoped key (e.g. navbar.home)
        en_dict[item.key] = item.en or ""
        ur_dict[item.key] = item.ur or item.en or ""
        ar_dict[item.key] = item.ar or item.en or ""

        # Short key without prefix (e.g. home)
        if "." in item.key:
            short_key = item.key.split(".", 1)[1]
            if short_key not in en_dict:
                en_dict[short_key] = item.en or ""
            if short_key not in ur_dict:
                ur_dict[short_key] = item.ur or item.en or ""
            if short_key not in ar_dict:
                ar_dict[short_key] = item.ar or item.en or ""

    return {
        "en": en_dict,
        "ur": ur_dict,
        "ar": ar_dict,
        "total_keys": len(items)
    }


# ==============================================================================
# 2. ADMIN: List Translations Table (With Category & Search Filter)
# ==============================================================================
@router.get("/admin/list")
def list_admin_translations(
    search: Optional[str] = None,
    category: Optional[str] = None,
    missing_in: Optional[str] = None,  # 'ur' | 'ar'
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    sync_and_seed_translations(db)
    query = db.query(translation_model.Translation)

    if category and category.lower() != 'all':
        query = query.filter(translation_model.Translation.category == category.lower())

    if missing_in == 'ur':
        query = query.filter(or_(translation_model.Translation.ur == None, translation_model.Translation.ur == ''))
    elif missing_in == 'ar':
        query = query.filter(or_(translation_model.Translation.ar == None, translation_model.Translation.ar == ''))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                translation_model.Translation.key.ilike(term),
                translation_model.Translation.en.ilike(term),
                translation_model.Translation.ur.ilike(term),
                translation_model.Translation.ar.ilike(term)
            )
        )

    items = query.order_by(translation_model.Translation.category, translation_model.Translation.key).all()
    return items


# ==============================================================================
# 3. ADMIN: Quick Auto-Translate Helper (1-Click Translation via Google)
# ==============================================================================
class AutoTranslateRequest(BaseModel):
    text: str
    target_lang: str = "ur"  # 'ur' or 'ar' or 'en'
    source_lang: str = "auto"

@router.post("/admin/auto-translate")
def auto_translate_text(
    payload: AutoTranslateRequest,
    current_user: user_model.User = Depends(get_current_user)
):
    """
    Translates text to Urdu or Arabic using Google Translate API without requiring extra billing.
    """
    raw_text = payload.text.strip()
    if not raw_text:
        return {"translated_text": ""}

    try:
        encoded_text = urllib.parse.quote(raw_text)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={payload.source_lang}&tl={payload.target_lang}&dt=t&q={encoded_text}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode("utf-8"))
            translated_pieces = [piece[0] for piece in result[0] if piece[0]]
            return {"translated_text": "".join(translated_pieces)}
    except Exception as e:
        print(f"[AutoTranslate Notice]: {e}")
        return {"translated_text": raw_text}


# ==============================================================================
# 4. ADMIN: Bulk Update Translations
# ==============================================================================
class TranslationUpdateItem(BaseModel):
    id: int
    en: Optional[str] = None
    ur: Optional[str] = None
    ar: Optional[str] = None

@router.put("/admin/bulk-update")
def bulk_update_translations(
    items: List[TranslationUpdateItem],
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("HOMEPAGE_CONTENT_MANAGE", "USER_MANAGE"))
):
    if not items:
        return {"message": "No items to update", "updated": 0}

    updated_count = 0
    for update in items:
        record = db.query(translation_model.Translation).filter(
            translation_model.Translation.id == update.id
        ).first()

        if record:
            if update.en is not None:
                record.en = update.en.strip()
            if update.ur is not None:
                record.ur = update.ur.strip()
            if update.ar is not None:
                record.ar = update.ar.strip()
            record.updated_at = datetime.utcnow()
            updated_count += 1

    db.commit()
    return {"message": "Translations updated successfully", "updated": updated_count}


# ==============================================================================
# 5. ADMIN: Create New Translation Key
# ==============================================================================
class CreateTranslationRequest(BaseModel):
    key: str
    category: str
    en: str
    ur: Optional[str] = ""
    ar: Optional[str] = ""

@router.post("/admin/create")
def create_translation_key(
    payload: CreateTranslationRequest,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("HOMEPAGE_CONTENT_MANAGE", "USER_MANAGE"))
):
    clean_key = payload.key.strip().lower()
    existing = db.query(translation_model.Translation).filter(
        translation_model.Translation.key == clean_key
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Key '{clean_key}' already exists."
        )

    trans = translation_model.Translation(
        key=clean_key,
        category=payload.category.strip().lower(),
        en=payload.en.strip(),
        ur=(payload.ur or "").strip(),
        ar=(payload.ar or "").strip(),
    )
    db.add(trans)
    db.commit()
    db.refresh(trans)
    return trans


# ==============================================================================
# 6. ADMIN: Delete Translation Key
# ==============================================================================
@router.delete("/admin/{trans_id}")
def delete_translation_key(
    trans_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_permission("HOMEPAGE_CONTENT_MANAGE", "USER_MANAGE"))
):
    record = db.query(translation_model.Translation).filter(
        translation_model.Translation.id == trans_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Translation key not found")

    db.delete(record)
    db.commit()
    return {"message": f"Deleted translation key '{record.key}'"}
