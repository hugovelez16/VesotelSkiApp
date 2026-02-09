from database import SessionLocal
import models
from main import check_supervisor_access

def debug():
    db = SessionLocal()
    try:
        # 1. Get Logged In User (Hugo)
        email = "velezhugo345@gmail.com"
        hugo = db.query(models.User).filter(models.User.email == email).first()
        if not hugo:
            print(f"User {email} not found!")
            return

        print(f"Supervisor: {hugo.first_name} ID: {hugo.id}")

        # 2. Target User
        target_id = "87b68cbe-9d5b-4dac-976f-a01a07b24f17"
        
        # 3. Check Access
        print(f"Checking Access for Supervisor {hugo.id} -> Target {target_id}")
        has_access = check_supervisor_access(db, str(hugo.id), target_id)
        print(f"Result: {has_access}")

        # 4. Diagnose why
        print("--- Diagnosis ---")
        sup_memberships = db.query(models.CompanyMember).filter(
            models.CompanyMember.user_id == hugo.id,
            models.CompanyMember.status == models.MemberStatus.active
        ).all()
        
        elevated_companies = []
        for m in sup_memberships:
            role_val = str(m.role.value if hasattr(m.role, 'value') else m.role).lower()
            print(f"Supervisor Membership: Company {m.company_id} Role: {role_val} ({m.role})")
            if role_val in ['manager', 'admin', 'owner', 'supervisor']:
                elevated_companies.append(m.company_id)
        
        print(f"Elevated Companies: {elevated_companies}")

        target_memberships = db.query(models.CompanyMember).filter(
            models.CompanyMember.user_id == target_id,
            models.CompanyMember.status == models.MemberStatus.active
        ).all()
        
        for m in target_memberships:
            print(f"Target Membership: Company {m.company_id}")
            if m.company_id in elevated_companies:
                print(" -> MATCH FOUND!")

    finally:
        db.close()

if __name__ == "__main__":
    debug()
