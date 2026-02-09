
from database import SessionLocal
import models
from sqlalchemy import text

db = SessionLocal()
user_id = "87b68cbe-9d5b-4dac-976f-a01a07b24f17"

print(f"Checking logs for user: {user_id}")

try:
    logs = db.query(models.WorkLog).filter(models.WorkLog.user_id == user_id).all()
    print(f"Found {len(logs)} logs.")
    for log in logs:
        print(f"- {log.id} | {log.date} | {log.type}")

    # Check directly via SQL just in case
    sql = text("SELECT count(*) FROM work_logs WHERE user_id = :uid")
    result = db.execute(sql, {"uid": user_id}).scalar()
    print(f"SQL Count: {result}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
