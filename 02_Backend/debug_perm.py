from database import SessionLocal
import models
from main import check_supervisor_access

def debug():
    db = SessionLocal()
    try:
        user_id = "87b68cbe-9d5b-4dac-976f-a01a07b24f17"
        company_id = "e5c94a68-44ce-4789-84f1-44a5f56eba56"
        
        print(f"Checking managers for Company {company_id}")
        managers = db.query(models.CompanyMember).filter(
            models.CompanyMember.company_id == company_id,
            models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin])
        ).all()
        
        for m in managers:
            print(f"Manager ID: {m.user_id} Role: {m.role}")
            has_access = check_supervisor_access(db, str(m.user_id), user_id)
            print(f" -> check_supervisor_access(manager, user): {has_access}")
            
    finally:
        db.close()

if __name__ == "__main__":
    debug()
