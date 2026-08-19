# 📖 LibraryNest Public Features - Complete User Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication & Registration](#authentication--registration)
3. [Browse & Search Books](#browse--search-books)
4. [Read Books](#read-books)
5. [User Profile Management](#user-profile-management)
6. [Bookmarks & Reading History](#bookmarks--reading-history)
7. [Restricted Book Access](#restricted-book-access)
8. [Authors & Publishers](#authors--publishers)
9. [Library News & Posts](#library-news--posts)
10. [Donations](#donations)
11. [User Interactions](#user-interactions)

---

## Overview

### What is the Public Library Platform?
A comprehensive digital library management system that allows users to:
- Browse and search books in multiple languages
- Read books online in real-time
- Track reading progress
- Bookmark favorite books
- Access restricted books by submitting requests
- View library news and updates
- Support the library through donations
- Manage personal profile and preferences

### Who Can Access?
- **Public Users**: Anyone can register and access public books
- **Authenticated Users**: Registered users can access all features
- **Restricted Content Users**: Users with approved access requests

### Platform Features
✅ Multi-language support (Urdu, Arabic, English)  
✅ Advanced search and filtering  
✅ Online book reader (PDF, TXT, ePub)  
✅ Reading progress tracking  
✅ Bookmarking system  
✅ User authentication (Email/Password & Google OAuth)  
✅ Responsive design (Desktop & Mobile)

---

## Authentication & Registration

### API Endpoints

#### 1. **Public Registration** (POST)
```
POST /api/public/register
Permission: None (Public)

Request Body:
{
  "username": "ahmed_reader",
  "email": "ahmed@example.com",
  "full_name": "Ahmed Ali",
  "password": "SecurePassword123!"
}

Response (201):
{
  "id": 5,
  "username": "ahmed_reader",
  "email": "ahmed@example.com",
  "full_name": "Ahmed Ali",
  "status": "Active",
  "role": {
    "id": 2,
    "name": "Member",
    "permissions": [
      "BOOK_VIEW",
      "POST_READ",
      "REQUEST_CREATE"
    ]
  },
  "date_joined": "2026-06-25T10:30:00"
}

Validations:
- Email must be unique and valid format
- Username must be 3-100 chars, unique
- Password must be min 8 chars
- All fields required
- Default role: "Member"
```

#### 2. **Login** (POST)
```
POST /api/token
Permission: None (Public)
Content-Type: application/x-www-form-urlencoded

Request Body:
{
  "username": "ahmed_reader",
  "password": "SecurePassword123!"
}

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 43200,  // 30 days in minutes
  "user": {
    "id": 5,
    "username": "ahmed_reader",
    "email": "ahmed@example.com",
    "full_name": "Ahmed Ali",
    "role": "Member",
    "permissions": [...]
  }
}

Error Responses:
- 401: Incorrect username or password
- 400: Username and password required
- 403: User account is inactive (suspended)
```

#### 3. **Google OAuth Login** (POST)
```
POST /api/auth/google
Permission: None (Public)

Request Body:
{
  "token": "google_oauth_token_here"
}

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 6,
    "username": "john.doe123",  // Auto-generated from email
    "email": "john@gmail.com",
    "full_name": "John Doe",
    "role": "Member"
  }
}

Flow:
1. Frontend sends Google OAuth token
2. Backend verifies with Google servers
3. If email doesn't exist, user auto-created
4. Access token returned for session
```

#### 4. **Logout** (POST)
```
POST /api/logout
Permission: Authenticated User

Response (200):
{
  "detail": "Successfully logged out"
}

Note: Token is invalidated on frontend (local storage cleared)
```

#### 5. **Forgot Password** (POST)
```
POST /api/auth/forgot-password/
Permission: None (Public)

Request Body:
{
  "email": "ahmed@example.com"
}

Response (200):
{
  "detail": "Password reset link sent to your email"
}

Process:
1. User submits email
2. System generates OTP/reset token
3. Email sent with reset link
4. User clicks link and creates new password
```

#### 6. **Reset Password** (POST)
```
POST /api/auth/reset-password/
Permission: None (Public)

Request Body:
{
  "token": "reset_token_from_email",
  "new_password": "NewPassword456!",
  "confirm_password": "NewPassword456!"
}

Response (200):
{
  "detail": "Password reset successfully. Please login with new password."
}

Validation:
- Token must be valid and not expired
- Passwords must match
- Min 8 characters
```

---

## Browse & Search Books

### API Endpoints

#### 1. **Get All Books** (GET)
```
GET /api/books/?skip=0&limit=50&search=quran&language_id=1&approved_only=true
Permission: None (Public) - Shows only approved books

Query Parameters:
{
  "skip": 0,              // Pagination offset
  "limit": 50,            // Items per page
  "search": "quran",      // Search term (title/author/ISBN)
  "language_id": 1,       // Filter by language (1=Urdu, 2=Arabic, 3=English)
  "category_id": 5,       // Filter by category
  "approved_only": true   // Show only approved books (default: true for public)
}

Response (200):
{
  "total_books": 342,
  "showing": 50,
  "books": [
    {
      "id": 100,
      "title": "Quran Shareef",
      "author": "Allah (SWT)",
      "publisher": "Islamic Publisher",
      "cover_image_url": "https://res.cloudinary.com/...",
      "pdf_url": "http://localhost:8000/uploads/pdfs/quran.pdf",
      "isbn": "978-1234567890",
      "language": {
        "id": 1,
        "name": "Urdu"
      },
      "subcategories": [
        {
          "id": 10,
          "name": "Quran & Hadith",
          "category": {
            "id": 1,
            "name": "Religious Books"
          }
        }
      ],
      "is_approved": true,
      "is_restricted": false,
      "is_digital": true,
      "total_copies": 5,
      "available_copies": 3,
      "description": "Holy Quran with Urdu translation",
      "price": 500.00,
      "created_at": "2026-06-25T10:30:00"
    },
    ...
  ]
}
```

#### 2. **Search Books** (GET)
```
GET /api/books/?search=tahafuz&language_id=1
Permission: None (Public)

Response (200):
[
  {
    "id": 101,
    "title": "Tahafuz-ul-Quran",
    "author": "Islamic Scholar",
    ...
  },
  ...
]

Search Filters:
- Title (case-insensitive)
- Author (case-insensitive)
- ISBN
- Language
- Category/Subcategory
- Approved status
```

#### 3. **Get Book Details** (GET)
```
GET /api/books/{book_id}/
Permission: None (Public) - if approved, or Authenticated with permission

Response (200):
{
  "id": 100,
  "title": "Quran Shareef",
  "author": "Allah (SWT)",
  "publisher": "Islamic Publisher",
  "translator": "Multiple Translators",
  "isbn": "978-1234567890",
  "edition": "5th Edition",
  "page_count": 600,
  "publication_year": 1400,
  "price": 500.00,
  "language": {
    "id": 1,
    "name": "Urdu"
  },
  "subcategories": [
    {
      "id": 10,
      "name": "Quran & Hadith",
      "category": {
        "id": 1,
        "name": "Religious Books"
      }
    }
  ],
  "cover_image_url": "https://res.cloudinary.com/...",
  "pdf_url": "http://localhost:8000/uploads/pdfs/quran.pdf",
  "txt_file_url": "http://localhost:8000/uploads/texts/quran.txt",
  "description": "Holy Quran with complete Urdu translation and commentary",
  "remarks": "Special edition for scholars",
  "is_approved": true,
  "is_restricted": false,
  "is_digital": true,
  "total_copies": 5,
  "available_copies": 3,
  "created_at": "2026-06-25T10:30:00"
}
```

#### 4. **Filter by Language** (GET)
```
GET /api/languages/
Permission: None (Public)

Response (200):
[
  {
    "id": 1,
    "name": "Urdu",
    "description": "Urdu Language Books"
  },
  {
    "id": 2,
    "name": "Arabic",
    "description": "Arabic Language Books"
  },
  {
    "id": 3,
    "name": "English",
    "description": "English Language Books"
  }
]
```

#### 5. **Filter by Category** (GET)
```
GET /api/categories/
Permission: None (Public)

Response (200):
[
  {
    "id": 1,
    "name": "Religious Books",
    "description": "Islamic and religious literature"
  },
  {
    "id": 2,
    "name": "Educational",
    "description": "Educational materials"
  },
  ...
]
```

---

## Read Books

### API Endpoints

#### 1. **Get Book for Reading** (GET)
```
GET /api/books/{book_id}/
Permission: Public (if approved) or Authenticated with access permission

Response (200):
{
  "id": 100,
  "title": "Quran Shareef",
  "author": "Allah (SWT)",
  "pdf_url": "http://localhost:8000/uploads/pdfs/quran.pdf",
  "txt_file_url": "http://localhost:8000/uploads/texts/quran.txt",
  "cover_image_url": "https://res.cloudinary.com/...",
  "page_count": 600,
  ...
}

File Types Supported:
- PDF: Rendered in browser with pdf.js
- TXT/Text: Display as plain text in browser
- ePub: Converted to HTML/PDF
```

#### 2. **Update Reading Progress** (POST)
```
POST /api/interaction/progress
Permission: Authenticated User

Request Body:
{
  "book_id": 100,
  "page_no": 45,
  "total_pages": 600
}

Response (200):
{
  "id": 50,
  "book_id": 100,
  "user_id": 5,
  "last_page_read": 45,
  "total_pages": 600,
  "completion_percentage": 7.5,
  "updated_at": "2026-06-25T14:30:00"
}

Usage:
- Called every few seconds while user is reading
- Tracks where user stopped
- Calculate completion percentage
- Resume from last page on next visit
```

#### 3. **Get Reading Progress** (GET)
```
GET /api/interaction/{book_id}
Permission: Authenticated User

Response (200):
{
  "book_id": 100,
  "last_page_read": 45,
  "total_pages": 600,
  "completion_percentage": 7.5,
  "is_bookmarked": true,
  "updated_at": "2026-06-25T14:30:00"
}

Usage:
- Check on page load
- Resume from last position
- Show progress bar
```

#### 4. **Toggle Bookmark** (POST)
```
POST /api/interaction/bookmark
Permission: Authenticated User

Request Body:
{
  "book_id": 100,
  "is_bookmarked": true
}

Response (200):
{
  "book_id": 100,
  "is_bookmarked": true,
  "updated_at": "2026-06-25T14:30:00"
}
```

---

## User Profile Management

### API Endpoints

#### 1. **Get My Profile** (GET)
```
GET /api/profile/
Permission: Authenticated User

Response (200):
{
  "id": 5,
  "username": "ahmed_reader",
  "email": "ahmed@example.com",
  "full_name": "Ahmed Ali",
  "status": "Active",
  "role": {
    "id": 2,
    "name": "Member",
    "permissions": [
      "BOOK_VIEW",
      "POST_READ",
      "REQUEST_CREATE"
    ]
  },
  "date_joined": "2026-06-25T10:30:00",
  "updated_at": "2026-06-25T14:30:00"
}
```

#### 2. **Update Profile** (PUT)
```
PUT /api/profile/
Permission: Authenticated User

Request Body:
{
  "full_name": "Ahmed Ali Updated"
}

Response (200):
{
  "id": 5,
  "full_name": "Ahmed Ali Updated",
  ...
}

Fields You Can Update:
- full_name: Your display name
```

#### 3. **Change Password** (POST)
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

Validations:
- Current password must be correct
- New passwords must match
- Min 8 characters
- Cannot be same as current password
```

---

## Bookmarks & Reading History

### API Endpoints

#### 1. **Get Bookmarked Books** (GET)
```
GET /api/interaction/bookmarks/?skip=0&limit=50
Permission: Authenticated User

Response (200):
[
  {
    "book_id": 100,
    "book": {
      "id": 100,
      "title": "Quran Shareef",
      "cover_image_url": "https://...",
      "author": "Allah (SWT)"
    },
    "is_bookmarked": true,
    "bookmarked_at": "2026-06-20T10:30:00"
  },
  ...
]
```

#### 2. **Get Reading History** (GET)
```
GET /api/history/?skip=0&limit=50
Permission: Authenticated User

Response (200):
[
  {
    "id": 100,
    "title": "Quran Shareef",
    "author": "Allah (SWT)",
    "cover_image_url": "https://...",
    "last_read": "2026-06-25T14:30:00",
    "last_page_read": 45,
    "total_pages": 600,
    "completion_percentage": 7.5,
    "is_bookmarked": true
  },
  ...
]
```

#### 3. **Clear History** (DELETE)
```
DELETE /api/history/
Permission: Authenticated User

Response (204): No Content
```

#### 4. **Remove from History** (DELETE)
```
DELETE /api/history/{book_id}
Permission: Authenticated User

Response (204): No Content
```

---

## Restricted Book Access

### Overview
Some books are marked as restricted and require special access permission. Users can request access by filling a form with their details and purpose.

### API Endpoints

#### 1. **Submit Access Request** (POST)
```
POST /api/restricted-requests/submit
Permission: Authenticated User

Request Body:
{
  "book_id": 150,
  "name": "Ahmed Ali",
  "age": "25",
  "location": "Karachi",
  "whatsapp": "+923001234567",
  "qualification": "Bachelor in Islamic Studies",
  "institution": "Al-Azhar University",
  "teachers": "Sheikh Muhammad Ali, Prof. Ahmad Khan",
  "is_salafi": true,
  "purpose": [
    "Islamic Research",
    "Educational Purpose"
  ],
  "previous_work": "Published 2 research papers on Islamic jurisprudence"
}

Response (201):
{
  "id": 1,
  "book_id": 150,
  "user_id": 5,
  "name": "Ahmed Ali",
  "age": "25",
  "location": "Karachi",
  "whatsapp": "+923001234567",
  "qualification": "Bachelor in Islamic Studies",
  "institution": "Al-Azhar University",
  "teachers": "Sheikh Muhammad Ali, Prof. Ahmad Khan",
  "is_salafi": true,
  "purpose": "Islamic Research, Educational Purpose",
  "previous_work": "Published 2 research papers on Islamic jurisprudence",
  "status": "pending",
  "rejection_reason": null,
  "created_at": "2026-06-25T14:30:00"
}

Validations:
- Book must exist and be restricted
- User must be authenticated
- All required fields must be filled
- WhatsApp number must be valid format
```

#### 2. **Get My Access Requests** (GET)
```
GET /api/restricted-requests/?skip=0&limit=50&status=pending
Permission: Authenticated User

Query Parameters:
- skip: Pagination offset
- limit: Items per page
- status: pending, approved, rejected

Response (200):
[
  {
    "id": 1,
    "book": {
      "id": 150,
      "title": "Advanced Islamic Jurisprudence",
      "cover_image_url": "https://..."
    },
    "status": "pending",
    "rejection_reason": null,
    "created_at": "2026-06-25T14:30:00",
    "updated_at": "2026-06-25T14:30:00"
  },
  ...
]
```

#### 3. **Resubmit Request** (POST)
```
POST /api/restricted-requests/submit
Permission: Authenticated User

Request Body: (same as original submission)

Response (200):
{
  "id": 1,  // Same request, updated
  "status": "pending",  // Reset to pending
  "rejection_reason": null,
  ...
}

Workflow:
- If request was rejected, user can submit again
- If request was approved, status stays approved
- Only pending requests prevent resubmission
```

#### 4. **Get Access Request Details** (GET)
```
GET /api/restricted-requests/{request_id}/
Permission: Authenticated User (owner only)

Response (200):
{
  "id": 1,
  "book": {...},
  "status": "approved",
  "rejection_reason": null,
  "created_at": "2026-06-25T14:30:00"
}
```

---

## Authors & Publishers

### API Endpoints

#### 1. **Get All Authors** (GET)
```
GET /api/public/authors/?skip=0&limit=100&search=shah
Permission: None (Public)

Query Parameters:
- search: Author name search
- skip, limit: Pagination

Response (200):
[
  {
    "id": 1,
    "name": "Maulana Abul Kalam Azad",
    "biography": "Prominent Islamic scholar...",
    "birth_year": 1888,
    "books_count": 15,
    "books": [
      {
        "id": 100,
        "title": "Quran Shareef",
        "cover_image_url": "https://..."
      },
      ...
    ]
  },
  ...
]
```

#### 2. **Get Author Details** (GET)
```
GET /api/public/authors/{author_id}/
Permission: None (Public)

Response (200):
{
  "id": 1,
  "name": "Maulana Abul Kalam Azad",
  "biography": "Prominent Islamic scholar and freedom fighter...",
  "birth_year": 1888,
  "death_year": 1958,
  "origin_country": "India",
  "books_count": 15,
  "books": [
    {
      "id": 100,
      "title": "Quran Shareef",
      "published_year": 1950,
      "cover_image_url": "https://..."
    },
    ...
  ]
}
```

#### 3. **Get All Publishers** (GET)
```
GET /api/public/publishers/?skip=0&limit=100&search=Islamic
Permission: None (Public)

Response (200):
[
  {
    "id": 1,
    "name": "Islamic Publishers International",
    "location": "Cairo, Egypt",
    "books_count": 42,
    "books": [...]
  },
  ...
]
```

#### 4. **Get Publisher Details** (GET)
```
GET /api/public/publishers/{publisher_id}/
Permission: None (Public)

Response (200):
{
  "id": 1,
  "name": "Islamic Publishers International",
  "location": "Cairo, Egypt",
  "founded_year": 1995,
  "books_count": 42,
  "books": [...]
}
```

---

## Library News & Posts

### API Endpoints

#### 1. **Get Latest Posts** (GET)
```
GET /api/posts/?skip=0&limit=20&published=true
Permission: None (Public)

Query Parameters:
- skip, limit: Pagination
- published: true/false

Response (200):
[
  {
    "id": 1,
    "title": "Weekly Library Update - New 50 Books Added",
    "content": "This week we're excited to announce...",
    "tags": "library,update,new-books",
    "author_name": "Admin User",
    "published": true,
    "media_type": "image",  // image, pdf, none
    "file_url": "https://res.cloudinary.com/...",
    "created_at": "2026-06-24T10:30:00"
  },
  ...
]
```

#### 2. **Get Post Details** (GET)
```
GET /api/posts/{post_id}/
Permission: None (Public)

Response (200):
{
  "id": 1,
  "title": "Weekly Library Update",
  "content": "This week we're excited to announce...",
  "tags": "library,update,new-books",
  "author_name": "Admin User",
  "author_id": 1,
  "published": true,
  "media_type": "image",
  "file_url": "https://res.cloudinary.com/...",
  "created_at": "2026-06-24T10:30:00",
  "updated_at": "2026-06-24T11:00:00"
}
```

#### 3. **Search Posts** (GET)
```
GET /api/posts/?search=ramadan
Permission: None (Public)

Response (200):
[
  {
    "id": 5,
    "title": "Ramadan Special: Islamic Books Collection",
    ...
  },
  ...
]
```

---

## Donations

### API Endpoints

#### 1. **Get Donation Information** (GET)
```
GET /api/donation/
Permission: None (Public)

Response (200):
{
  "id": 1,
  "qr_code_desktop": "https://res.cloudinary.com/.../qr_desktop.png",
  "qr_code_mobile": "https://res.cloudinary.com/.../qr_mobile.png",
  "appeal_desktop": "https://res.cloudinary.com/.../appeal_desktop.png",
  "appeal_mobile": "https://res.cloudinary.com/.../appeal_mobile.png",
  "bank_desktop": "https://res.cloudinary.com/.../bank_desktop.png",
  "bank_mobile": "https://res.cloudinary.com/.../bank_mobile.png"
}

Usage:
- Show QR code for mobile payments
- Display donation appeal information
- Show bank details for transfers
- Responsive images for desktop and mobile
```

---

## User Interactions

### Database Models

```python
UserBookInteraction {
  id: Integer (Primary Key)
  user_id: Integer (Foreign Key -> User)
  book_id: Integer (Foreign Key -> Book)
  last_page_read: Integer (Current page position)
  total_pages: Integer (Total pages in book)
  is_bookmarked: Boolean (User marked as favorite)
  notes: Text (Optional personal notes)
  updated_at: DateTime
}

AccessRequest {
  id: Integer (Primary Key)
  user_id: Integer (Foreign Key -> User)
  book_id: Integer (Foreign Key -> Book)
  name: String (User's name)
  age: String (User's age)
  location: String (User's location)
  whatsapp: String (Contact WhatsApp)
  qualification: String (Educational qualification)
  institution: String (School/University)
  teachers: Text (List of teachers/mentors)
  is_salafi: Boolean (Salafi methodology)
  purpose: Text (Purpose for access)
  previous_work: Text (Previous research/work)
  status: String (pending, approved, rejected)
  rejection_reason: Text (Why rejected)
  created_at: DateTime
  updated_at: DateTime
}
```

---

## Frontend User Routes

### Public Routes (No Authentication Required)

```
/                          - Home page
/news                      - Library news feed
/posts                     - Latest posts
/authors                   - Browse authors
/publishers                - Browse publishers
/books                     - Browse all books
/books/:id                 - Book details
/login                     - Login page
/register                  - Registration page
/forgot-password           - Forgot password
/reset-password            - Reset password
/test-editor               - Urdu editor test
```

### Protected Routes (Authentication Required)

```
/read/:id                  - Read book
/history                   - Reading history
/profile                   - User profile
/admin/*                   - Admin panel (with role restriction)
```

---

## Common User Workflows

### Workflow 1: Register & Browse Books

1. Go to `/register`
2. Fill in username, email, full name, password
3. Click "Register"
4. System creates account with default "Member" role
5. Redirect to home page
6. Can now browse books at `/books`

### Workflow 2: Login & Read Book

1. Go to `/login`
2. Enter username/email and password
3. Click "Login"
4. Redirect to home page
5. Browse books or search
6. Click on book to view details
7. Click "Read Online" to open reader
8. Reading progress automatically tracked

### Workflow 3: Request Access to Restricted Book

1. Find restricted book (has lock icon)
2. Click "Request Access"
3. Fill in personal details:
   - Name, age, location
   - WhatsApp contact
   - Education/qualification
   - Purpose of access
4. Submit form
5. Status shows "Pending"
6. Admin reviews and approves/rejects
7. If approved, can read book
8. If rejected, can resubmit with updated info

### Workflow 4: Save Reading Progress

1. Open book in reader at `/read/:id`
2. Read book content
3. Progress automatically saved every few seconds
4. Can close browser anytime
5. Next visit, continue from last page

### Workflow 5: Bookmark & Manage Library

1. While reading book, click bookmark icon
2. Book saved to bookmarks
3. Go to `/history` to view all reading history
4. See bookmarked books at top
5. Click to resume reading
6. Can remove from history if needed

### Workflow 6: Use Google Login

1. Go to `/login`
2. Click "Login with Google"
3. Select Google account
4. System auto-creates account if first time
5. Auto-login and redirect to home

---

## Error Codes & Messages

```
200: Success
201: Created (Registration successful)
204: No Content (Deletion successful)

400: Bad Request
  - Invalid email format
  - Username already taken
  - Password too short
  - Missing required fields

401: Unauthorized
  - Incorrect username/password
  - Token expired
  - User account inactive

403: Forbidden
  - User suspended
  - No access permission for restricted book

404: Not Found
  - Book not found
  - User not found
  - Post not found

409: Conflict
  - Email already registered
  - Username already taken
  - Duplicate access request pending

500: Internal Server Error
  - Database connection failed
  - File upload failed
  - Unexpected error
```

---

## Browser Compatibility

### Supported Browsers

✅ Google Chrome (latest)  
✅ Mozilla Firefox (latest)  
✅ Safari (latest)  
✅ Microsoft Edge (latest)  
✅ Mobile browsers (iOS Safari, Chrome Mobile)

### System Requirements

- **Minimum RAM**: 2GB
- **Minimum Storage**: 100MB
- **Internet Speed**: 1Mbps minimum (recommended 5Mbps)
- **Screen Size**: Works on all devices (responsive design)

---

## Security & Privacy

### Your Data is Safe

✅ Passwords encrypted with bcrypt  
✅ OAuth tokens validated with Google  
✅ HTTPS encryption for all data  
✅ Session tokens expire after 30 days  
✅ No sensitive data stored locally  

### Privacy Policy

- Your reading history is private to you
- Admins cannot see your personal notes
- Email not shared with third parties
- No tracking cookies (except necessary ones)
- Can delete account anytime

---

## Performance Tips

### For Fast Reading Experience

1. **Use Desktop/Laptop**: Faster than mobile
2. **Fast Internet**: 5Mbps+ recommended
3. **Clear Browser Cache**: Speeds up loading
4. **Use Latest Browser**: Better performance
5. **Close Other Tabs**: Dedicate resources

### Mobile Tips

1. Download PDFs when WiFi available
2. Read offline from cache
3. Use mobile-optimized view
4. Close unnecessary apps

---

## Accessibility Features

### For Users with Disabilities

✅ Keyboard navigation supported  
✅ Screen reader compatible  
✅ Adjustable font sizes  
✅ High contrast mode  
✅ Text-to-speech option (coming soon)  
✅ ARIA labels for images  

### Browser Accessibility Settings

- Increase font size: Ctrl + (+) on keyboard
- Decrease font size: Ctrl + (-) on keyboard
- Zoom: Ctrl + scroll wheel
- Contrast: Windows > Settings > Ease of Access

---

## Frequently Asked Questions

### Account & Authentication

**Q: How do I create an account?**  
A: Go to `/register`, fill in your details, and click Register.

**Q: What if I forget my password?**  
A: Click "Forgot Password" on login page, enter your email, and follow the reset link.

**Q: Can I use Google login?**  
A: Yes! Click "Login with Google" and select your account.

**Q: How long does my session last?**  
A: 30 days. After that, you'll need to login again.

### Books & Reading

**Q: How do I search for books?**  
A: Use the search bar on `/books` page to search by title, author, or ISBN.

**Q: How do I read a book online?**  
A: Find the book and click "Read Online" button.

**Q: Where does my reading progress save?**  
A: Progress is saved automatically to your account.

**Q: What if I'm offline?**  
A: Download PDFs while online to read offline.

### Restricted Books

**Q: What are restricted books?**  
A: Books with special content requiring approval.

**Q: How do I get access?**  
A: Submit an access request with your details and purpose.

**Q: How long does approval take?**  
A: Usually 1-3 business days.

**Q: Can I resubmit if rejected?**  
A: Yes, you can update your request and resubmit.

### Donations

**Q: How can I donate?**  
A: Go to Donations page and scan QR code or transfer to bank details.

**Q: Is my donation tax deductible?**  
A: Check with local tax authorities. We issue receipt.

**Q: Where does my donation go?**  
A: Used to purchase new books and maintain the library.

---

## Contact & Support

### Need Help?

📧 **Email**: support@library.com  
📱 **WhatsApp**: +92-300-XXXX-XXXX  
🌐 **Website**: www.library.com  
💬 **Chat**: Available in app (9 AM - 5 PM)  

### Report Issues

1. Click "Report Issue" in app
2. Describe the problem
3. Provide your email
4. Support team will respond within 24 hours

### Feedback & Suggestions

We'd love to hear from you! Share your suggestions to improve the platform.

---

## Glossary

| Term | Definition |
|------|-----------|
| **Bookmark** | Mark a book as favorite for quick access |
| **Reading Progress** | Track which page you're on in a book |
| **Restricted Book** | Book requiring special access permission |
| **Access Request** | Form to request access to restricted books |
| **OAuth** | Secure login using Google/Microsoft account |
| **PDF** | Portable Document Format - common ebook format |
| **ePub** | Electronic Publication - digital book standard |

---

**Document Version:** 1.0  
**Last Updated:** June 25, 2026  
**Maintained By:** LibraryNest Support Team

---

## Quick Reference

### Most Used Links

- Home: `/`
- Browse Books: `/books`
- Read Book: `/read/:id`
- My Profile: `/profile`
- Reading History: `/history`
- Login: `/login`
- Register: `/register`

### Most Used APIs

- Search books: `GET /api/books/?search=...`
- Get book details: `GET /api/books/:id`
- Update progress: `POST /api/interaction/progress`
- Get profile: `GET /api/profile/`
- Submit access request: `POST /api/restricted-requests/submit`
- Get donation info: `GET /api/donation/`

---

*End of Document - For Admin Documentation, see ADMIN_FEATURES_DOCUMENTATION.md*
