# ⚠️ URGENT: Render Dashboard Manual Update Required

## Problem
Render is not reading Procfile/render.yaml - it's still using the old hardcoded start command.

## Solution: Update Render Dashboard Manually

### STEP 1: Go to Your Render Service
1. Go to https://dashboard.render.com
2. Click on your backend service (kil2-backend)
3. Go to **Settings** tab (right side)

### STEP 2: Update Build Command
Look for **Build Command** field and replace with:
```
pip install --upgrade pip && pip install -r library_backend/requirements.txt && cd library_backend && alembic upgrade head
```

### STEP 3: Update Start Command
Look for **Start Command** field and replace with:
```
python app.py
```

### STEP 4: Save & Deploy
1. Click **Save Changes**
2. Click **Manual Deploy** button
3. Watch the logs - should show success now ✅

---

## What Changed
- Created `app.py` at root level (Render can find it)
- `app.py` imports from `library_backend/main.py`
- This bypasses all directory issues

---

## Expected Output After Deploy
```
🔧 WSGI Setup:
   Project Root: /opt/render/project/src
   Backend Dir: /opt/render/project/src/library_backend
   Working Directory: /opt/render/project/src/library_backend
✅ Successfully imported app from main.py
🚀 Starting uvicorn...
INFO: Started server process
INFO: Uvicorn running on http://0.0.0.0:10000
```

---

## Alternative: Delete & Recreate Service
If manual update doesn't work:
1. Delete current backend service on Render
2. Create new Web Service
3. Select GitHub repo
4. Runtime: Python
5. Build Command: `pip install --upgrade pip && pip install -r library_backend/requirements.txt && cd library_backend && alembic upgrade head`
6. Start Command: `python app.py`
7. Add environment variables
8. Deploy

---

**Commit & Push These Files to GitHub First:**
- app.py (NEW)
- Procfile (UPDATED)
- render.yaml (UPDATED)

Then do the Render dashboard update.
