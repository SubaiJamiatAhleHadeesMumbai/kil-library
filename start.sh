#!/usr/bin/env bash
# ✅ START SCRIPT FOR RENDER
# This script ensures uvicorn runs from the correct directory

set -e

echo "🚀 KIL2 Backend Starting..."
echo "📁 Current directory: $(pwd)"
echo "📝 Changing to library_backend..."

cd library_backend || { echo "❌ library_backend directory not found!"; exit 1; }

echo "✅ Now in: $(pwd)"
echo "📦 Checking main.py exists..."
ls -la main.py

echo "🎯 Starting uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port 10000
