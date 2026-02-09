import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from models import Company

# Add current directory to path so imports work
sys.path.append(os.getcwd())

def update_company_settings():
    # Create session
    db = next(get_db())
    
    try:
        companies = db.query(Company).all()
        
        for company in companies:
            print(f"Processing company: {company.name}")
            
            new_settings = {}
            if company.settings:
                new_settings = dict(company.settings)

            # Define configurations
            if "Escuela Nacional" in company.name:
                # Full features, Gross pricing
                new_settings.update({
                    "features": {
                        "tutorials": True,
                        "coordination": True,
                        "night_shifts": True,
                        "supplements": False
                    },
                    "billing": {
                        "price_type": "gross", # gross | net
                    },
                    "input_mode": "manual_single" # manual_single (rate * hours) | manual_total (override amount)
                })
                print(f"  -> Applied Escuela Nacional settings")
                
            elif "MasSki" in company.name:
                # Limited features, Net pricing, Supplements
                new_settings.update({
                    "features": {
                        "tutorials": False,
                        "coordination": False,
                        "night_shifts": False,
                        "supplements": True
                    },
                    "billing": {
                        "price_type": "net",
                        "cost_markup_percent": 32.0 # Example markup
                    },
                    "input_mode": "manual_single"
                })
                print(f"  -> Applied Masski settings")
                
            elif "Personal" in company.name:
                # Limited features, Flexible Input
                new_settings.update({
                    "features": {
                        "tutorials": False,
                        "coordination": False,
                        "night_shifts": False,
                        "supplements": False
                    },
                    "billing": {
                        "price_type": "gross"
                    },
                    "input_mode": "manual_total" # Allow entering total price directly
                })
                print(f"  -> Applied Personal settings")
            
            else:
                # Default for others
                new_settings.update({
                    "features": {
                        "tutorials": True,
                        "coordination": True,
                        "night_shifts": True
                    }
                })
                print(f"  -> Applied Default settings")

            company.settings = new_settings
            db.add(company)
        
        db.commit()
        print("Successfully updated company settings.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_company_settings()
