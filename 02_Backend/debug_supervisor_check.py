from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import sys

def debug_check():
    db = SessionLocal()
    try:
        supervisor_email = "velezhugh345@gmail.com"
        target_user_id = "87b68cbe-9d5b-4dac-976f-a01a07b24f17"
        
        # 1. Get Supervisor
        supervisor = db.query(models.User).filter(models.User.email == supervisor_email).first()
        if not supervisor:
            print(f"Supervisor with email {supervisor_email} NOT FOUND")
            return

        print(f"Supervisor Found: {supervisor.first_name} {supervisor.last_name} ({supervisor.id})")
        
        # 2. Get Target User
        target = db.query(models.User).filter(models.User.id == target_user_id).first()
        if not target:
            print(f"Target User {target_user_id} NOT FOUND")
        else:
            print(f"Target User Found: {target.first_name} {target.last_name}")

        # 3. Check Supervisor Companies
        sup_rates = db.query(models.UserCompanyRate).filter(models.UserCompanyRate.user_id == supervisor.id).all()
        print("\nSupervisor Roles:")
        managed_company_ids = []
        for r in sup_rates:
            print(f" - Company {r.company_id}: Role='{r.role}' Status='{r.status}'")
            if r.role in ['manager', 'admin', 'owner', 'supervisor']:
                managed_company_ids.append(r.company_id)
        
        print(f"\nManaged Company IDs: {managed_company_ids}")
        
        if not managed_company_ids:
            print("FAILURE: Supervisor manages NO companies.")
            return

        # 4. Check Target User Memberships
        target_rates = db.query(models.UserCompanyRate).filter(models.UserCompanyRate.user_id == target_user_id).all()
        print("\nTarget User Memberships:")
        target_company_ids = []
        for r in target_rates:
             print(f" - Company {r.company_id}: Role='{r.role}' Status='{r.status}'")
             target_company_ids.append(r.company_id)
             
        # 5. Check Intersection
        common = set(managed_company_ids).intersection(set(target_company_ids))
        print(f"\nIntersection (Managed & Member): {common}")
        
        if common:
             print("SUCCESS: Access SHOULD be granted.")
        else:
             print("FAILURE: No common company where supervisor has authority.")

    finally:
        db.close()

if __name__ == "__main__":
    debug_check()
