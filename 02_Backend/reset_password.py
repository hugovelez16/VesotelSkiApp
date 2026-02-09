from sqlalchemy.orm import Session
from database import SessionLocal
import models, crud
from auth import get_password_hash

def reset_admin_password():
    db = SessionLocal()
    email = "admin@vesotel.com"
    new_password = "Granada2025"
    
    print(f"Resetting password for {email}...")
    
    user = crud.get_user_by_email(db, email)
    if not user:
        print(f"Error: User {email} does not exist!")
        return

    try:
        # Force update password hash
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        print(f"Success! Password for {email} has been reset to: {new_password}")
    except Exception as e:
        print(f"Error resetting password: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin_password()
