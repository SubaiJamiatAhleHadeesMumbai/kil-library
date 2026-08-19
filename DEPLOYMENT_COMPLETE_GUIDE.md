# 🚀 KIL2 Complete Setup Guide (100% Solution)

## ✅ What This Solves

- ✓ Works on **Render** (production)
- ✓ Works on **Local Machine** (development)
- ✓ No more "Could not import module main" errors
- ✓ Automatic directory handling
- ✓ Same code, different environments

---

## 📋 Files Overview

### New Files Created:
- **`run_server.py`** - Python wrapper script (handles directory change)
- **`start.sh`** - Bash script alternative
- **`Procfile`** - Render/Heroku format
- **`render.yaml`** - Render configuration

---

## 🏃 LOCAL SETUP (Development)

### 1️⃣ First Time Setup
```bash
# Clone or navigate to project
cd KIL2

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install backend dependencies
cd library_backend
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Go back to root
cd ..
```

### 2️⃣ Run Backend Locally
```bash
# Option A: Using Python wrapper (Recommended)
python run_server.py

# Option B: Direct command
cd library_backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Option C: Using shell script (macOS/Linux)
bash start.sh
```

### 3️⃣ Run Frontend Locally (in new terminal)
```bash
cd library-frontend
npm install
npm run dev
```

### 4️⃣ Access Application
```
Frontend: http://localhost:5173
Backend:  http://localhost:8000
API Docs: http://localhost:8000/docs
```

---

## 🌐 RENDER DEPLOYMENT (Production)

### 1️⃣ Connect GitHub to Render
1. Go to **https://render.com**
2. Click **New +** → **Web Service**
3. Select your GitHub repository (KIL2)
4. Choose **Python** as environment

### 2️⃣ Configure Service Settings

**Name:** `kil2-backend`

**Build Command:**
```bash
pip install --upgrade pip
pip install -r library_backend/requirements.txt
cd library_backend && alembic upgrade head
```

**Start Command:**
```bash
python run_server.py
```

### 3️⃣ Set Environment Variables
Go to **Environment** tab and add:

```
DATABASE_URL = postgresql://user:pass@host:5432/db
SECRET_KEY = your-secret-key-here
ALGORITHM = HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
DATABASE_POOL_SIZE = 20
DATABASE_MAX_OVERFLOW = 40
DATABASE_POOL_RECYCLE = 1800
CLOUDINARY_CLOUD_NAME = your-cloud-name
CLOUDINARY_API_KEY = your-api-key
CLOUDINARY_API_SECRET = your-api-secret
SUPABASE_URL = your-supabase-url
SUPABASE_KEY = your-supabase-key
```

### 4️⃣ Deploy
Click **Deploy Service**

Monitor logs - should show:
```
✅ Now in: /opt/render/project/src/library_backend
📦 main.py found ✓
🎯 Starting uvicorn...
```

---

## 📂 Project Structure (For Reference)

```
KIL2/
├── library_backend/          ← Backend code (FastAPI)
│   ├── main.py               ← Entry point
│   ├── requirements.txt       ← Python dependencies
│   ├── alembic/              ← Database migrations
│   ├── models/               ← Database models
│   ├── controllers/          ← API endpoints
│   ├── database.py           ← Database config
│   └── auth.py               ← Authentication
│
├── library-frontend/         ← Frontend code (React/Vite)
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── run_server.py             ← ✅ Python wrapper (NEW)
├── start.sh                  ← ✅ Bash wrapper (NEW)
├── Procfile                  ← ✅ Render format (UPDATED)
├── render.yaml               ← ✅ Render config (UPDATED)
└── README.md
```

---

## 🔧 How It Works

### Local Execution Flow:
```
Terminal Input
    ↓
run_server.py (Python wrapper)
    ↓
Changes directory to library_backend
    ↓
Imports main.py
    ↓
Runs: uvicorn main:app --host 0.0.0.0 --port 10000
    ↓
Application Running ✅
```

### Render Execution Flow:
```
Render Deploy
    ↓
Reads render.yaml
    ↓
Build: pip install + alembic migrate
    ↓
Start: python run_server.py
    ↓
Python wrapper changes to library_backend
    ↓
Runs uvicorn from correct directory
    ↓
Application Running ✅
```

---

## ✅ Verification Checklist

### Local Development:
- [ ] Run `python run_server.py`
- [ ] No "Could not import module" errors
- [ ] Server runs on http://localhost:10000
- [ ] API docs accessible at /docs
- [ ] Database migrations completed

### Render Deployment:
- [ ] Build logs show "Build successful 🎉"
- [ ] No "Could not import module" errors
- [ ] Service shows "Live"
- [ ] API responds to requests
- [ ] Database connected

---

## 🐛 Troubleshooting

### Error: "Could not import module main"
**Solution:** 
- Ensure `run_server.py` is in root directory
- Check Render Start Command is: `python run_server.py`
- Verify `library_backend/main.py` exists

### Error: "main.py not found in library_backend"
**Solution:**
- Check project structure
- Ensure you're in root directory when deploying
- Verify git has all files committed

### Database Connection Failed
**Solution:**
- Check DATABASE_URL environment variable on Render
- Verify credentials in .env file
- Ensure Supabase database is accessible

### Port Already in Use (Local)
**Solution:**
```bash
# Change port in run_server.py or use:
cd library_backend
uvicorn main:app --host 0.0.0.0 --port 8001
```

---

## 🔐 Security Checklist

- [ ] Never commit .env file
- [ ] Use Render environment variables for secrets
- [ ] DATABASE_URL only in Render dashboard (not in code)
- [ ] API keys stored securely
- [ ] CORS configured for production domain

---

## 📊 Performance Tips

- Keep pool_size reasonable (20-30 for free tier)
- Use Supabase for reliable database
- Enable query caching where possible
- Monitor Render logs for performance issues

---

## 🚀 Next Steps

1. **Test Locally:** `python run_server.py`
2. **Push to GitHub:** `git push origin main`
3. **Deploy to Render:** Manual deploy or auto-deploy on push
4. **Monitor:** Check Render logs for any errors
5. **Scale:** Upgrade Render plan when needed

---

## 📞 Support

If issues persist:
1. Check Render deployment logs
2. Verify environment variables
3. Ensure all files are committed to GitHub
4. Check database connectivity
5. Review error messages carefully

---

**Status: ✅ COMPLETE SOLUTION**
- Works both locally and on Render
- No manual directory changes needed
- Automatic path resolution
- Production-ready configuration
