from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, schemas, crud

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

def create_admin_user():
    db = SessionLocal()
    email = "admin@vesotel.com"
    password = "admin_password" # Change this!
    
    existing_user = crud.get_user_by_email(db, email)
    if existing_user:
        print(f"User {email} already exists.")
        return

    user_in = schemas.UserCreate(
        email=email,
        password=password,
        first_name="Admin",
        last_name="User"
    )
    
    try:
        user = crud.create_user(db, user_in)
        # Manually set role to admin if needed (schema doesn't have role in Create, but model does)
        user.role = models.UserRole.admin
        db.commit()
        print(f"Created admin user: {email} / {password}")
    except Exception as e:
        print(f"Error creating user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
