Yeh raha aapke **Library Management System** ka **Full Flow Diagram (Textual)** aur kuch **Pro Suggestions** ki hum isse aur behtar kaise bana sakte hain.

Abhi tak jo humne banaya hai, wo ek **Professional Digital + Physical Hybrid Library** hai.

---

### 🚀 Part 1: Full Application Flow (Workflow)

Application 2 hisson mein bati hui hai: **User Panel** (Flipkart Style) aur **Admin Panel** (Dashboard Style).

#### **A. User Journey (Student/Member)**

1. **Entry (Landing/Login):**
* User website kholta hai (`/login`).
* Agar account nahi hai -> **Register** karta hai (Password strength meter & validation ke saath).
* Login karta hai -> System **Token** generate karta hai aur **Role** check karta hai.
* Agar **User** hai -> **User Library (`/`)** par redirect hota hai.


2. **Discovery (Search & Browse):**
* User ko **Left Sidebar** mein Filters dikhte hain (Categories, Languages).
* Top par **Search Bar** hai (Title, Author, ISBN).
* Books **Grid View** mein load hoti hain (Skeleton loading ke saath).
* Badges dikhte hain: *Digital*, *Restricted*, *New Arrival*.


3. **Interaction (Book Details):**
* User Book par click karta hai -> **BookDetailsModal** khulta hai.
* **Scenario A (Digital Book):** "Read Now" button aata hai -> PDF new tab mein khulta hai.
* **Scenario B (Physical Open Book):** "Location" dikhti hai (Rack A, Shelf 2).
* **Scenario C (Restricted Book):** "Request Access" button aata hai.


4. **Request Flow (Restricted Books):**
* User "Request Access" dabata hai.
* Form bharta hai (Kyun chahiye? Kitne din ke liye?).
* Submit karte hi **Admin** ke paas notification/entry chali jati hai.
* User ko success toast milta hai.



---

#### **B. Admin Journey (Librarian)**

1. **Entry:**
* Login (`/login`) -> Role detect hota hai "Admin" -> Redirect to **Admin Dashboard (`/admin/dashboard`)**.


2. **Management (CRUD):**
* **Book Management:** Nayi kitabein add karna, Cover Image upload karna, PDF link dalna.
* **User Management:** Users ko block/unblock karna.


3. **Operations (Approvals & Issue):**
* **Approvals:** User ki "Request Access" list dekhta hai -> **Approve** ya **Reject** karta hai.
* **Issue Book:** Jab student library mein book lene aata hai, Admin book scan karta hai aur **Issue** mark karta hai.


4. **Return & Fine:**
* Book wapas aane par "Return" mark karta hai.
* System automatically calculate karta hai ki late hai ya nahi (Fine calculation).



---

### 💡 Part 2: Kya Ham Isse Aur Behtar Kar Sakte Hain? (Future Roadmap)

Aapka base ready hai, ab isse **"World Class"** banane ke liye ye features add kar sakte hain:

#### **1. User Experience (UX) Improvements**

* **❤️ Wishlist / Favorites:** Users ko books ko "Save for later" karne ka option dein.
* **⭐ Rating & Reviews:** Users padhne ke baad book ko 5-star rating aur review de sakein.
* **🔔 Notifications System:**
* Jab Admin request approve kare, to User ko Bell Icon pe notification aaye.
* "Book Due Tomorrow" ka email reminder bhejein.


* **🌙 Dark Mode:** Poori website ke liye Dark/Light mode toggle (Tailwind ke saath easy hai).

#### **2. Technical & Performance Improvements**

* **React Query (TanStack Query):**
* Abhi hum `useEffect` use kar rahe hain data fetch karne ke liye. `React Query` use karne se data **Cache** ho jayega. Bar-bar loading nahi dikhegi, app super fast feel hoga.


* **Debounced Search:**
* Abhi search bar mein har letter type karne par filter chalta hai. Ise **Debounce** karein (taki user ke rukne ke 300ms baad hi search ho) taaki performance better ho.


