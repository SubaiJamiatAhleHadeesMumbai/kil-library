"""
Check whether HOMEPAGE_SEARCH_MANAGE is assigned to Admin and Manager roles.
Run: python scripts/check_homepage_search_assignment.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from database import SessionLocal
from models.user_model import Role


def main():
    db = SessionLocal()
    try:
        for role_name in ['Admin', 'Manager']:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                print(f"Role not found: {role_name}")
                continue
            perms = [p.name for p in role.permissions] if role.permissions else []
            has = 'HOMEPAGE_SEARCH_MANAGE' in perms
            print(f"Role: {role_name} (id={role.id})")
            print(f"  Permissions count: {len(perms)}")
            if len(perms) <= 20:
                print(f"  Permissions: {perms}")
            else:
                print(f"  Sample permissions: {perms[:10]} ...")
            print(f"  -> HOMEPAGE_SEARCH_MANAGE assigned: {has}\n")
    finally:
        db.close()

if __name__ == '__main__':
    main()
