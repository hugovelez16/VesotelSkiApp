from sqlalchemy.orm import Session
from database import SessionLocal
import models
import crud
import schemas
from uuid import UUID

def check_supervisor_role(email: str):
    db: Session = SessionLocal()
    try:
        user = crud.get_user_by_email(db, email)
        if not user:
            print(f"User {email} not found")
            return

        print(f"Checking user: {user.email} (ID: {user.id})")
        
        # Check memberships
        memberships = db.query(models.CompanyMember).filter(
            models.CompanyMember.user_id == user.id
        ).all()
        
        print(f"Found {len(memberships)} memberships:")
        for m in memberships:
            print(f" - Company: {m.company_id}, Role: {m.role}, Status: {m.status}")

        # Logic from main.py
        has_manager_role = db.query(models.CompanyMember).filter(
            models.CompanyMember.user_id == user.id,
            models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin]),
            models.CompanyMember.status == models.MemberStatus.active
        ).first()

        is_supervisor = True if has_manager_role else False
        print(f"\nComputed is_supervisor: {is_supervisor}")
        
    finally:
        db.close()

if __name__ == "__main__":
    # Check for a user that should be supervisor
    # Or list all supervisors
    print("--- Checking All Managers ---")
    db = SessionLocal()
    managers = db.query(models.CompanyMember).filter(
        models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin])
    ).all()
    
    if not managers:
        print("No managers found in DB!")
    else:
        for m in managers:
            u = db.query(models.User).get(m.user_id)
            print(f"Manager found: {u.email} in company {m.company_id} with role {m.role}")
            check_supervisor_role(u.email)

