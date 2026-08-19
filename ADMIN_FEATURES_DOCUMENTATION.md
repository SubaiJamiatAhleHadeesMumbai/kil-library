# 📚 LibraryNest Admin Features - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Admin Roles & Permissions](#admin-roles--permissions)
3. [User Management](#user-management)
4. [Role & Permission Management](#role--permission-management)
5. [Book Management](#book-management)
6. [Library Categorization](#library-categorization)
7. [Book Circulation](#book-circulation)
8. [Content Management](#content-management)
9. [System Logs & Auditing](#system-logs--auditing)
10. [Donations & Platform Settings](#donations--platform-settings)

---

## Overview

### What is the Admin Panel?
The Admin Panel is a comprehensive management system for:
- User lifecycle management (create, read, update, delete)
- Role-based access control (RBAC)
- Book inventory management
- Library categorization and organization
- Book circulation and issue tracking
- Platform content management
- System auditing and compliance

### Who Can Access?
Users with roles: `admin`, `superadmin`, `editor`, `manager`, `librarian`, `staff`

---

## Admin Roles & Permissions

### 1. **Super Admin / Admin**
- Full system access
- Manages all users, roles, and permissions
- Can approve/reject all requests
- Can manage all platform content

### 2. **Editor**
- Manages book content
- Can publish/unpublish posts
- Limited user management

### 3. **Manager**
- Supervises librarians and staff
- Views audit logs
- Manages book inventory

### 4. **Librarian**
- Issues and returns books
- Manages book copies
- Processes user access requests

### 5. **Staff**
- Basic data entry
- Upload and maintain book records
- Submit requests for approval

### Required Permissions

```python
{
    "USER_MANAGE": "Create/Update/Delete Users",
    "ROLE_MANAGE": "Create/Modify/Delete Roles",
    "ROLE_VIEW": "View Roles and Permissions",
    "PERMISSION_MANAGE": "Manage Permissions",
    "CATEGORY_MANAGE": "Manage Book Categories",
    "LANGUAGE_MANAGE": "Manage Languages",
    "LOCATION_MANAGE": "Manage Locations",
    "BOOK_MANAGE": "Create/Edit Books",
    "BOOK_VIEW": "View Books",
    "BOOK_ISSUE": "Issue/Return Books",
    "FILE_UPLOAD": "Upload Files (Images, PDFs, etc.)",
    "LOG_VIEW": "Access Audit Logs",
    "PERMISSION_VIEW": "View Permissions",
    "REQUEST_CREATE": "Create Requests",
    "REQUEST_APPROVE": "Approve/Reject Requests"
}
```

---

## User Management

### 📌 Dashboard Route
```
/admin/users
```

### API Endpoints

#### 1. **Create User** (POST)
```
POST /api/users/
Permission: USER_MANAGE

Request Body:
{
  "username": "john_doe",
  "email": "john@library.com",
  "full_name": "John Doe",
  "password": "SecurePassword123!",
  "role_id": 1
}

Response (201):
{
  "id": 5,
  "username": "john_doe",
  "email": "john@library.com",
  "full_name": "John Doe",
  "status": "Active",
  "date_joined": "2026-06-25T10:30:00",
  "role": {
    "id": 1,
    "name": "Member",
    "permissions": [...]
  }
}

Validation:
- Email must be unique and valid
- Username must be 3-100 chars and unique
- Password must be min 8 chars, max 72 bytes (bcrypt limit)
- Role must exist in database
```

#### 2. **Get All Users** (GET)
```
GET /api/users/?skip=0&limit=100
Permission: BOOK_ISSUE (minimum)

Response (200):
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@library.com",
    "full_name": "Admin User",
    "status": "Active",
    "date_joined": "2026-01-01T00:00:00",
    "role": { "id": 1, "name": "admin" }
  },
  ...
]
```

#### 3. **Get User Profile** (GET)
```
GET /api/profile/me
Permission: Authenticated User

Response (200):
{
  "id": 5,
  "username": "john_doe",
  "email": "john@library.com",
  "full_name": "John Doe",
  "role": {
    "id": 2,
    "name": "Member",
    "permissions": [...]
  }
}
```

#### 4. **Update User** (PUT)
```
PUT /api/users/{user_id}/
Permission: USER_MANAGE

Request Body:
{
  "full_name": "John Updated",
  "role_id": 2,
  "status": "Active"  // Active, Inactive, Suspended
}

Response (200):
{
  "id": 5,
  "full_name": "John Updated",
  "role_id": 2,
  ...
}
```

#### 5. **Delete/Deactivate User** (DELETE)
```
DELETE /api/users/{user_id}/
Permission: USER_MANAGE

Response (204): No Content

Note: Users are soft-deleted (deleted_at timestamp set)
```

#### 6. **Change User Password** (POST)
```
POST /api/auth/change-password/
Permission: Authenticated User

Request Body:
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword456!",
  "confirm_password": "NewPassword456!"
}

Response (200):
{
  "detail": "Password changed successfully"
}
```

#### 7. **Reset User Password** (Admin) (POST)
```
POST /api/auth/reset-password/
Permission: USER_MANAGE

Request Body:
{
  "user_id": 5,
  "new_password": "TempPassword123!"
}

Response (200):
{
  "detail": "Password reset. User should change on next login."
}
```

### Database Model

```python
User {
  id: Integer (Primary Key)
  username: String (Unique, 3-100 chars)
  email: String (Unique, valid email format)
  full_name: String (Optional, max 255 chars)
  password_hash: String (bcrypt hashed)
  status: String (Active, Inactive, Suspended)
  role_id: Integer (Foreign Key -> Role)
  otp_code: String (Optional, 6 digits)
  otp_expires_at: DateTime
  date_joined: DateTime
  updated_at: DateTime
  deleted_at: DateTime (Soft delete)
}
```

---

## Role & Permission Management

### 📌 Dashboard Routes
```
/admin/roles
/admin/roles-permissions
```

### API Endpoints

#### 1. **Create Role** (POST)
```
POST /api/roles/
Permission: ROLE_MANAGE

Request Body:
{
  "name": "Custom Editor",
  "description": "Can edit books and categories"
}

Response (201):
{
  "id": 6,
  "name": "Custom Editor",
  "description": "Can edit books and categories",
  "permissions": [],
  "created_at": "2026-06-25T10:30:00"
}
```

#### 2. **Get All Roles** (GET)
```
GET /api/roles/
Permission: ROLE_VIEW

Response (200):
[
  {
    "id": 1,
    "name": "admin",
    "description": "Super Administrator",
    "permissions": [
      { "id": 1, "name": "USER_MANAGE", "description": "..." },
      { "id": 2, "name": "ROLE_MANAGE", "description": "..." },
      ...
    ]
  },
  ...
]
```

#### 3. **Get Role Details** (GET)
```
GET /api/roles/{role_id}/
Permission: ROLE_VIEW

Response (200):
{
  "id": 2,
  "name": "Member",
  "permissions": [
    { "id": 10, "name": "BOOK_VIEW", "description": "View Books" },
    { "id": 11, "name": "POST_READ", "description": "Read Posts" }
  ]
}
```

#### 4. **Update Role** (PUT)
```
PUT /api/roles/{role_id}/
Permission: ROLE_MANAGE

Request Body:
{
  "name": "Updated Member",
  "description": "Updated description"
}

Response (200):
{
  "id": 2,
  "name": "Updated Member",
  ...
}

Restrictions:
- Cannot rename: admin, superadmin, member (system roles)
```

#### 5. **Assign Permission to Role** (POST)
```
POST /api/permissions/role-permission/
Permission: PERMISSION_MANAGE

Request Body:
{
  "role_id": 2,
  "permission_id": 5
}

Response (200):
{
  "detail": "Permission assigned to role"
}
```

#### 6. **Remove Permission from Role** (DELETE)
```
DELETE /api/permissions/role-permission/{role_id}/{permission_id}/
Permission: PERMISSION_MANAGE

Response (204): No Content
```

#### 7. **Get All Permissions** (GET)
```
GET /api/permissions/permissions
Permission: None (Public)

Response (200):
[
  {
    "id": 1,
    "name": "USER_MANAGE",
    "code": "USER_MANAGE",
    "description": "Create, Update, Delete Users"
  },
  ...
]
```

#### 8. **Create Permission** (POST)
```
POST /api/permissions/permissions
Permission: PERMISSION_MANAGE

Request Body:
{
  "name": "CUSTOM_PERMISSION",
  "code": "CUSTOM_PERMISSION",
  "description": "Custom permission description"
}

Response (201):
{
  "id": 50,
  "name": "CUSTOM_PERMISSION",
  "code": "CUSTOM_PERMISSION",
  "description": "Custom permission description"
}
```

### Database Models

```python
Role {
  id: Integer (Primary Key)
  name: String (Unique, max 50)
  description: String (Optional)
  permissions: List[Permission] (Many-to-Many)
  created_at: DateTime
  updated_at: DateTime
  deleted_at: DateTime
}

Permission {
  id: Integer (Primary Key)
  name: String (Unique, max 100)
  code: String (Unique, max 100)
  description: String
  created_at: DateTime
}

role_permission_link (Many-to-Many) {
  role_id: Integer (Foreign Key)
  permission_id: Integer (Foreign Key)
}
```

---

## Book Management

### 📌 Dashboard Routes
```
/admin/books
/admin/books/{id}
```

### API Endpoints

#### 1. **Create Book** (POST)
```
POST /api/books/
Permission: BOOK_MANAGE
Method: multipart/form-data

Form Fields:
{
  "title": "Quran Shareef",
  "author": "Allah (SWT)",
  "publisher": "Islamic Publisher",
  "translator": "Multiple Translators",
  "isbn": "978-1234567890",
  "edition": "5th Edition",
  "language_id": 1,  // Urdu = 1, Arabic = 2, English = 3
  "page_count": 600,
  "publication_year": 1400,
  "price": 500.00,
  "parts_or_volumes": "1 of 1",
  "subject_number": "297.272",
  "date_of_purchase": "2026-06-25",
  "is_digital": true,
  "is_restricted": false,
  "description": "Holy Quran with Urdu translation",
  "remarks": "Special edition",
  "subcategory_ids": [1, 2, 3],  // Array of subcategory IDs
  "cover_image": <file>,  // Image file (JPEG, PNG, WebP)
  "pdf_file": <file>,     // PDF file
  "txt_file": <file>      // Text/TXT file
}

Response (201):
{
  "id": 100,
  "title": "Quran Shareef",
  "author": "Allah (SWT)",
  "cover_image_url": "https://res.cloudinary.com/...",
  "pdf_url": "http://localhost:8000/uploads/pdfs/quran.pdf",
  "txt_file_url": "http://localhost:8000/uploads/texts/quran.txt",
  "is_approved": false,
  "is_restricted": false,
  "is_digital": true,
  "total_copies": 1,
  "available_copies": 1,
  "language": { "id": 1, "name": "Urdu" },
  "subcategories": [
    { "id": 1, "name": "Religious", "category": {...} },
    ...
  ],
  "created_at": "2026-06-25T10:30:00"
}

Validations:
- Title is required
- ISBN must be unique (if provided)
- Language ID must exist
- Subcategory IDs must exist
- Image: JPEG, PNG, WebP only
- PDF: PDF files only
```

#### 2. **Get All Books** (GET)
```
GET /api/books/?skip=0&limit=50&search=quran&is_approved=true
Permission: BOOK_VIEW

Query Parameters:
- skip: Pagination offset (default: 0)
- limit: Items per page (default: 50)
- search: Search by title/author (optional)
- is_approved: true/false (optional)
- language_id: Filter by language (optional)
- subcategory_id: Filter by subcategory (optional)

Response (200):
[
  {
    "id": 100,
    "title": "Quran Shareef",
    "author": "Allah (SWT)",
    "cover_image_url": "https://...",
    "is_approved": true,
    "is_digital": true,
    "total_copies": 5,
    "available_copies": 3
  },
  ...
]
```

#### 3. **Get Book Details** (GET)
```
GET /api/books/{book_id}/
Permission: BOOK_VIEW (or public if approved)

Response (200):
{
  "id": 100,
  "title": "Quran Shareef",
  "author": "Allah (SWT)",
  "publisher": "Islamic Publisher",
  "translator": "Multiple Translators",
  "isbn": "978-1234567890",
  "edition": "5th Edition",
  "language_id": 1,
  "page_count": 600,
  "publication_year": 1400,
  "price": 500.00,
  "cover_image_url": "https://...",
  "pdf_url": "http://localhost:8000/uploads/pdfs/quran.pdf",
  "txt_file_url": "http://localhost:8000/uploads/texts/quran.txt",
  "description": "Holy Quran with Urdu translation",
  "remarks": "Special edition",
  "is_approved": true,
  "is_restricted": false,
  "is_digital": true,
  "total_copies": 5,
  "available_copies": 3,
  "subcategories": [...],
  "language": {...},
  "created_at": "2026-06-25T10:30:00",
  "updated_at": "2026-06-25T11:45:00"
}
```

#### 4. **Update Book** (PUT)
```
PUT /api/books/{book_id}/
Permission: BOOK_MANAGE

Request Body:
{
  "title": "Updated Title",
  "author": "Updated Author",
  "is_approved": true,
  "is_restricted": false,
  "description": "Updated description"
}

Response (200):
{
  "id": 100,
  "title": "Updated Title",
  ...
}
```

#### 5. **Approve/Reject Book** (PUT)
```
PUT /api/books/{book_id}/approve/
Permission: BOOK_MANAGE

Request Body:
{
  "is_approved": true,  // true to approve, false to reject
  "remarks": "Approved by admin"
}

Response (200):
{
  "id": 100,
  "is_approved": true,
  ...
}
```

#### 6. **Delete Book** (DELETE)
```
DELETE /api/books/{book_id}/
Permission: BOOK_MANAGE

Response (204): No Content

Note: Soft delete
```

#### 7. **Set Book as Restricted** (PUT)
```
PUT /api/books/{book_id}/restricted/
Permission: BOOK_MANAGE

Request Body:
{
  "is_restricted": true
}

Response (200):
{
  "id": 100,
  "is_restricted": true,
  ...
}

Usage: Mark books that need special permission to access
```

### Database Model

```python
Book {
  id: Integer (Primary Key)
  title: String (Required, searchable)
  author: String
  publisher: String
  translator: String
  isbn: String (Unique, Optional)
  edition: String
  language_id: Integer (Foreign Key)
  page_count: Integer
  publication_year: Integer
  price: Float
  parts_or_volumes: String
  subject_number: String
  cover_image_url: Text (Cloudinary URL)
  pdf_url: Text (Local or Cloudinary URL)
  txt_file_url: Text (Local storage URL)
  description: Text
  remarks: Text
  is_approved: Boolean (default: false)
  is_restricted: Boolean (default: false)
  is_digital: Boolean (default: false)
  total_copies: Integer (default: 1)
  available_copies: Integer (default: 1)
  location_id: Integer (Foreign Key, Optional)
  created_at: DateTime
  updated_at: DateTime
  deleted_at: DateTime
}
```

---

## Library Categorization

### 📌 Dashboard Routes
```
/admin/categories
/admin/subcategories
/admin/languages
/admin/locations
```

### API Endpoints

#### **1. Categories**

##### Create Category (POST)
```
POST /api/categories/
Permission: CATEGORY_MANAGE

Request Body:
{
  "name": "Religious Books",
  "description": "Islamic and religious literature"
}

Response (201):
{
  "id": 1,
  "name": "Religious Books",
  "description": "Islamic and religious literature"
}
```

##### Get All Categories (GET)
```
GET /api/categories/?skip=0&limit=100
Permission: BOOK_VIEW

Response (200):
[
  {
    "id": 1,
    "name": "Religious Books",
    "description": "..."
  },
  ...
]
```

##### Update Category (PUT)
```
PUT /api/categories/{category_id}/
Permission: CATEGORY_MANAGE

Request Body:
{
  "name": "Updated Category Name",
  "description": "Updated description"
}

Response (200):
{
  "id": 1,
  "name": "Updated Category Name",
  ...
}
```

##### Delete Category (DELETE)
```
DELETE /api/categories/{category_id}/
Permission: CATEGORY_MANAGE

Response (204): No Content
```

---

#### **2. Subcategories**

##### Create Subcategory (POST)
```
POST /api/subcategories/
Permission: CATEGORY_MANAGE

Request Body:
{
  "category_id": 1,
  "name": "Quran & Hadith",
  "description": "Quranic studies and Hadith collections"
}

Response (201):
{
  "id": 10,
  "category_id": 1,
  "name": "Quran & Hadith",
  "description": "Quranic studies and Hadith collections"
}
```

##### Get All Subcategories (GET)
```
GET /api/subcategories/?category_id=1&skip=0&limit=100
Permission: BOOK_VIEW

Response (200):
[
  {
    "id": 10,
    "name": "Quran & Hadith",
    "category_id": 1,
    "description": "..."
  },
  ...
]
```

---

#### **3. Languages**

##### Create Language (POST)
```
POST /api/languages/
Permission: LANGUAGE_MANAGE

Request Body:
{
  "name": "Urdu",
  "description": "Urdu Language Books"
}

Response (201):
{
  "id": 1,
  "name": "Urdu",
  "description": "Urdu Language Books"
}
```

##### Get All Languages (GET)
```
GET /api/languages/
Permission: None (Public)

Response (200):
[
  { "id": 1, "name": "Urdu" },
  { "id": 2, "name": "Arabic" },
  { "id": 3, "name": "English" }
]
```

---

#### **4. Locations**

##### Create Location (POST)
```
POST /api/locations/
Permission: LOCATION_MANAGE

Request Body:
{
  "name": "Main Library - Shelf A",
  "rack": "A1",
  "shelf": "3",
  "section_name": "Religious Section",
  "description": "Main religious books section"
}

Response (201):
{
  "id": 1,
  "name": "Main Library - Shelf A",
  "rack": "A1",
  "shelf": "3",
  "section_name": "Religious Section"
}
```

---

## Book Circulation

### 📌 Dashboard Route
```
/admin/copies
```

### API Endpoints

#### 1. **Create Book Copy** (POST)
```
POST /api/copies/
Permission: BOOK_MANAGE

Request Body:
{
  "book_id": 100,
  "location_id": 1,
  "status": "Available"  // Available, Issued, Lost, Reference, New
}

Response (201):
{
  "id": 500,
  "book_id": 100,
  "location_id": 1,
  "status": "Available",
  "book": {
    "id": 100,
    "title": "Quran Shareef",
    ...
  },
  "location": {
    "id": 1,
    "name": "Main Library - Shelf A",
    ...
  }
}
```

#### 2. **Get All Book Copies** (GET)
```
GET /api/copies/?skip=0&limit=100&status=Available
Permission: BOOK_ISSUE

Query Parameters:
- skip, limit: Pagination
- status: Available, Issued, Lost, Reference
- location_id: Filter by location

Response (200):
[
  {
    "id": 500,
    "book_id": 100,
    "status": "Available",
    "book": {...},
    "location": {...}
  },
  ...
]
```

#### 3. **Update Copy Status** (PUT)
```
PUT /api/copies/{copy_id}/
Permission: BOOK_MANAGE

Request Body:
{
  "status": "Lost",
  "remarks": "Lost in library"
}

Response (200):
{
  "id": 500,
  "status": "Lost",
  ...
}
```

---

## Book Circulation - Issue & Return

### 📌 Dashboard Route
```
/admin/circulation
```

### API Endpoints

#### 1. **Issue Book to User** (POST)
```
POST /api/issues/issue
Permission: BOOK_ISSUE

Request Body:
{
  "copy_id": 500,
  "client_id": 5,
  "due_date": "2026-07-25T23:59:00"
}

Response (201):
{
  "id": 1000,
  "copy_id": 500,
  "client_id": 5,
  "issue_date": "2026-06-25T10:30:00",
  "due_date": "2026-07-25T23:59:00",
  "actual_return_date": null,
  "status": "Issued",
  "client": { "id": 5, "username": "john_doe", ... },
  "book_copy": { "id": 500, "book": {...}, ... }
}

Validations:
- Copy must exist and be available
- Client must exist
- Due date must be in future
```

#### 2. **Return Book** (POST)
```
POST /api/issues/return/{issue_id}
Permission: BOOK_ISSUE

Request Body:
{
  "condition": "Good",  // Good, Fair, Damaged, Lost
  "remarks": "Book returned in good condition"
}

Response (200):
{
  "id": 1000,
  "status": "Returned",
  "actual_return_date": "2026-06-25T14:00:00",
  "condition": "Good",
  ...
}

Auto-Updates:
- Copy status changed back to "Available"
- Issue status changed to "Returned"
- Return date recorded
```

#### 3. **Get All Issues** (GET)
```
GET /api/issues/?skip=0&limit=100&status=Issued
Permission: BOOK_ISSUE

Query Parameters:
- skip, limit: Pagination
- status: Issued, Returned, Overdue

Response (200):
[
  {
    "id": 1000,
    "client": { "id": 5, "username": "john_doe" },
    "book_copy": { "id": 500, "book": { "title": "Quran Shareef" } },
    "status": "Issued",
    "issue_date": "2026-06-25T10:30:00",
    "due_date": "2026-07-25T23:59:00"
  },
  ...
]
```

---

## Content Management

### 📌 Dashboard Routes
```
/admin/posts/add
```

### API Endpoints

#### 1. **Create Post** (POST)
```
POST /api/posts/
Permission: USER_MANAGE
Method: multipart/form-data

Form Fields:
{
  "title": "Weekly Library Update",
  "content": "This week we added 50 new books...",
  "tags": "library,update,news",
  "file": <optional image or PDF>
}

Response (201):
{
  "id": 1,
  "title": "Weekly Library Update",
  "content": "This week we added 50 new books...",
  "tags": "library,update,news",
  "media_type": "image",  // image, pdf, none
  "file_url": "https://res.cloudinary.com/...",
  "author_id": 1,
  "author_name": "Admin User",
  "created_at": "2026-06-25T10:30:00",
  "published": true
}
```

#### 2. **Get All Posts** (GET)
```
GET /api/posts/?skip=0&limit=20&published=true
Permission: None (Public)

Response (200):
[
  {
    "id": 1,
    "title": "Weekly Library Update",
    "author_name": "Admin User",
    "published": true,
    "created_at": "2026-06-25T10:30:00"
  },
  ...
]
```

#### 3. **Update Post** (PUT)
```
PUT /api/posts/{post_id}/
Permission: USER_MANAGE

Request Body:
{
  "title": "Updated Title",
  "content": "Updated content",
  "published": true
}

Response (200):
{
  "id": 1,
  "title": "Updated Title",
  ...
}
```

#### 4. **Delete Post** (DELETE)
```
DELETE /api/posts/{post_id}/
Permission: USER_MANAGE

Response (204): No Content
```

---

## System Logs & Auditing

### 📌 Dashboard Route
```
/admin/logs
```

### API Endpoints

#### 1. **Get System Logs** (GET)
```
GET /api/logs/?skip=0&limit=100&action_type=USER_CREATED&user_id=1
Permission: LOG_VIEW

Query Parameters:
- skip, limit: Pagination
- action_type: USER_CREATED, BOOK_APPROVED, etc. (optional)
- user_id: Filter by user (optional)
- target_type: User, Book, etc. (optional)

Response (200):
[
  {
    "id": 1,
    "action_type": "USER_CREATED",
    "description": "User 'john_doe' created by Admin",
    "action_by_id": 1,
    "action_by": {
      "id": 1,
      "username": "admin",
      "full_name": "Admin User"
    },
    "target_type": "User",
    "target_id": 5,
    "timestamp": "2026-06-25T10:30:00"
  },
  ...
]

Action Types:
- USER_CREATED
- USER_UPDATED
- USER_DELETED
- BOOK_CREATED
- BOOK_UPDATED
- BOOK_APPROVED
- BOOK_ISSUED
- BOOK_RETURNED
- ROLE_CREATED
- ROLE_UPDATED
- PERMISSION_ASSIGNED
```

### Log Entry Model

```python
Log {
  id: Integer (Primary Key)
  action_type: String (action name)
  description: String (detailed log message)
  action_by_id: Integer (User who performed action)
  user_id: Integer (affected user, if any)
  target_type: String (what was affected: User, Book, Role, etc.)
  target_id: Integer (ID of affected entity)
  timestamp: DateTime
}
```

---

## Donations & Platform Settings

### 📌 Dashboard Route
```
/admin/donation
```

### API Endpoints

#### 1. **Get Donation Settings** (GET)
```
GET /api/donation/
Permission: None (Public)

Response (200):
{
  "id": 1,
  "qr_code_desktop": "https://res.cloudinary.com/...",
  "qr_code_mobile": "https://res.cloudinary.com/...",
  "appeal_desktop": "https://res.cloudinary.com/...",
  "appeal_mobile": "https://res.cloudinary.com/...",
  "bank_desktop": "https://res.cloudinary.com/...",
  "bank_mobile": "https://res.cloudinary.com/..."
}
```

#### 2. **Update Donation Settings** (PUT)
```
PUT /api/donation/update/
Permission: USER_MANAGE
Method: multipart/form-data

Form Fields:
{
  "qr_code_desktop": <image file>,
  "qr_code_mobile": <image file>,
  "appeal_desktop": <image file>,
  "appeal_mobile": <image file>,
  "bank_desktop": <image file>,
  "bank_mobile": <image file>
}

Response (200):
{
  "detail": "Donation settings updated successfully"
}
```

---

## Advanced Features

### Book Permissions (Restricted Access)

#### Set Book Permissions (POST)
```
POST /api/book-permissions/
Permission: BOOK_MANAGE

Request Body:
{
  "book_id": 100,
  "role_id": 2,
  "permission_type": "read"  // read, download, print
}

Response (201):
{
  "id": 1,
  "book_id": 100,
  "role_id": 2,
  "permission_type": "read"
}
```

### Digital Access Tracking

#### Grant Digital Access (POST)
```
POST /api/digital-access/
Permission: BOOK_ISSUE

Request Body:
{
  "book_id": 100,
  "client_id": 5,
  "access_type": "limited"  // full, limited, temporary
}

Response (201):
{
  "id": 1,
  "book_id": 100,
  "client_id": 5,
  "access_granted": true,
  "access_timestamp": "2026-06-25T10:30:00"
}
```

#### Get Digital Access History (GET)
```
GET /api/digital-access-history/?book_id=100&skip=0&limit=50
Permission: LOG_VIEW

Response (200):
[
  {
    "id": 1,
    "book_id": 100,
    "client_id": 5,
    "access_timestamp": "2026-06-25T10:30:00",
    "duration_minutes": 30
  },
  ...
]
```

---

## Security Best Practices

### For Admins

1. **Strong Passwords**
   - Min 8 characters
   - Mix of uppercase, lowercase, numbers, special chars
   - Change regularly

2. **Permission Management**
   - Assign minimum required permissions
   - Regularly audit role permissions
   - Remove unused roles

3. **Audit Logs**
   - Check logs regularly for suspicious activity
   - Monitor unusual bulk operations
   - Track sensitive operations (user deletion, etc.)

4. **User Management**
   - Deactivate unused accounts
   - Monitor account creation
   - Review access logs

### Rate Limiting
- Redis-based rate limiting (if configured)
- Prevents brute force attacks
- Configured at endpoint level

---

## Common Workflows

### Workflow 1: Add New Book

1. Go to `/admin/books` > "Add New Book"
2. Fill in book details (title, author, etc.)
3. Select language and subcategories
4. Upload cover image (Cloudinary)
5. Upload PDF file (Local storage)
6. Submit for approval
7. Book appears in public library once approved

### Workflow 2: Create User & Assign Role

1. Go to `/admin/users` > "Add New User"
2. Enter username, email, password
3. Select role (Member, Librarian, Staff, etc.)
4. System creates user and logs action
5. User can now login and access assigned features

### Workflow 3: Issue Book to User

1. Go to `/admin/copies` > Select book copy
2. Click "Issue" button
3. Select client (user)
4. Set due date
5. System records issue and updates copy status
6. User can now access the book

### Workflow 4: Return Book

1. Go to `/admin/circulation` > Find issued book
2. Click "Return"
3. Enter condition (Good, Fair, Damaged)
4. System updates copy status to "Available"
5. Book now available for other users

---

## Error Codes

```
200: Success
201: Created
204: No Content (Delete success)
400: Bad Request (Validation error)
401: Unauthorized (Not authenticated)
403: Forbidden (Insufficient permissions)
404: Not Found (Resource not found)
409: Conflict (Duplicate entry)
500: Internal Server Error
```

---

## Database Schema

### Key Tables

- `users` - User accounts
- `roles` - User roles
- `permissions` - System permissions
- `role_permission_link` - Role-Permission relationships
- `books` - Book catalog
- `categories` - Book categories
- `subcategories` - Book subcategories
- `languages` - Supported languages
- `locations` - Physical locations
- `book_copies` - Physical book copies
- `issued_books` - Book circulation records
- `book_permissions` - Restricted book access
- `digital_access` - Digital access tracking
- `logs` - Audit logs
- `posts` - News/content posts
- `donation_info` - Donation settings

---

## Support & Troubleshooting

### Common Issues

1. **Permission Denied Error**
   - Check user role and assigned permissions
   - Contact admin to grant required permission

2. **Book Not Appearing in Library**
   - Book must be approved first
   - Check `is_approved` flag

3. **Cannot Issue Book**
   - Copy must be in "Available" status
   - Check copy status and location

4. **Upload Failed**
   - Check file size limits
   - Verify file format is allowed
   - Check Cloudinary credentials

### Contact Admin
- Email: admin@library.com
- Support: support@library.com

---

**Document Version:** 1.0  
**Last Updated:** June 25, 2026  
**Maintained By:** BookNest Admin Team
