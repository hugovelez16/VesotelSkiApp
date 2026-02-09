import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import WorkLog, Company

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/postgres")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
session = SessionLocal()

target_id = "18f17427-eb82-4bb1-9002-c87ecd2ded11"

try:
    log = session.query(WorkLog).filter(WorkLog.id == target_id).first()
    if log:
        print(f"WorkLog Found: {log.id}")
        print(f"Description: {log.description}")
        print(f"Date: {log.date}")
        print(f"Duration Hours: {log.duration_hours}")
        print(f"Rate Applied: {log.rate_applied}")
        print(f"Is Gross Calculation: {log.is_gross_calculation}")
        print(f"Gross Amount: {log.gross_amount}")
        print(f"Net Amount: {log.amount}")
        
        # Check company settings
        company = session.query(Company).filter(Company.id == log.company_id).first()
        ss_rate = float(company.social_security_deduction or 0) if company else 0
        print(f"SS Deduction Rate: {ss_rate}")

        # Check Rate Logic
        if log.duration_hours and log.rate_applied:
            calc_gross = float(log.duration_hours) * float(log.rate_applied)
            print(f"Calculated Gross (Duration * Rate): {calc_gross}")
            print(f"Stored Gross: {float(log.gross_amount or 0)}")
            
            calc_net = calc_gross * (1 - ss_rate)
            print(f"Calculated Net from Rate: {calc_net}")
            print(f"Stored Net: {float(log.amount or 0)}")

    else:
        print(f"WorkLog {target_id} not found.")

except Exception as e:
    print(f"Error: {e}")
finally:
    session.close()
