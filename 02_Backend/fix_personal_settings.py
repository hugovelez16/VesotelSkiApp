from database import SessionLocal
from models import Company
from sqlalchemy.orm.attributes import flag_modified

def fix_personal_settings():
    db = SessionLocal()
    try:
        companies = db.query(Company).all()
        target = None
        for c in companies:
            if "personal" in c.name.lower():
                target = c
                break
        
        if target:
            print(f"Found company: {target.name}")
            # Settings match user screenshot:
            # Enable Tutorial: False
            # Enable Coordination: False
            # Allowed Rates: Hourly (checked)
            new_settings = {
                "allow_tutorial": False,
                "allow_coordination": False,
                "allowed_rates": ["hourly"]
            }
            
            target.settings = new_settings
            flag_modified(target, "settings")
            
            db.commit()
            print(f"Updated settings for {target.name}: {target.settings}")
        else:
            print("Company 'Personal' not found.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_personal_settings()
