import csv
import os
import uuid
from datetime import datetime, date, time
from decimal import Decimal
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, Company, WorkLog, CompanyMember, UserRole, CompanyRole, WorkLogType, MemberStatus
from auth import get_password_hash

CSV_PATH = "jandro_worklogs_full.csv"
TARGET_EMAIL = "jandrobamo@gmail.com"
TARGET_COMPANY_NAME = "Escuela Nacional"
DEFAULT_PASSWORD = "password123"

def parse_time(t_str):
    if not t_str:
        return None
    try:
        return datetime.strptime(t_str, "%H:%M").time()
    except ValueError:
        return None

def parse_date(d_str):
    if not d_str:
        return None
    try:
        return datetime.strptime(d_str, "%Y-%m-%d").date()
    except ValueError:
        return None

def import_data():
    session = SessionLocal()
    try:
        # 1. Start Transaction
        print("Starting legacy data migration...")

        # 2. Get or Create User
        user = session.query(User).filter(User.email == TARGET_EMAIL).first()
        if not user:
            print(f"Creating user: {TARGET_EMAIL}")
            user = User(
                email=TARGET_EMAIL,
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                first_name="Jandro",
                last_name="Legacy",
                role=UserRole.user,
                is_active=True
            )
            session.add(user)
            session.flush() # Get ID
        else:
            print(f"User {TARGET_EMAIL} already exists.")

        # 3. Get or Create Company
        company = session.query(Company).filter(Company.name == TARGET_COMPANY_NAME).first()
        if not company:
            print(f"Creating company: {TARGET_COMPANY_NAME}")
            company = Company(
                name=TARGET_COMPANY_NAME,
                settings={"description": "Legacy migration company"}
            )
            session.add(company)
            session.flush() # Get ID
        else:
            print(f"Company {TARGET_COMPANY_NAME} already exists.")

        # 4. Assign User to Company (if not already)
        membership = session.query(CompanyMember).filter(
            CompanyMember.user_id == user.id,
            CompanyMember.company_id == company.id
        ).first()

        if not membership:
            print(f"Assigning user to {TARGET_COMPANY_NAME}")
            membership = CompanyMember(
                user_id=user.id,
                company_id=company.id,
                role=CompanyRole.worker,
                status=MemberStatus.active
            )
            session.add(membership)
        
        # 5. Import Logs
        if not os.path.exists(CSV_PATH):
            print(f"Error: CSV file not found at {CSV_PATH}")
            return

        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            skipped = 0
            
            for row in reader:
                # Row data: id,date,isGrossCalculation,hasNight,duration,endTime,arrivesPrior,createdAt,hasCoordination,startTime,rateApplied,type,description,amount,userId
                
                log_date = parse_date(row.get('date'))
                start_time = parse_time(row.get('startTime'))
                end_time = parse_time(row.get('endTime'))
                amount = Decimal(row.get('amount') or 0)
                duration = Decimal(row.get('duration') or 0)
                description = row.get('description', '')
                log_type_str = row.get('type', 'particular').lower()
                
                # Enum mapping
                if log_type_str == 'tutorial':
                    log_type = WorkLogType.tutorial
                else:
                    log_type = WorkLogType.particular
                
                # Check duplicate (simple check by date + start_time + user)
                exists = session.query(WorkLog).filter(
                    WorkLog.user_id == user.id,
                    WorkLog.date == log_date,
                    WorkLog.start_time == start_time
                ).first()
                
                if exists:
                    print(f"Skipping duplicate log: {log_date} {start_time}")
                    skipped += 1
                    continue
                
                # Create Log
                work_log = WorkLog(
                    user_id=user.id,
                    company_id=company.id,
                    type=log_type,
                    date=log_date,
                    start_date=log_date, # Assuming single day
                    end_date=log_date,
                    start_time=start_time,
                    end_time=end_time,
                    duration_hours=duration,
                    amount=amount,
                    description=description,
                    rate_applied=Decimal(row.get('rateApplied') or 0),
                    is_gross_calculation=row.get('isGrossCalculation') == 'true',
                    has_night=row.get('hasNight') == 'true',
                    has_coordination=row.get('hasCoordination') == 'true',
                    arrives_prior=row.get('arrivesPrior') == 'true',
                    client=description # Using description as client if needed, or leave null. User asked to keep description.
                )
                session.add(work_log)
                count += 1
            
            session.commit()
            print(f"Migration complete. Imported: {count}, Skipped: {skipped}")

    except Exception as e:
        session.rollback()
        print(f"Error during migration: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    import_data()