* **Virtual Scrolling:**
* Agar library mein 10,000 books hain, to page slow ho jayega. **Virtualization** use karke sirf wahi books render karein jo screen par dikh rahi hain.



#### **3. Advanced Admin Features**

* **📱 QR Code / Barcode Scanner:**
* Har book ka ek Unique QR Code generate karein.
* Admin mobile camera ya scanner se QR scan karke turant book Issue/Return kar sake (Bina type kiye).


* **📊 Analytics Charts:**
* Dashboard par Graphs dikhayein:
* "Most Issued Books" (Konsi kitaab sabse zyada padhi gayi).
* "Monthly Active Users".




* **bulk Upload:**
* Excel/CSV upload karke ek saath 500 books add karne ka feature.



#### **4. Backend (FastAPI) Enhancements**

* **Redis Caching:** Search results ko Redis mein cache karein taaki database par load kam pade.
* **Background Tasks (Celery):** Emails bhejne ka kaam (Registration Welcome, Overdue Alert) background mein hona chahiye taaki server slow na ho.

### 🎯 Mera Recommendation (Next Step)

Abhi aapka **Core System** ready hai. Agla step hona chahiye:

1. **Notifications:** Admin approve kare to User ko pata chale.
2. **History Page:** User apni profile mein jakar dekh sake ki usne aaj tak konsi books padhi hain.

Kya aap **Profile/History Page** par kaam karna chahenge ya **Admin Dashboard** ke features par?










============================================================================
==============================================================================
# 📚 LibraryHub - Modern Library Management System

A full-stack **Hybrid Library System** that bridges the gap between physical book management and digital reading. Built with **FastAPI** (Backend) and **React + Vite** (Frontend), featuring a modern "Flipkart-style" user interface and a robust Admin Dashboard.

## 🚀 Key Features

### 🌟 User Panel (Student/Member)
* **Modern Discovery:** Grid-based book browsing with skeleton loading states.
* **Smart Search:** Real-time search by Title, Author, or ISBN.
* **Advanced Filters:** Sidebar filtering by Category and Language.
* **Hybrid Access:**
    * **Digital Books:** "Read Now" button opens PDFs immediately.
    * **Physical Books:** Shows exact Rack & Shelf location.
    * **Restricted Books:** Integrated "Request Access" form.
* **User Dashboard:** View profile and reading history.

### 🛡️ Admin Panel (Librarian)
* **Dashboard:** Overview of total books, issued copies, and active users.
* **Book Management:** Add/Edit/Delete books with cover images and PDF links.
* **Approvals:** Review and Approve/Reject access requests for restricted books.
* **Issue/Return:** Manage physical inventory and track due dates.
* **User Management:** Manage roles and block/unblock users.

### 🔐 Security & Auth
* **JWT Authentication:** Secure login with automatic token management.
* **Role-Based Access Control (RBAC):** Strict separation between Admin and User routes.
* **Auto-Logout:** Automatically logs out users when the session expires.
* **Password Security:** Strength meter and visibility toggles during registration.

---

## 🛠️ Tech Stack

### Frontend
* **Framework:** React 18 (Vite)
* **Styling:** Tailwind CSS
* **Icons:** Heroicons
* **Animations:** Framer Motion
* **State/Network:** Axios, React Context API
* **Notifications:** React Hot Toast

### Backend
* **Framework:** FastAPI (Python 3.10+)
* **Database ORM:** SQLAlchemy
* **Database:** PostgreSQL
* **Authentication:** OAuth2 with Password Bearer (JWT)
* **Validation:** Pydantic

---

## ⚙️ Installation & Setup Guide

### Prerequisites
* Node.js & npm
* Python 3.10+
* PostgreSQL

### 1. Database Setup
1.  Open **pgAdmin** or SQL Shell.
2.  Create a new database named `library_db`.
3.  Keep your Postgres username (usually `postgres`) and password handy.

