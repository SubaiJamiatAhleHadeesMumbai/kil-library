# library_backend/scripts/seed_data.py
import sys
import os

# Path setup taaki models aur database access ho sake
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models.book_model import Category, Subcategory, Book
from models.language_model import Language

def seed_everything():
    db = SessionLocal()
    try:
        # 1. Add Professional Languages
        languages = ["English", "Urdu", "Arabic", "Hindi", "Persian"]
        print("Seeding Languages...")
        for lang_name in languages:
            exists = db.query(Language).filter(Language.name == lang_name).first()
            if not exists:
                db.add(Language(name=lang_name))
        db.commit()
        
        # 2. Add Professional Categories & Subcategories
        data = {
            "Islamic Studies": ["Quran", "Hadith", "Fiqh", "Seerat-un-Nabi", "History of Islam", "Aqeedah"],
            "Literature": ["Fiction", "Poetry", "Essays", "Drama", "Classical Literature"],
            "Science & Tech": ["Computer Science", "Physics", "Mathematics", "Biology", "Engineering"],
            "Social Sciences": ["Political Science", "Sociology", "Psychology", "Economics"],
            "Children's Books": ["Stories", "Educational", "Picture Books", "Moral Stories"],
            "Reference": ["Dictionaries", "Encyclopedias", "Yearbooks", "Reports"]
        }

        print("Seeding Categories and Subcategories...")
        for cat_name, sub_list in data.items():
            db_cat = db.query(Category).filter(Category.name == cat_name).first()
            if not db_cat:
                db_cat = Category(name=cat_name, description=f"Books related to {cat_name}")
                db.add(db_cat)
                db.commit()
                db.refresh(db_cat)
            
            for sub_name in sub_list:
                db_sub = db.query(Subcategory).filter(Subcategory.name == sub_name, Subcategory.category_id == db_cat.id).first()
                if not db_sub:
                    db.add(Subcategory(name=sub_name, category_id=db_cat.id))
        
        db.commit()

        # 3. Seed / Restore Book 9 if catalog has 0 books
        book_count = db.query(Book).filter(Book.deleted_at.is_(None)).count()
        if book_count == 0:
            print("Catalog is empty. Seeding Book 9 (شرح عقيدة واسطية)...")
            urdu_lang = db.query(Language).filter(Language.name == "Urdu").first()
            aqeedah_sub = db.query(Subcategory).filter(Subcategory.name.in_(["Aqeedah", "Islamic Studies", "Fiqh"])).first()

            book9 = Book(
                id=9,
                title="شرح عقیدہ واسطیہ",
                author="فضیلۃ الشیخ ڈاکٹر سعید بن علی بن وہف القحطانی رحمہ اللہ",
                translator="ابو عبد اللہ عنایت اللہ سنابلی مدنی",
                publisher="شعبہ نشر واشاعت صوبائی جمعیت اہل حدیث ممبئی",
                language_id=urdu_lang.id if urdu_lang else 1,
                page_count=104,
                edition="اول",
                pdf_url="https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/pdfs/084a34e76cfe_%D8%B4%D8%B1%D8%AD%20%D8%B9%D9%82%D9%8A%D8%AF%DB%82%20%D9%88%D8%A7%D8%B3%D8%B7%D9%8A%D9%87%20%D8%A7%D8%B1%D8%AF%D9%88.docx",
                cover_image_url="https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/covers/d98edb741189_cover.jpg",
                description="شیخ الاسلام امام ابن تیمیہ رحمہ اللہ کے مشہور زمانہ رسالہ 'العقیدہ الواسطیہ' کی ایک مختصر، عام فہم اور جامع شرح، جسے فضیلۃ الشیخ ڈاکٹر سعید بن علی بن وہف القحطانی رحمہ اللہ نے تالیف کیا اور مولانا ابو عبد اللہ عنایت اللہ بن حفیظ اللہ سنابلی مدنی نے اردو ترجمہ کیا ہے۔ اس کتاب میں اہل سنت والجماعت کے بنیادی عقائد، اسماء و صفات الہی، ارکان ایمان، یوم آخرت، تقدیر کے مراتب اور صحابہ کرام کے فضائل کو قرآن و سنت کے دلائل کے ساتھ نہایت آسان اسلوب میں بیان کیا گیا ہے۔",
                remarks="گرافکس اسٹوڈیو، ممبئی - صفحات: 104 - سن اشاعت: ربیع الآخر 1437ھ مطابق اکتوبر 2015ء - ایڈیشن: اول - تعداد: دو ہزار (2000) - طباعت:",
                is_approved=True,
                is_digital=True,
                is_restricted=False,
            )
            if aqeedah_sub:
                book9.subcategories = [aqeedah_sub]
            
            db.add(book9)
            db.commit()
            print("✅ Book 9 (شرح عقيدة واسطية) Restored and Seeded Successfully!")
        
        print("✅ Database Seeded Successfully!")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_everything()