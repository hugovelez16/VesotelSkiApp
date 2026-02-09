from sqlalchemy.orm import Session
from database import SessionLocal
import models, crud
from auth import get_password_hash

def reset_hugo_password():
    db = SessionLocal()
    email = "hugo@vesotel.com"
    new_password = "X7k9#mP2$vQ5!rL"
    
    print(f"Resetting password for {email}...")
    
    user = crud.get_user_by_email(db, email)
    if not user:
        print(f"Error: User {email} does not exist!")
        # Try finding by first name just in case? No, email is unique key.
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
    reset_hugo_password()
