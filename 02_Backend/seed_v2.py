
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import auth
import uuid

def seed_companies_and_rates():
    db = SessionLocal()
    try:
        # 1. Create Default Companies
        companies = {
            "Escuela Nacional": "ced69046-281b-432d-944e-1284d7ec6a01", # Fixed UUIDs for simplicity/reproducibility if needed, or let DB generate
            "MasSki": "b8f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0",
            "Personal": "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1"
        }
        
        company_objs = {}
        # 2. Upsert Admin User
        admin_email = "hugo@vesotel.com"
        admin_user = db.query(models.User).filter(models.User.email == admin_email).first()
        if not admin_user:
            hashed_pwd = auth.get_password_hash("admin123")
            admin_user = models.User(
                email=admin_email,
                hashed_password=hashed_pwd,
                first_name="Admin",
                last_name="Hugo",
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print(f"Created admin user: {admin_email}")
        else:
            # Ensure role is admin if it exists
            if admin_user.role != "admin":
                admin_user.role = "admin"
                db.commit()
                print(f"Updated user {admin_email} to admin role")
            print(f"Admin user already exists: {admin_email}")

        for name, fixed_id in companies.items():
            deduction = 0.0
            if name == "Escuela Nacional":
                deduction = 0.0648
            
            existing = db.query(models.Company).filter(models.Company.name == name).first()
            if not existing:
                new_company = models.Company(name=name, social_security_deduction=deduction)
                # If we want fixed IDs:
                # new_company = models.Company(id=fixed_id, name=name, social_security_deduction=deduction)
                db.add(new_company)
                db.commit()
                db.refresh(new_company)
                company_objs[name] = new_company
                print(f"Created company: {name} with deduction {deduction}")
            else:
                # Update deduction if changed
                if abs(float(existing.social_security_deduction or 0) - deduction) > 0.0001:
                    existing.social_security_deduction = deduction
                    db.commit()
                    print(f"Updated deduction for {name}")
                
                company_objs[name] = existing
                print(f"Company exists: {name}")

        # 2. Migrate UserSettings to UserCompanyRate (for existing users)
        # Fetch all users
        users = db.query(models.User).all()
        # Fetch old settings (if table exists physically, but here we can't access it via ORM easily as we deleted the model class)
        # Since we modified the model class, we assume this is a FRESH START or we are running this AFTER resetting DB.
        # User requested "pass directly to Phase 2", implying we can set up the new structure.
        
        # If we have users but no rates, create default rates for them for the "Personal" company or all?
        # Let's create a default rate entry for each user for "Personal" company as a fallback
        
        personal_company = company_objs["Personal"]
        
        for user in users:
            # Check if rate exists
            existing_rate = db.query(models.UserCompanyRate).filter_by(user_id=user.id, company_id=personal_company.id).first()
            if not existing_rate:
                # Initialize with some defaults
                new_rate = models.UserCompanyRate(
                    user_id=user.id,
                    company_id=personal_company.id,
                    hourly_rate=0.0,
                    daily_rate=0.0,
                    is_gross=True
                )
                db.add(new_rate)
                print(f"Created default rates for user {user.email} -> Personal")
        
        db.commit()
        
    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

def migrate_schema():
    """Manual schema migration for V2"""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        # Add company_id to work_logs
        try:
            db.execute(text("ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);"))
            print("Added company_id to work_logs")
        except Exception as e:
            print(f"Skipped altering work_logs (might exist): {e}")

        # Add other columns if needed (e.g. User.default_company_id if I added it, but I didn't yet)
        
        db.commit()
    except Exception as e:
        print(f"Migration error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure tables exist (naive migration)
    models.Base.metadata.create_all(bind=engine)
    migrate_schema()
    seed_companies_and_rates()
