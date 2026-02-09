
import os
import random
from datetime import datetime, timedelta, date, time
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User, WorkLog, WorkLogType, Company
from decimal import Decimal

# Helper to generate random time
def random_time(start_hour=8, end_hour=18):
    hour = random.randint(start_hour, end_hour)
    minute = random.choice([0, 15, 30, 45])
    return time(hour, minute)

def populate_data():
    session = SessionLocal()
    target_email = "velezgutierrezhugo@gmail.com"
    
    try:
        # 1. Find User
        user = session.query(User).filter(User.email == target_email).first()
        if not user:
            print(f"User {target_email} not found.")
            return

        company_id = user.default_company_id
        if not company_id:
            # Fallback: try to find any company membership
            member_company = session.query(Company).join(Company.members).filter(Company.members.any(user_id=user.id)).first()
            if member_company:
                company_id = member_company.id
            else:
                print("User has no default company and is not member of any company.")
                return

        print(f"Creating logs for user: {user.email} (ID: {user.id})")
        print(f"Company ID: {company_id}")

        # 2. Iterate last 90 days
        today = date.today()
        start_date = today - timedelta(days=90)
        
        logs_created = 0

        current_day = start_date
        while current_day <= today:
            
            # Skip some random days (e.g. weekends sometimes, or random)
            # 70% chance of working
            if random.random() < 0.7:
                
                # Decide Type: Particular (80%), Tutorial (20%)
                log_type = WorkLogType.particular
                if random.random() < 0.2:
                    log_type = WorkLogType.tutorial
                
                # Create Log
                log = WorkLog(
                    user_id=user.id,
                    company_id=company_id,
                    description=f"[SEED_DATA] Automated entry {current_day}",
                    type=log_type,
                    created_at=datetime.utcnow()
                )

                if log_type == WorkLogType.particular:
                    log.date = current_day
                    t_start = random_time(8, 14)
                    # Duration 2-8 hours
                    duration = Decimal(random.randint(2, 8)) + Decimal(random.choice([0, 0.5]))
                    
                    # End time
                    # Simple calculation for end time
                    start_dt = datetime.combine(current_day, t_start)
                    end_dt = start_dt + timedelta(hours=float(duration))
                    log.start_time = t_start
                    log.end_time = end_dt.time()
                    log.duration_hours = duration
                    
                    # Rate? Let's assume 20/h
                    rate = Decimal(20.00)
                    log.rate_applied = rate
                    log.amount = rate * duration
                    log.is_gross_calculation = False # Keep simple

                else: # Tutorial
                    # 1 to 3 days
                    days_duration = random.randint(1, 3)
                    end_log_date = current_day + timedelta(days=days_duration-1)
                    
                    log.start_date = current_day
                    log.end_date = end_log_date
                    log.duration_hours = Decimal(days_duration * 8) # Approx
                    
                    # Rate 150/day
                    daily_rate = Decimal(150.00)
                    log.amount = daily_rate * Decimal(days_duration)
                    log.rate_applied = daily_rate 
                    
                    # Jump loop to avoid overlapping tutorial days
                    current_day = end_log_date 
                
                session.add(log)
                logs_created += 1

            current_day += timedelta(days=1)
        
        session.commit()
        print(f"Successfully created {logs_created} records for dashboard testing.")

    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    populate_data()
