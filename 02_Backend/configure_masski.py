from database import SessionLocal
from models import Company

def configure_masski():
    db = SessionLocal()
    try:
        # Search for Masski
        companies = db.query(Company).all()
        target = None
        for c in companies:
            if "masski" in c.name.lower():
                target = c
                break
        
        if target:
            print(f"Found company: {target.name}")
            # Ensure it is a dict
            current_settings = target.settings if isinstance(target.settings, dict) else {}
            
            # Update settings
            current_settings["allowed_rates"] = ["hourly"]
            current_settings["allow_tutorial"] = False
            current_settings["allow_coordination"] = False # This covers the "tampoco aparezca la opcion de coordinacion" request
            
            # Re-assign to trigger update
            target.settings = current_settings
            
            # Also needed to flag as modified for some sqlalchemy versions with JSON
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(target, "settings")
            
            db.commit()
            print(f"Updated settings for {target.name}: {target.settings}")
        else:
            print("Company 'Masski' not found.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    configure_masski()
