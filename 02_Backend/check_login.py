
from database import SessionLocal
import models
import auth

def check_login():
    db = SessionLocal()
    email = "hugo@vesotel.com"
    password = "admin123"
    
    print(f"Checking user: {email}")
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        print("User NOT found in DB!")
        return
        
    print(f"User found. ID: {user.id}")
    print(f"Role: {user.role}")
    print(f"Stored Hash: {user.hashed_password}")
    
    # Check Hash
    is_valid = auth.verify_password(password, user.hashed_password)
    print(f"Password '{password}' valid? {is_valid}")

if __name__ == "__main__":
    check_login()
