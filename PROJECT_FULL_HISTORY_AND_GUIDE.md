# 📚 KIL Library System — Complete Project History, Architecture & Technical Guide

**Repository**: [https://github.com/SubaiJamiatAhleHadeesMumbai/kil-library](https://github.com/SubaiJamiatAhleHadeesMumbai/kil-library)  
**Live Production URL**: [https://www.ahlehadeeskokan.com](https://www.ahlehadeeskokan.com)  
**Admin Portal**: [https://www.ahlehadeeskokan.com/admin](https://www.ahlehadeeskokan.com/admin) (Default Credentials: `admin` / `admin`)  
**Last Updated**: February 2026

---

## 📌 1. Kyon Dusre Email Ya Laptop Par History Direct Nahi Dikh Rahi?

Agar aapne dusre laptop par **dusre email** se login kiya hai ya wahan chat open kar rahe hain, to history na aane ke 2 main reasons hain:

1. **Email Isolation**: Antigravity / AI IDE conversations account-specific hoti hain. Agar aapne yahan Laptop A par **Email A** se login kiya tha aur Laptop B par **Email B** use kar rahe hain, to Email B ko Email A ki private chat history access nahi hoti.
2. **Local Session Cache**: Antigravity sessions laptop ke local drive (`C:\Users\<user>\.gemini\antigravity\...`) par store hote hain.

### 💡 Solution (Dusre Laptop Par Sab Kuch Kaise Milega):
- **Option 1 (Direct Code & Docs - Recommended)**: Humne is file (`docs/PROJECT_FULL_HISTORY_AND_GUIDE.md`) me pura project record, tamam problems aur unke solutions commit kar diye hain. Dusre laptop par sirf `git pull` ya `git clone` karein — sab kuch mil jayega!
- **Option 2 (Same Account)**: Dusre laptop par **wahi exact email account** login karein jo is laptop par use kiya tha.
- **Option 3 (Chat Migration)**: Agar aapko exact local IDE sessions chahiye hon, to is laptop ka yeh folder copy karke dusre laptop par daal sakte hain:  
  `C:\Users\Mohammad Gufran\.gemini\antigravity\brain\`

---

## 🏗️ 2. System Architecture Overview

- **Frontend**: React 19 + Tailwind CSS + Vite (Single Page Application behind Nginx)
- **Backend**: FastAPI (Python 3.10) + SQLAlchemy ORM + Pydantic v2
- **Database**: PostgreSQL 16 Alpine with Docker persistent volume (`postgres_data`)
- **File Storage**: Cloudflare R2 Global S3-compatible Object Storage (zero egress bandwidth costs)
- **Deployment**: Automated GitHub Actions CI/CD (`deploy.yml`) -> SSH to Hostinger VPS -> Docker Compose Rebuild & Auto-Sync (`main` + `master`).

---

## 🛠️ 3. Complete List of Problems Faced & How They Were Resolved

### 🔴 Problem 1: PostgreSQL Case-Sensitive Column Mismatch (500 Internal Server Errors)
- **Problem**: SQLite case-insensitive tha, lekin PostgreSQL me `FullName`, `RoleID`, `IssuedBookID` jaise PascalCase columns hone ki wajah se `"column does not exist"` ka 500 error aata tha.
- **Fix**:
  - Saare SQLAlchemy models ko `snake_case` (`full_name`, `role_id`, `copy_id`) me standardize kiya.
  - `library_backend/create_tables.py` me dynamic **Schema Synchronizer** banaya jo database open karke automatic old columns ko rename aur missing columns add karta hai bina data lose kiye.

### 🔴 Problem 2: Issue & Return Module (`/api/issues/`) Crash
- **Problem**: Pydantic validation schema me `due_date`, `client` aur `book_copy` strictly required the. Null data aane par API crash hoti thi.
- **Fix**:
  - `library_management_schemas.py` me fields ko `Optional[...] = None` kiya.
  - `issue_controller.py` me `joinedload(models.IssuedBook.client)` eager loading lagayi.

### 🔴 Problem 3: Speed Optimization & High Latency
- **Problem**: Initial pages load hone me time le rahe the.
- **Fix**:
  - **Vite Chunk Splitting (`vite.config.js`)**: React, Lucide Icons, aur heavy dependencies ko alag cacheable chunks me baanta.
  - **Nginx Caching & Compression (`nginx.conf`)**: `open_file_cache`, `sendfile`, `tcp_nodelay`, `gzip_comp_level 6` aur 1-year immutable caching lagayi.
  - **Latency**: API response time **`105 ms`** tak drop ho gaya! ⚡

### 🔴 Problem 4: Git Branch Sync & Merge Conflicts on VPS
- **Problem**: VPS par pull karne par conflicts ya divergence aati thi.
- **Fix**:
  - `.github/workflows/deploy.yml` me automated push rule lagaya jo `main` branch ko automatically `master` ke saath force-sync karta hai.
  - VPS par `git reset --hard origin/main` command lagayi.

### 🔴 Problem 5: Single Book Detail 307 Redirect (Mixed-Content Error)
- **Problem**: Book open karne par browser me *"Could not fetch details for book ID 7"* aa raha tha.
- **Fix**:
  - Frontend `bookService.js` me trailing slash (`/api/books/7/`) laga tha, jisse FastAPI `307 Redirect` to `http://...` bhejta tha aur browser HTTPS se HTTP redirect ko block kar deta tha.
  - Slashes normalize kiye aur backend me dual-route decorators (`@router.get("/{book_id}")` + `@router.get("/{book_id}/")`) add kiye.

### 🔴 Problem 6: PDF In-Browser Preview Error ("Preview couldn't load in-browser")
- **Problem**: Cloudflare R2 bucket par CORS headers (`Access-Control-Allow-Origin`) missing hone ki wajah se JavaScript `pdf.js` worker PDF bytes download karne se browser dwara block ho raha tha.
- **Fix**:
  - Backend me dedicated **Same-Origin Streaming Route** (`GET /api/books/{id}/stream-pdf`) banaya jo zero-CORS ke saath PDF stream karta hai.
  - Frontend `BookDetail.jsx` me dual-layer rendering lagayi (Worker Viewer + Native `<iframe>` fallback).

---

## 📖 4. Currently Added Books in Catalog

| Book ID | Title | Author | Translator | Publisher | Status | PDF Link |
|---|---|---|---|---|---|---|
| **9** | **شرح عقیدہ واسطیہ** | فضیلۃ الشیخ ڈاکٹر سعید بن علی بن وہف القحطانی رحمہ اللہ | ابو عبد اللہ عنایت اللہ سنابلی مدنی | شعبہ نشر واشاعت صوبائی جمعیت اہل حدیث ممبئی | ✅ Live / Approved | [Cloudflare R2 PDF Stream](https://www.ahlehadeeskokan.com/api/books/9/stream-pdf) |

---

## 🚀 5. Useful Commands for Deployment & Maintenance

```bash
# 1. Clone repository on any machine
git clone https://github.com/SubaiJamiatAhleHadeesMumbai/kil-library.git

# 2. Re-run schema synchronization on VPS
docker compose exec -T backend python create_tables.py

# 3. Setup/Reset Admin account on VPS
docker compose exec -T backend python setup_admin.py

# 4. View live container logs
docker compose logs -f backend
```
