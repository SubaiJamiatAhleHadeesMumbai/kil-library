# Kokan Islamic Library (KIL) — Production Architecture & Storage Manual

**Server:** Hostinger VPS (`178.16.139.231`)  
**Domain:** `ahlehadeeskokan.com` / `www.ahlehadeeskokan.com`  
**Stack:** FastAPI (Python 3.10) + React (Vite SPA) + PostgreSQL 16 + CloudPanel Nginx  
**Release:** 2026 Production  

---

## 1. Super Admin Access & Credentials

Super Admin has unconditional root permissions over all library books, issues, users, approvals, and homepage customizations.

| Attribute | Production Value | Security Notes |
| :--- | :--- | :--- |
| **Username** | `Markaz_Burhan` | Case-insensitive login. Legacy alias: `admin` |
| **Password** | `Burhan*2802` | Bcrypt hashed with salt |
| **Email** | `admin@ahlehadeeskokan.com` | Primary root administrator account |
| **Role** | `Admin` / `Super Admin` | Full root access; bypasses all route restrictions |
| **Admin Dashboard URL** | `https://www.ahlehadeeskokan.com/admin/dashboard` | Gated by `ProtectedRoute` (Strictly staff only) |

> [!TIP]
> **Idempotent Reset Command:**  
> If the Super Admin credentials ever need to be restored or re-initialized on the VPS:
> ```bash
> docker compose exec backend python setup_admin.py
> ```

---

## 2. PostgreSQL Database Architecture & Data Storage

All structured business records and relational entities are stored in PostgreSQL running in an isolated Docker container on the VPS.

### Container & Network Specifications
- **Container Name:** `library_postgres`
- **Docker Image:** `postgres:16-alpine`
- **Database Name:** `library_db`
- **Database User:** `library_user`
- **Internal Port:** `5432` (Bound only to the internal Docker bridge network; closed to public internet)

### Physical Host Volume Storage
- **Docker Volume Name:** `postgres_data`
- **Host Path on VPS:**
  ```bash
  /var/lib/docker/volumes/kil-library_postgres_data/_data/
  ```
- **Data Persistence:** All database transactions survive container recreations, Docker prune operations, and VPS system reboots.

### Database Entities & Models Overview

| Category | Database Tables | Description |
| :--- | :--- | :--- |
| **User & Access** | `users`, `roles`, `permissions`, `role_permissions` | Login accounts, bcrypt hashes, staff permissions |
| **Library Catalog** | `books`, `book_copies`, `categories`, `subcategories`, `authors`, `publishers`, `languages`, `locations` | Complete physical and digital book metadata, barcodes |
| **Circulation** | `book_issues`, `requests`, `book_permissions`, `book_orders` | Borrowing records, copy status, access approvals |
| **Community & Media** | `fatawa`, `social_work`, `newspaper_clippings`, `posters`, `gallery_items`, `comments` | Inquiries, welfare initiatives, news clippings, gallery |
| **System Auditing** | `logs`, `token_blacklist` | Complete operational audit trail, revoked JWT tokens |

### Database Backup & Restore Procedures
```bash
# 1. Create timestamped SQL dump on VPS:
docker compose exec -T db pg_dump -U library_user library_db > /root/backup_$(date +%Y%m%d).sql

# 2. Restore database from SQL dump:
cat /root/backup.sql | docker compose exec -T db psql -U library_user -d library_db
```

---

## 3. Multi-Tier Media & File Storage Architecture (PDFs & Images)

To handle thousands of books and high-resolution PDFs without running out of VPS disk space, a 3-tier smart storage hierarchy is implemented:

### Storage Tiers

| Tier | Storage Provider | Content Handled | Performance & Cost Advantage |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Primary)** | **Cloudflare R2** | Heavy Book PDFs, manuscripts, scans | **Zero Egress Fees**; handles heavy downloads without server bandwidth cost. |
| **Tier 2 (Secondary)** | **Cloudinary** (`dhlfaiijj`) | Book cover thumbnails, posters, author photos | Automatic WebP/AVIF generation, global edge CDN delivery. |
| **Tier 3 (Local)** | **VPS Local Disk** | Local fallback when cloud keys absent | Mounted via Docker volume `backend_uploads`. |

### Physical VPS Local Uploads Path
- **Container Path:** `/app/static/uploads/`
- **VPS Host Path:**
  ```bash
  /root/kil-library/library_backend/static/uploads/
  ```

### Smart Conditional PDF Optimization Engine
> [!NOTE]
> - **Files $\le$ 100 MB:** Kept **100% untouched and lossless** to preserve original vector clarity and typography.
> - **Files $>$ 100 MB:** Undergo automatic progressive compression before cloud upload; local temporary files are automatically purged immediately after.

---

## 4. Website Branding & Dynamic Homepage Settings

All dynamic customizations made via the Admin Panel are saved in JSON format:

- **Host File Path:**
  ```bash
  /root/kil-library/library_backend/static/homepage_settings.json
  ```
- **Container Target Path:** `/app/static/homepage_settings.json`
- **Stored Data:**
  - Multilingual Site Title (`en`: English, `ur`: Urdu, `ar`: Arabic).
  - Header logo image URL and branding dimensions.
  - Hero banner heading, tagline, buttons, and background colors.
  - Section visibility toggles (Featured Books, Stats, Category Grid, Posters).
- **Persistence Guarantee:** The CI/CD deploy script automatically copies and preserves this file on every push.

---

## 5. Web Server, Nginx & Reverse Proxy Routing

```
[ Visitor Browser (HTTPS:443) ]
             │
             ▼
[ Host CloudPanel Nginx ]
             ├── /api/* ─────────► [ library_backend (FastAPI:8000) ]
             └── Static & SPA ───► [ /home/ahlehadeeskokan/htdocs/... ]
                                          ▲
                                          │ (Synced from)
                                   [ library_frontend (Container:3000) ]
```

- **CloudPanel Webroot:** `/home/ahlehadeeskokan/htdocs/www.ahlehadeeskokan.com`
- **SSL Certificate:** Automated Let's Encrypt SSL with HTTP-to-HTTPS redirect.

---

## 6. VPS Production Maintenance Cheat Sheet

```bash
# 1. View all running containers and their health:
docker compose ps

# 2. View live backend logs:
docker compose logs -f backend

# 3. View live database logs:
docker compose logs -f db

# 4. Clean restart of all services:
docker compose down && docker compose up -d

# 5. Check database connectivity:
docker compose exec db pg_isready -U library_user -d library_db
```
