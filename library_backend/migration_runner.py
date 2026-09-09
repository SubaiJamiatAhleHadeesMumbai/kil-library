# Migration runner for Alembic
# Run this at app startup to apply pending migrations
# NEVER runs during build - only during app startup

import os
import subprocess
import sys
from pathlib import Path

def run_migrations():
    """Run Alembic migrations at app startup (NOT during build)"""
    
    # ✅ CRITICAL: Skip if DATABASE_URL not set or in build phase
    if not os.getenv("DATABASE_URL"):
        print("⚠️ DATABASE_URL not set - skipping migrations")
        return
    
    # ✅ Skip if explicitly disabled
    if os.getenv("SKIP_MIGRATIONS") == "true":
        print("⚠️ SKIP_MIGRATIONS=true - migrations disabled")
        return
    
    try:
        backend_dir = Path(__file__).parent
        original_dir = os.getcwd()
        os.chdir(backend_dir)
        
        print("🔄 Running Database Migrations...")
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            timeout=120  # Increased timeout
        )
        
        os.chdir(original_dir)
        
        if result.returncode == 0:
            print("✅ Database Migrations Applied Successfully")
        else:
            # Log error but don't crash
            error_msg = result.stderr[:500]  # Truncate long errors
            print(f"⚠️ Migration Notice: {error_msg}")
            
        # ✅ Safety fallback: ensure deadline columns exist regardless of alembic state
        try:
            from database import engine
            from sqlalchemy import text
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE book_permissions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;"))
                conn.execute(text("ALTER TABLE access_requests_user ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;"))
                conn.execute(text("ALTER TABLE access_requests_user ADD COLUMN IF NOT EXISTS duration_days INTEGER;"))
                conn.commit()
        except Exception as col_err:
            pass
            
    except subprocess.TimeoutExpired:
        print("⚠️ Migrations Timeout (120s) - DB might be slow, will retry on next startup")
    except FileNotFoundError:
        print("⚠️ Alembic not found - skipping migrations")
    except Exception as e:
        error_str = str(e)[:500]
        print(f"⚠️ Migration Skipped (safe): {error_str}")
    finally:
        try:
            os.chdir(original_dir)
        except:
            pass
