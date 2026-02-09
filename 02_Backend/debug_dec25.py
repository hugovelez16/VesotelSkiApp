
import logging
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from datetime import date as dt_date
from sqlalchemy import or_

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_logs():
    db: Session = SessionLocal()
    try:
        log_id = "750ccab0-ae5b-4a37-8046-fb0e007c9a69"
        print(f"--- Checking Log ID {log_id} ---")
        
        log = db.query(models.WorkLog).filter(models.WorkLog.id == log_id).first()
        if log:
            print(f"Found Log!")
            print(f"ID: {log.id}")
            print(f"Type: {log.type}")
            print(f"User ID: {log.user_id}")
            print(f"Company ID: {log.company_id}")
            print(f"Date: {log.date}")
            print(f"Start Date: {log.start_date}")
            print(f"End Date: {log.end_date}")
            print(f"Start Time: {log.start_time}")
            print(f"End Time: {log.end_time}")
            print(f"Is Gross: {log.is_gross_calculation}")
            print(f"Amounts: {log.amount}")
            
            # Check User
            user = db.query(models.User).filter(models.User.id == log.user_id).first()
            if user:
                print(f"User Name: {user.first_name} {user.last_name}")
            
        
        print("\n--- Checking for Duplicate Users ---")
        users = db.query(models.User).filter(models.User.first_name.ilike("%Jandro%")).all()
        for u in users:
            print(f"User: {u.first_name} {u.last_name} | ID: {u.id} | Email: {u.email} | Role: {u.role}")
            # Check memberships
            memberships = db.query(models.CompanyMember).filter(models.CompanyMember.user_id == u.id).all()
            for m in memberships:
                c = db.query(models.Company).filter(models.Company.id == m.company_id).first()
                print(f"  - Member of: {c.name} ({m.role}) | Status: {m.status}")

    finally:
        db.close()

if __name__ == "__main__":
    check_logs()