### 2. Backend Setup
```bash
# 1. Navigate to backend folder
cd library_project/library_backend

# 2. Create Virtual Environment
python -m venv venv

# 3. Activate Virtual Environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 4. Install Dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose[cryptography] passlib[bcrypt] python-multipart

# 5. Configure Database
# Open library_backend/database.py and update:
# SQLALCHEMY_DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@localhost/library_db"

# 6. Run Server
uvicorn main:app --reload




# 📚 LibraryHub - Modern Library Management System

A full-stack **Hybrid Library System** that bridges the gap between physical book management and digital reading. Built with **FastAPI** (Backend) and **React + Vite** (Frontend), featuring a modern "Flipkart-style" user interface and a robust Admin Dashboard.

## 🚀 Key Features

### 🌟 User Panel (Student/Member)
* **Modern Discovery:** Grid-based book browsing with skeleton loading states.
* **Smart Search:** Real-time search by Title, Author, or ISBN.
* **Advanced Filters:** Sidebar filtering by Category and Language.
* **Hybrid Access:**
    * **Digital Books:** "Read Now" button opens PDFs immediately.
    * **Physical Books:** Shows exact Rack & Shelf location.
    * **Restricted Books:** Integrated "Request Access" form.
* **User Dashboard:** View profile and reading history.

### 🛡️ Admin Panel (Librarian)
* **Dashboard:** Overview of total books, issued copies, and active users.
* **Book Management:** Add/Edit/Delete books with cover images and PDF links.
* **Approvals:** Review and Approve/Reject access requests for restricted books.
* **Issue/Return:** Manage physical inventory and track due dates.
* **User Management:** Manage roles and block/unblock users.

### 🔐 Security & Auth
* **JWT Authentication:** Secure login with automatic token management.
* **Role-Based Access Control (RBAC):** Strict separation between Admin and User routes.
* **Auto-Logout:** Automatically logs out users when the session expires.
* **Password Security:** Strength meter and visibility toggles during registration.

---

## 🛠️ Tech Stack

### Frontend
* **Framework:** React 18 (Vite)
* **Styling:** Tailwind CSS
* **Icons:** Heroicons
* **Animations:** Framer Motion
* **State/Network:** Axios, React Context API
* **Notifications:** React Hot Toast

### Backend
* **Framework:** FastAPI (Python 3.10+)
* **Database ORM:** SQLAlchemy
* **Database:** PostgreSQL
* **Authentication:** OAuth2 with Password Bearer (JWT)
* **Validation:** Pydantic

---

## ⚙️ Installation & Setup Guide

### Prerequisites
* Node.js & npm
* Python 3.10+
* PostgreSQL

### 1. Database Setup
1.  Open **pgAdmin** or SQL Shell.
2.  Create a new database named `library_db`.
3.  Keep your Postgres username (usually `postgres`) and password handy.

### 2. Backend Setup
```bash
# 1. Navigate to backend folder
cd library_project/library_backend

# 2. Create Virtual Environment
python -m venv venv

# 3. Activate Virtual Environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 4. Install Dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose[cryptography] passlib[bcrypt] python-multipart

# 5. Configure Database
# Open library_backend/database.py and update:
# SQLALCHEMY_DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@localhost/library_db"

# 6. Run Server
uvicorn main:app --reload
The backend runs on: http://127.0.0.1:8000

3. Frontend Setup
Bash

# 1. Open a new terminal and navigate to frontend folder
cd library_project/library-frontend

# 2. Install Dependencies
npm install

# 3. Run Development Server
npm run dev
The frontend runs on: http://localhost:5173

📂 Project Structure
Plaintext

