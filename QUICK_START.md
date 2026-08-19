# 🚀 QUICK START - KIL2 Deployment

## LOCAL (1 Minute Setup)

```bash
# Terminal 1 - Backend
cd library_backend
pip install -r requirements.txt
cd ..
python run_server.py

# Terminal 2 - Frontend
cd library-frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:10000
- API Docs: http://localhost:10000/docs

---

## RENDER (Deploy & Done)

### Option 1: Auto-Deploy (Best)
1. Push to GitHub: `git push origin main`
2. Render auto-detects and deploys

### Option 2: Manual Deploy
1. Go to Render.com → Your Backend Service
2. Click "Manual Deploy" or "Deploy Latest Commit"

### Start Command (If Needed):
```
python run_server.py
```

### Build Command (If Needed):
```
pip install --upgrade pip && pip install -r library_backend/requirements.txt && cd library_backend && alembic upgrade head
```

---

## Key Files (Don't Delete)

- ✅ `run_server.py` - Handles directory change
- ✅ `Procfile` - Render knows to use this
- ✅ `render.yaml` - Full Render config
- ✅ `start.sh` - Alternative for bash

---

## Expected Output (Success)

```
🚀 KIL2 Backend Starting...
📁 Current directory: /path/to/KIL2
📝 Changing to: /path/to/KIL2/library_backend
✅ Now in: /path/to/KIL2/library_backend
📦 main.py found ✓
🎯 Starting uvicorn...
INFO:     Started server process [1234]
INFO:     Uvicorn running on http://0.0.0.0:10000
```

---

## Environment Variables Needed (Render Dashboard)

```
DATABASE_URL = [your-supabase-url]
SECRET_KEY = [your-secret-key]
CLOUDINARY_CLOUD_NAME = [your-cloudinary-name]
CLOUDINARY_API_KEY = [your-api-key]
CLOUDINARY_API_SECRET = [your-api-secret]
SUPABASE_URL = [your-supabase-url]
SUPABASE_KEY = [your-supabase-key]
```

---

## 🎯 100% Works Both Places

✓ Local Development
✓ Render Production
✓ No Manual Directory Changes
✓ Same Codebase

---

See `DEPLOYMENT_COMPLETE_GUIDE.md` for detailed instructions.
