from sqlalchemy import text
from sqlalchemy.orm import Session
import models
import crud
# Refactored for API call
def backfill_gross_amount_task(db: Session):
    # 1. Add Column (Raw SQL to be safe regardless of ORM)
    try:
        db.execute(text("ALTER TABLE work_logs ADD COLUMN gross_amount FLOAT DEFAULT 0.0"))
        db.commit()
        print("Column added.")
    except Exception as e:
        print(f"Column might exist: {e}")
        db.rollback()

    # 2. Iterate Logs
    logs = db.query(models.WorkLog).all()
    print(f"Found {len(logs)} logs to process...")
    
    count = 0
    for log in logs:
        # Get Rates
        user_rates = None
        social_security_deduction = 0.0
        
        if log.company_id:
             user_rates = crud.get_user_rates(db, str(log.user_id), str(log.company_id))
             company = db.query(models.Company).filter(models.Company.id == log.company_id).first()
             if company:
                social_security_deduction = company.social_security_deduction or 0.0

        # Construct log data dict for helper
        log_data = {
            "amount": None, 
            "type": log.type,
            "duration_hours": log.duration_hours,
            "start_time": log.start_time,
            "end_time": log.end_time,
            "start_date": log.start_date,
            "end_date": log.end_date,
            "has_coordination": log.has_coordination,
            "has_night": log.has_night,
            "is_gross_calculation": log.is_gross_calculation
        }

        # Calculate Theoretical
        th_net, th_rate, th_res_dur, th_is_gross, th_gross = crud.calculate_work_log_earnings(
            user_rates, log_data, social_security_deduction
        )

        # Comparison
        current_amount = float(log.amount) if log.amount is not None else 0.0
        diff = abs(th_net - current_amount)
        if diff < 0.02:
            # Matches
            log.gross_amount = th_gross
        else:
            # Mismatch
            if log.is_gross_calculation:
                deduction = 0.0
                if th_gross > 0:
                    deduction = 1.0 - (th_net / th_gross)
                
                if deduction > 0:
                     est_gross = current_amount / (1.0 - deduction)
                     log.gross_amount = est_gross
                else:
                     log.gross_amount = current_amount
            else:
                log.gross_amount = current_amount
        count += 1
        
    db.commit()
    return f"Processed {count} logs."

if __name__ == "__main__":
    from database import SessionLocal
    db = SessionLocal()
    print(backfill_gross_amount_task(db))
