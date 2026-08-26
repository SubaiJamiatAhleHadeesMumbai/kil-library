from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from database import get_db
from models.book_model import Book
from models.fatawa_model import FatawaQuestion
from models.social_work_model import SocialWorkItem

router = APIRouter()

@router.get("/global")
def global_omni_search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query string"),
    limit: int = Query(6, ge=1, le=20, description="Max results per section"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    query_clean = q.strip()
    if not query_clean:
        return {
            "query": "",
            "total_count": 0,
            "results": {
                "books": [],
                "fatawa": [],
                "education": [],
                "social_work": [],
                "activities": []
            }
        }

    pattern = f"%{query_clean}%"
    total_count = 0
    results: Dict[str, List[Dict[str, Any]]] = {
        "books": [],
        "fatawa": [],
        "education": [],
        "social_work": [],
        "activities": []
    }

    # 1. 📚 BOOKS SEARCH
    try:
        books_query = db.query(Book).filter(
            or_(
                Book.title.ilike(pattern),
                Book.author.ilike(pattern),
                Book.publisher.ilike(pattern),
                Book.description.ilike(pattern),
                Book.translator.ilike(pattern)
            )
        ).limit(limit).all()

        for b in books_query:
            results["books"].append({
                "id": b.id,
                "type": "book",
                "title": b.title,
                "subtitle": f"Author: {b.author or 'Unknown'}" + (f" • {b.publisher}" if b.publisher else ""),
                "thumbnail": b.cover_image_url or None,
                "url": f"/books/{b.id}",
                "badge": b.language.name if getattr(b, "language", None) else "Book",
                "badge_class": "bg-indigo-50 text-indigo-700 border-indigo-200"
            })
        total_count += len(results["books"])
    except Exception as e:
        print(f"Books search error: {e}")

    # 2. 📜 FATAWA SEARCH
    try:
        fatawa_query = db.query(FatawaQuestion).filter(
            FatawaQuestion.visibility == "public",
            or_(
                FatawaQuestion.question_text.ilike(pattern),
                FatawaQuestion.answer_text.ilike(pattern),
                FatawaQuestion.display_name.ilike(pattern),
                FatawaQuestion.verdict_summary.ilike(pattern),
                FatawaQuestion.darul_ifta_reference_no.ilike(pattern)
            )
        ).limit(limit).all()

        for f in fatawa_query:
            first_img = f.images[0].get("url") if f.images and isinstance(f.images, list) and len(f.images) > 0 and isinstance(f.images[0], dict) else None
            results["fatawa"].append({
                "id": f.id,
                "type": "fatawa",
                "title": f.question_text[:110] + ("..." if len(f.question_text) > 110 else ""),
                "subtitle": (f.answer_text[:140] + "...") if f.answer_text else "Fatawa Question & Answer",
                "thumbnail": first_img,
                "url": f"/fatawa",
                "badge": f.verdict_summary or "Fatwa",
                "badge_class": "bg-emerald-50 text-emerald-700 border-emerald-200"
            })
        total_count += len(results["fatawa"])
    except Exception as e:
        print(f"Fatawa search error: {e}")

    # 3. 🎓 EDUCATION SEARCH
    try:
        edu_query = db.query(SocialWorkItem).filter(
            SocialWorkItem.category == "education",
            SocialWorkItem.is_published == True,
            or_(
                SocialWorkItem.title.ilike(pattern),
                SocialWorkItem.subtitle.ilike(pattern),
                SocialWorkItem.content.ilike(pattern),
                SocialWorkItem.tags.ilike(pattern)
            )
        ).limit(limit).all()

        for item in edu_query:
            results["education"].append({
                "id": item.id,
                "type": "education",
                "title": item.title,
                "subtitle": item.subtitle or (item.content[:120] + "..." if item.content else "Education & Taleem"),
                "thumbnail": item.featured_image or (item.images[0].get("url") if item.images and isinstance(item.images[0], dict) else None),
                "url": f"/education",
                "badge": "Education",
                "badge_class": "bg-blue-50 text-blue-700 border-blue-200"
            })
        total_count += len(results["education"])
    except Exception as e:
        print(f"Education search error: {e}")

    # 4. 🤝 SOCIAL WORK SEARCH
    try:
        sw_query = db.query(SocialWorkItem).filter(
            SocialWorkItem.category == "social_work",
            SocialWorkItem.is_published == True,
            or_(
                SocialWorkItem.title.ilike(pattern),
                SocialWorkItem.subtitle.ilike(pattern),
                SocialWorkItem.content.ilike(pattern),
                SocialWorkItem.tags.ilike(pattern)
            )
        ).limit(limit).all()

        for item in sw_query:
            results["social_work"].append({
                "id": item.id,
                "type": "social_work",
                "title": item.title,
                "subtitle": item.subtitle or (item.content[:120] + "..." if item.content else "Social Work & Relief"),
                "thumbnail": item.featured_image or (item.images[0].get("url") if item.images and isinstance(item.images[0], dict) else None),
                "url": f"/social-work",
                "badge": "Social Work",
                "badge_class": "bg-emerald-50 text-emerald-700 border-emerald-200"
            })
        total_count += len(results["social_work"])
    except Exception as e:
        print(f"Social Work search error: {e}")

    # 5. ✨ ACTIVITIES SEARCH
    try:
        act_query = db.query(SocialWorkItem).filter(
            SocialWorkItem.category.in_(["activities", "other"]),
            SocialWorkItem.is_published == True,
            or_(
                SocialWorkItem.title.ilike(pattern),
                SocialWorkItem.subtitle.ilike(pattern),
                SocialWorkItem.content.ilike(pattern),
                SocialWorkItem.tags.ilike(pattern)
            )
        ).limit(limit).all()

        for item in act_query:
            results["activities"].append({
                "id": item.id,
                "type": "activities",
                "title": item.title,
                "subtitle": item.subtitle or (item.content[:120] + "..." if item.content else "Community Activity"),
                "thumbnail": item.featured_image or (item.images[0].get("url") if item.images and isinstance(item.images[0], dict) else None),
                "url": f"/activities",
                "badge": "Activity",
                "badge_class": "bg-amber-50 text-amber-700 border-amber-200"
            })
        total_count += len(results["activities"])
    except Exception as e:
        print(f"Activities search error: {e}")

    return {
        "query": query_clean,
        "total_count": total_count,
        "results": results
    }
