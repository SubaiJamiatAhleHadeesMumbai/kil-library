"""
Content Scheduler — Background task that auto-publishes scheduled posts and posters.

Runs every 60 seconds, checks for posts/posters with status='scheduled' and
published_at <= now(), then updates their status to 'published'.
"""
import asyncio
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from database import SessionLocal
from models.post_model import MarkazPost
from models.poster_model import HomepagePoster


def publish_scheduled_content():
    """
    Check for scheduled posts and posters whose publish time has passed,
    and update their status to 'published'.
    Returns count of items published.
    """
    db: Session = SessionLocal()
    published_count = 0

    try:
        now = datetime.now(timezone.utc)

        # --- Auto-publish scheduled posts ---
        scheduled_posts = (
            db.query(MarkazPost)
            .filter(
                MarkazPost.status == "scheduled",
                MarkazPost.published_at.isnot(None),
                MarkazPost.published_at <= now,
            )
            .all()
        )

        for post in scheduled_posts:
            post.status = "published"
            published_count += 1
            print(f"📢 Auto-published post: '{post.title}' (ID: {post.id})")

        # --- Auto-publish scheduled posters ---
        scheduled_posters = (
            db.query(HomepagePoster)
            .filter(
                HomepagePoster.status == "scheduled",
                HomepagePoster.published_at.isnot(None),
                HomepagePoster.published_at <= now,
            )
            .all()
        )

        for poster in scheduled_posters:
            poster.status = "published"
            published_count += 1
            print(f"📢 Auto-published poster: '{poster.title}' (ID: {poster.id})")

        if published_count > 0:
            db.commit()
            print(f"✅ Content scheduler: {published_count} item(s) auto-published.")

    except Exception as e:
        db.rollback()
        print(f"⚠️ Content scheduler error: {str(e)[:200]}")
    finally:
        db.close()

    return published_count


async def content_scheduler_loop():
    """
    Async background loop that runs the scheduler every 60 seconds.
    Safe to run as a FastAPI background task via lifespan.
    """
    print("🕐 Content scheduler started (checking every 60s)")
    while True:
        try:
            publish_scheduled_content()
        except Exception as e:
            print(f"⚠️ Scheduler loop error: {str(e)[:100]}")
        await asyncio.sleep(60)
