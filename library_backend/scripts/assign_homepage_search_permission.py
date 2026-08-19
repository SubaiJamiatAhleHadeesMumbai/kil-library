"""
Assign HOMEPAGE_SEARCH_MANAGE permission to Admin and Manager roles.
Run: python scripts/assign_homepage_search_permission.py
"""
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
load_dotenv()

from database import SessionLocal
from models.permission_model import Permission
from models.user_model import Role


def main():
    db = SessionLocal()
    try:
        perm_name = 'HOMEPAGE_SEARCH_MANAGE'
        perm = db.query(Permission).filter(Permission.name == perm_name).first()
        if not perm:
            perm = Permission(name=perm_name, description='Manage homepage search settings')
            db.add(perm)
            db.commit()
            db.refresh(perm)
            print(f"Created permission: {perm_name} (id={perm.id})")
        else:
            print(f"Permission already exists: {perm_name} (id={perm.id})")

        target_roles = ['Admin', 'Manager']
        for rname in target_roles:
            role = db.query(Role).filter(Role.name == rname).first()
            if not role:
                print(f"Role not found: {rname}, skipping")
                continue

            # Ensure permission is assigned
            current_perms = {p.name for p in role.permissions} if role.permissions else set()
            if perm_name in current_perms:
                print(f"Role '{rname}' already has permission '{perm_name}'")
            else:
                role.permissions = role.permissions + [perm] if role.permissions else [perm]
                db.commit()
                print(f"Assigned '{perm_name}' to role '{rname}'")

    except Exception as e:
        print("Error:", e)
        db.rollback()
    finally:
        db.close()


if __name__ == '__main__':
    main()
