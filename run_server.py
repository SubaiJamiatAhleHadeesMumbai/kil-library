#!/usr/bin/env python
"""
✅ START SCRIPT FOR RENDER (Python version)
Works both locally and on Render by changing directory before importing
"""

import os
import sys
import subprocess

def main():
    # Change to library_backend directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(script_dir, 'library_backend')
    
    if not os.path.exists(backend_dir):
        print(f"❌ ERROR: library_backend directory not found at {backend_dir}")
        sys.exit(1)
    
    print(f"🚀 KIL2 Backend Starting...")
    print(f"📁 Current directory: {os.getcwd()}")
    print(f"📝 Changing to: {backend_dir}")
    
    os.chdir(backend_dir)
    print(f"✅ Now in: {os.getcwd()}")
    
    # Verify main.py exists
    if not os.path.exists('main.py'):
        print("❌ ERROR: main.py not found in library_backend!")
        sys.exit(1)
    
    print("📦 main.py found ✓")
    print("🎯 Starting uvicorn...")
    
    # Run uvicorn
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=10000,
        reload=False
    )

if __name__ == "__main__":
    main()
