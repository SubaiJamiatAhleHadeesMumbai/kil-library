import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models.book_model import Category, Subcategory
from datetime import datetime

SEED_STRUCTURE = [
    {
        "category": "قرآن و علوم القرآن",
        "subcategories": [
            "قرآن و علوم القرآن",
            "تفاسیر",
            "کتبِ تخریج"
        ]
    },
    {
        "category": "حدیث و علوم الحدیث",
        "subcategories": [
            "حدیث و علوم الحدیث",
            "شروحِ احادیث",
            "متونِ احادیث",
            "رجال، جرح و تعدیل"
        ]
    },
    {
        "category": "عقائد و توحید",
        "subcategories": [
            "عقائد و توحید",
            "فرق و مذاہب اور ردود"
        ]
    },
    {
        "category": "فقہ و اصولِ فقہ",
        "subcategories": [
            "فقہ و اصولِ فقہ",
            "فقہِ عام",
            "فقہِ اہلِ حدیث",
            "فقہ حنفی",
            "فقہ شافعی",
            "فقہ مالکی",
            "فقہ حنبلی",
            "فقہ مقارن",
            "اصول و قواعد",
            "اسلامی قوانین و ضوابط"
        ]
    },
    {
        "category": "فتاویٰ و عبادات",
        "subcategories": [
            "فتاویٰ",
            "عبادات",
            "نماز",
            "زکوٰۃ",
            "روزہ",
            "حج و عمرہ"
        ]
    },
    {
        "category": "سیرت و تاریخ",
        "subcategories": [
            "سیرت النبی ﷺ",
            "شمائل و خصائصِ نبوی ﷺ",
            "سیرت و سوانحِ صحابہ",
            "سیرت و سوانحِ تابعین و ائمہ",
            "تاریخِ اسلام",
            "تاریخِ ہند",
            "تراجم و سیر"
        ]
    },
    {
        "category": "تربیت، اخلاق و دعوت",
        "subcategories": [
            "تصوف و تزکیہ",
            "اخلاق و آداب",
            "دعوت و اصلاح",
            "منہیات و محرمات"
        ]
    },
    {
        "category": "علوم، لغات و متفرقات",
        "subcategories": [
            "لغات و معاجم",
            "علوم و معلوماتِ عامہ",
            "ادبیات",
            "مجلات و رسائل",
            "آثار و مخطوطات",
            "متفرقات"
        ]
    }
]

def clean_and_seed_categories(db: Session = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Collect allowed names
        allowed_cat_names = set(g["category"] for g in SEED_STRUCTURE)
        allowed_sub_names = set()
        for g in SEED_STRUCTURE:
            for s in g["subcategories"]:
                allowed_sub_names.add(s)

        # 1. Soft delete or remove test / legacy subcategories not in our 42 list
        all_subs = db.query(Subcategory).filter(Subcategory.deleted_at.is_(None)).all()
        for s in all_subs:
            if s.name not in allowed_sub_names:
                s.deleted_at = datetime.utcnow()

        # 2. Soft delete or remove test categories not in our parent categories list
        all_cats = db.query(Category).filter(Category.deleted_at.is_(None)).all()
        for c in all_cats:
            if c.name not in allowed_cat_names:
                c.deleted_at = datetime.utcnow()

        # 3. Seed / Restore 42 categories
        added_cats = 0
        added_subs = 0

        for group in SEED_STRUCTURE:
            cat_name = group["category"]
            
            category = db.query(Category).filter(
                Category.name == cat_name
            ).first()

            if not category:
                category = Category(name=cat_name, description=f"Islamic Category: {cat_name}")
                db.add(category)
                db.flush()
                added_cats += 1
            else:
                category.deleted_at = None # Un-delete if previously soft deleted

            for sub_name in group["subcategories"]:
                sub = db.query(Subcategory).filter(
                    Subcategory.name == sub_name
                ).first()

                if not sub:
                    sub = Subcategory(
                        name=sub_name,
                        category_id=category.id,
                        description=f"{sub_name} under {cat_name}"
                    )
                    db.add(sub)
                    added_subs += 1
                else:
                    sub.deleted_at = None
                    sub.category_id = category.id

        db.commit()
        print(f"✅ Cleaned & Seeded Complete! Active Categories: {len(allowed_cat_names)}, Active Subcategories: {len(allowed_sub_names)}.")
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding Error: {e}")
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    clean_and_seed_categories()
