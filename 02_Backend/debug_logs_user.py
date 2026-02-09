from database import SessionLocal
import models
import sys

def debug():
    db = SessionLocal()
    try:
        uid = "87b68cbe-9d5b-4dac-976f-a01a07b24f17"
        logs = db.query(models.WorkLog).filter(models.WorkLog.user_id == uid).all()
        print(f"User {uid} has {len(logs)} logs.")
        for l in logs[:5]:
            print(f" - Date: {l.date} Type: {l.type} Company: {l.company_id} Amount: {l.amount}")
    finally:
        db.close()

if __name__ == "__main__":
    debug()
