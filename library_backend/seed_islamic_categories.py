import os
import sys

# Add parent directory to path if run directly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models.book_model import Category, Subcategory

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

def seed_categories(db: Session = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        added_cats = 0
        added_subs = 0

        for group in SEED_STRUCTURE:
            cat_name = group["category"]
            
            # Check or create Category
            category = db.query(Category).filter(
                Category.name == cat_name,
                Category.deleted_at.is_(None)
            ).first()

            if not category:
                category = Category(name=cat_name, description=f"Islamic Category: {cat_name}")
                db.add(category)
                db.flush()
                added_cats += 1

            for sub_name in group["subcategories"]:
                sub = db.query(Subcategory).filter(
                    Subcategory.name == sub_name,
                    Subcategory.deleted_at.is_(None)
                ).first()

                if not sub:
                    sub = Subcategory(
                        name=sub_name,
                        category_id=category.id,
                        description=f"{sub_name} under {cat_name}"
                    )
                    db.add(sub)
                    added_subs += 1
                elif sub.category_id != category.id:
                    # Update category link if needed
                    sub.category_id = category.id

        db.commit()
        print(f"✅ Seeding Complete! Added {added_cats} Categories and {added_subs} Subcategories.")
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding Error: {e}")
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_categories()
