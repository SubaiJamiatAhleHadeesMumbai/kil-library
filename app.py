#!/usr/bin/env python3
"""
✅ ROOT-LEVEL WSGI APPLICATION
This file is at the root where Render can find it.
It imports the actual app from library_backend/main.py
"""

import os
import sys
from pathlib import Path

# Get the directory where this script is located (root of project)
PROJECT_ROOT = Path(__file__).parent.absolute()
BACKEND_DIR = PROJECT_ROOT / "library_backend"

# Add backend to Python path BEFORE any imports
sys.path.insert(0, str(BACKEND_DIR))

print(f"🔧 WSGI Setup:")
print(f"   Project Root: {PROJECT_ROOT}")
print(f"   Backend Dir: {BACKEND_DIR}")
print(f"   Python Path: {sys.path[:2]}")

# Change working directory to backend
os.chdir(BACKEND_DIR)
print(f"   Working Directory: {os.getcwd()}")

# Now import the app from main.py (which is now in sys.path)
try:
    from main import app
    print("✅ Successfully imported app from main.py")
except ImportError as e:
    print(f"❌ Failed to import app: {e}")
    raise

# Export the app for WSGI servers (Render, Heroku, etc.)
if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting uvicorn...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 10000)),
        reload=False
    )
