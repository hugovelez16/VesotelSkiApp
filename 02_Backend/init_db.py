import models
import auth
from database import SessionLocal, engine

def init_db():
    db = SessionLocal()
    try:
        print("Creating tables...")
        models.Base.metadata.create_all(bind=engine)
        print("Tables created.")

        # 1. Create Default Companies
        companies = ["Escuela Nacional", "MasSki", "Personal"]
        for name in companies:
            existing = db.query(models.Company).filter(models.Company.name == name).first()
            if not existing:
                new_company = models.Company(name=name, social_security_deduction=0.0)
                db.add(new_company)
                print(f"Created company: {name}")
            else:
                print(f"Company already exists: {name}")
        
        db.commit()

        # 2. Create Admin User
        admin_email = "admin@example.com"
        existing_admin = db.query(models.User).filter(models.User.email == admin_email).first()
        
        if not existing_admin:
            hashed_pwd = auth.get_password_hash("admin123")
            admin_user = models.User(
                email=admin_email,
                hashed_password=hashed_pwd,
                first_name="Admin",
                last_name="System",
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print(f"Created Admin User: {admin_email} / admin123")
        else:
            print(f"Admin user already exists: {admin_email}")

    except Exception as e:
        print(f"Error initializing DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
