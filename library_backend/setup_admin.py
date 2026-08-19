import os
import sys
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# 1. Load Env (Zaroori hai taake Secret Key sahi load ho)
load_dotenv()

# 2. Path Setup
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '.')))

# 3. Imports
from database import SessionLocal
from auth import get_password_hash
from models.user_model import User, Role
from models.permission_model import Permission

def setup_initial_data():
    """
    Creates Roles (Admin, Student, Editor, Manager), Permissions,
    and a Default Super Admin User.
    """
    db: Session = SessionLocal()
    print("🚀 Connecting to database...")

    try:
        # ==========================================
        # 1. DEFINE ROLES & PERMISSIONS
        # ==========================================
        
        # A. All Roles List
        roles_to_create = ["Admin", "Student", "Editor", "Manager", "Member"]
        
        # B. All Permissions List (with admin-friendly descriptions)
        permissions_data = [
            # User & Role Management
            { 'name': 'USER_VIEW', 'description': 'View user profiles and basic user information.' },
            { 'name': 'USER_MANAGE', 'description': 'Create, edit, deactivate, or delete users.' },
            { 'name': 'ROLE_VIEW', 'description': 'View existing roles and their assigned permissions.' },
            { 'name': 'ROLE_MANAGE', 'description': 'Create, rename, or remove roles.' },
            { 'name': 'ROLE_PERMISSION_ASSIGN', 'description': 'Assign or revoke permissions for roles.' },
            { 'name': 'PERMISSION_VIEW', 'description': 'View available system permissions.' },
            { 'name': 'PERMISSION_MANAGE', 'description': 'Create or update permission records (meta-level).' },

            # Book Management
            { 'name': 'BOOK_VIEW', 'description': 'Search and view book records and details.' },
            { 'name': 'BOOK_MANAGE', 'description': 'Add, edit, or remove book records and metadata.' },
            { 'name': 'BOOK_ISSUE', 'description': 'Issue or return books to library members.' },
            { 'name': 'CATEGORY_MANAGE', 'description': 'Create and manage book categories and subcategories.' },
            { 'name': 'LANGUAGE_MANAGE', 'description': 'Manage language entries used for books.' },
            { 'name': 'LOCATION_MANAGE', 'description': 'Manage physical locations (branches, shelves).' },
            { 'name': 'COPY_MANAGE', 'description': 'Manage individual book copies (barcode, condition).' },
            { 'name': 'COPY_VIEW', 'description': 'View individual copy details and availability.' },

            # Requests & Circulation
            { 'name': 'REQUEST_CREATE', 'description': 'Create requests for books or resources.' },
            { 'name': 'REQUEST_VIEW', 'description': 'View user requests and their status.' },
            { 'name': 'REQUEST_APPROVE', 'description': 'Approve or reject incoming requests.' },
            { 'name': 'REQUEST_MANAGE', 'description': 'Manage request lifecycle and assignments.' },
            { 'name': 'ISSUE_VIEW', 'description': 'View issue/loan history and active issues.' },

            # System & Logs
            { 'name': 'LOG_VIEW', 'description': 'Access system audit logs and activity records.' },
            { 'name': 'FILE_UPLOAD', 'description': 'Upload files to the system (covers attachments).' },
            { 'name': 'DIGITAL_ACCESS_VIEW', 'description': 'View digital access / e-resource records.' },
            { 'name': 'BOOK_PERMISSION_MANAGE', 'description': 'Grant or revoke special book-level permissions for users.' },
            { 'name': 'BOOK_PERMISSION_VIEW', 'description': 'View book-level permission grants.' },
            { 'name': 'HOMEPAGE_BRANDING_MANAGE', 'description': 'Edit homepage theme, language, title, and hero badge.' },
            { 'name': 'HOMEPAGE_CONTENT_MANAGE', 'description': 'Edit homepage section content, headings, and featured books.' },
            { 'name': 'HOMEPAGE_LAYOUT_MANAGE', 'description': 'Edit homepage layout extras and optional blocks.' },
            { 'name': 'HOMEPAGE_VISIBILITY_MANAGE', 'description': 'Show/hide homepage sections for public users.' },
            { 'name': 'HOMEPAGE_SEARCH_MANAGE', 'description': 'Edit homepage search features: hints, voice, deep search, suggestions, and placeholder text.' }
        ]

        # ==========================================
        # 2. CREATE PERMISSIONS
        # ==========================================
        print(f"🛠  Checking {len(permissions_data)} permissions...")
        existing_perms = {p.name: p for p in db.query(Permission).all()}

        # Create missing permissions, and update missing descriptions for existing ones
        created = 0
        updated = 0
        for perm in permissions_data:
            name = perm['name']
            desc = perm.get('description')
            if name not in existing_perms:
                db.add(Permission(name=name, description=desc))
                created += 1
            else:
                # Update description if missing or empty
                existing = existing_perms[name]
                if desc and (not existing.description or existing.description.strip() == ''):
                    existing.description = desc
                    updated += 1

        if created:
            db.commit()
            print(f"✅ Added {created} new permissions.")
        else:
            print("✅ No new permissions to add.")

        if updated:
            db.commit()
            print(f"🔁 Updated descriptions for {updated} permissions.")

        # Reload all permissions map for assignment
        all_perms_map = {p.name: p for p in db.query(Permission).all()}

        # ==========================================
        # 3. CREATE ROLES & ASSIGN PERMISSIONS
        # ==========================================
        print("👤 Checking Roles...")
        
        for role_name in roles_to_create:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name)
                db.add(role)
                db.commit()
                db.refresh(role)
                print(f"   + Created Role: {role_name}")
            else:
                print(f"   - Role exists: {role_name}")
            
            # --- Permission Assignment Logic ---
            perms_to_assign = []
            
            if role_name == "Admin":
                # Admin gets EVERYTHING
                perms_to_assign = list(all_perms_map.values())
            
            elif role_name == "Manager":
                # Manager gets most things except system configs
                allowed = [
                    'BOOK_MANAGE', 'BOOK_ISSUE', 'USER_VIEW', 'REQUEST_APPROVE', 'REQUEST_MANAGE', 'LOG_VIEW',
                    'HOMEPAGE_BRANDING_MANAGE', 'HOMEPAGE_CONTENT_MANAGE', 'HOMEPAGE_LAYOUT_MANAGE',
                    'HOMEPAGE_VISIBILITY_MANAGE', 'HOMEPAGE_SEARCH_MANAGE'
                ]
                perms_to_assign = [all_perms_map[p] for p in allowed if p in all_perms_map]

            elif role_name == "Editor":
                # Editor manages books only
                allowed = ['BOOK_MANAGE', 'BOOK_VIEW', 'CATEGORY_MANAGE', 'BOOK_ISSUE']
                perms_to_assign = [all_perms_map[p] for p in allowed if p in all_perms_map]

            elif role_name in ["Student", "Member"]:
                # Students can only view books and make requests
                allowed = ['BOOK_VIEW', 'REQUEST_CREATE', 'REQUEST_VIEW']
                perms_to_assign = [all_perms_map[p] for p in allowed if p in all_perms_map]

            # Update Role Permissions
            role.permissions = perms_to_assign
            db.commit()

        # ==========================================
        # 4. CREATE / FIX ADMIN USER
        # ==========================================
        print("🔑 Checking Admin User...")
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        admin_user = db.query(User).filter(User.username == "admin").first()
        
        # Password hardcoded for recovery
        new_password = "admin" 
        hashed_pw = get_password_hash(new_password)

        if admin_user:
            # Update existing admin (Fixes 401 Error)
            admin_user.password_hash = hashed_pw
            admin_user.role_id = admin_role.id
            admin_user.status = "Active"
            print("✅ Admin user updated (Password reset to 'admin')")
        else:
            # Create new admin
            admin_user = User(
                username="admin",
                email="admin@library.com",
                full_name="Super Administrator",
                password_hash=hashed_pw,
                role_id=admin_role.id,
                status="Active"
            )
            db.add(admin_user)
            print("✅ Admin user created.")

        db.commit()
        print("\n🎉 SETUP COMPLETE! You can login with:")
        print(f"👉 Username: admin")
        print(f"👉 Password: {new_password}")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    setup_initial_data()