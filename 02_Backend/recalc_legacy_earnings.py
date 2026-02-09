import sys
import os
from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import crud

TARGET_EMAIL = "jandrobamo@gmail.com"
TARGET_COMPANY_NAME = "Escuela Nacional"

def recalculate():
    session = SessionLocal()
    try:
        print("Starting recalculation...")
        
        # 1. Get User and Company
        user = session.query(models.User).filter(models.User.email == TARGET_EMAIL).first()
        company = session.query(models.Company).filter(models.Company.name == TARGET_COMPANY_NAME).first()
        
        if not user or not company:
            print("User or Company not found.")
            return

        # 2. Get Rates
        user_rates = crud.get_user_rates(session, str(user.id), str(company.id))
        if not user_rates:
            print(f"No rates found for user in {TARGET_COMPANY_NAME}. Please configure them first.")
            return
            
        print(f"Using Hourly Rate: {user_rates.hourly_rate}")

        # 3. Get Logs
        logs = session.query(models.WorkLog).filter(
            models.WorkLog.user_id == user.id,
            models.WorkLog.company_id == company.id
        ).all()
        
        updated_count = 0
        
        for log in logs:
            # A. Recalculate Duration if Particular
            if log.type == models.WorkLogType.particular and log.start_time and log.end_time:
                # Naive duration calc for same day
                t1 = log.start_time
                t2 = log.end_time
                # Convert to datetime for subtraction
                dt1 = datetime.combine(date.min, t1)
                dt2 = datetime.combine(date.min, t2)
                diff = dt2 - dt1
                hours = diff.total_seconds() / 3600
                log.duration_hours = Decimal(hours)
                print(f"Log {log.date}: Recalculated duration to {hours}h")

            # B. Prepare Data for Earnings Calc
            # IMPORTANT: Force amount to None to trigger calculation
            log_data_dict = {
                'type': log.type,
                'duration_hours': float(log.duration_hours or 0),
                'start_date': log.start_date,
                'end_date': log.end_date,
                'has_coordination': log.has_coordination,
                'has_night': log.has_night,
                'is_gross_calculation': log.is_gross_calculation,
                'amount': None # FORCE RECALC
            }
            
            # C. Calculate
            # Need to fetch Company SS deduction if needed, but crud usually handles it?
            # crud.calculate_work_log_earnings takes user_rates object.
            company_ss = float(company.social_security_deduction or 0)
            
            new_amount, rate_used, _, _ = crud.calculate_work_log_earnings(user_rates, log_data_dict, company_ss)
            
            log.amount = Decimal(new_amount)
            log.rate_applied = Decimal(rate_used)
            updated_count += 1
            
        session.commit()
        print(f"Recalculated {updated_count} logs.")

    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    recalculate()