library_project/
├── library_backend/           # FastAPI Backend
│   ├── main.py                # Entry point
│   ├── database.py            # DB Connection
│   ├── models/                # Database Tables (SQLAlchemy)
│   ├── controllers/           # API Logic (Routes)
│   └── auth/                  # Security Logic
│
└── library-frontend/          # React Frontend
    ├── src/
    │   ├── api/               # Axios Config & Service
    │   ├── components/
    │   │   ├── user/          # User Components (Library, Modal)
    │   │   └── layout/        # Navbar & Sidebar Layouts
    │   ├── context/           # AuthProvider (Global State)
    │   ├── hooks/             # Custom Hooks (useAuth)
    │   └── pages/             # Login, Register, Dashboards
    └── index.html
🧪 How to Test
Default Roles
Since there is no "Create Admin" UI page yet, follow these steps:

Register a new user at /register (e.g., username: admin_user).

Open pgAdmin, go to the users table.

Manually change the role column for admin_user from User to Admin.

Login at /login. You will be redirected to the Admin Dashboard.

Create another user normally to test the User Library view.

🔧 Troubleshooting
1. "UndefinedColumn: column books.txt_file_url does not exist"

Cause: You updated the Python Model but the Database table is old.

Fix: Open pgAdmin query tool and run: DROP TABLE books CASCADE;. Restart the backend to recreate the table.

2. "401 Unauthorized" Loop

Cause: Token expired or system clock mismatch.

Fix: Clear Local Storage in browser dev tools or click "Logout" and log in again.

3. Frontend layout looks broken

Cause: Tailwind classes might not be compiling.

Fix: Ensure tailwind.config.js content paths are correct and restart npm run dev.

🗺️ Future Roadmap
[ ] Add "My Reading History" page for users.

[ ] Implement Email Notifications (Celery).

[ ] Add QR Code scanning for Book Issue.

---

## Permissions

We use role-based permissions to gate admin features. A new permission was added:

- `HOMEPAGE_SEARCH_MANAGE` — Manage homepage search settings (show hint, voice search, deep search, suggestions, and placeholder text).

Ways to manage this permission:

- Admin UI (recommended):
    - Open the Admin panel -> Roles & Permissions.
    - Select a role, use the **Assign to Role** or **Remove from Role** buttons to add or revoke `HOMEPAGE_SEARCH_MANAGE`.

- API:
    - List permissions: `GET /api/permissions/permissions`.
    - Get role details: `GET /api/permissions/roles/{role_id}`.
    - Assign permissions to a role: `POST /api/permissions/roles/{role_id}/permissions` with JSON body: `{"permission_ids":[1,2,26]}`.

- Seed scripts:
    - `library_backend/scripts/assign_homepage_search_permission.py` — creates the permission (if missing) and assigns it to `Admin` and `Manager`.
    - `library_backend/setup_admin.py` — updated to include `HOMEPAGE_SEARCH_MANAGE` in initial permission seeds.

Files updated / relevant:

- Frontend:
    - `library-frontend/src/pages/RolePermissionManagement.jsx` — quick helper, assign/remove buttons, and tooltip added for convenience.
    - `library-frontend/src/components/admin/HomepageCustomizer.jsx` — UI now restricts editing search settings to users with `HOMEPAGE_SEARCH_MANAGE`.

- Backend:
    - `library_backend/controllers/settings_controller.py` — server-side enforcement: updates to `sections.search` require `HOMEPAGE_SEARCH_MANAGE` (admins still bypass).

Quick commands

Run seed (creates permission + assigns to Admin/Manager):
```bash
python library_backend/scripts/assign_homepage_search_permission.py
```

Verify via API (example using Python helper scripts included):
```bash
python library_backend/scripts/fetch_roles_with_token.py   # prints token + roles (authenticated)
python library_backend/scripts/get_role_detail.py 1        # prints Admin role detail
```

If you want, I can also add a short entry to the Admin docs explaining who should receive `HOMEPAGE_SEARCH_MANAGE` (recommended: Admin + Manager). 

[ ] Dark Mode toggle.