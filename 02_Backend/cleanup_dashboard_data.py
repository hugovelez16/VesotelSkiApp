
import os
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, WorkLog

def cleanup_data():
    session = SessionLocal()
    target_email = "velezgutierrezhugo@gmail.com"
    
    try:
        # 1. Find User
        user = session.query(User).filter(User.email == target_email).first()
        if not user:
            print(f"User {target_email} not found.")
            return

        print(f"Cleaning up seeded logs for user: {user.email}")

        # 2. Delete logs with specific tag
        # Using the tag [SEED_DATA] we added in the populate script
        deleted_count = session.query(WorkLog).filter(
            WorkLog.user_id == user.id,
            WorkLog.description.ilike("%[SEED_DATA]%")
        ).delete(synchronize_session=False)
        
        session.commit()
        print(f"Successfully deleted {deleted_count} seed records.")

    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    cleanup_data()
