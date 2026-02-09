from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def update_taxes():
    db = SessionLocal()
    try:
        # 1. Start by setting default for everyone?
        # User said: "6.48 only for Escuela Nacional, others default to Net and 0%"
        
        # Find Escuela Nacional
        escuela = db.query(models.Company).filter(models.Company.name.ilike("%Escuela Nacional%")).first()
        
        if escuela:
             print(f"Found Escuela Nacional: {escuela.name}")
             escuela.social_security_deduction = 0.0648
             # Escuela should probably use Gross calculation if tax is applied? 
             # User didn't specify, but tax is usually deducted from Gross.
             # If price is Net, then tax is added? No, usually Net means "what I get".
             # If we have a deduction, usually we start with Gross.
             # But let's just set the Company Tax Rate for now.
             
        # Find Others
        others = db.query(models.Company).filter(models.Company.name.notilike("%Escuela Nacional%")).all()
        for company in others:
            company.social_security_deduction = 0.0
            # We don't bulk update member rates here to avoid messing up existing overrides, 
            # unless user wants a hard reset. "Others default to net" -> implies new or reset?
            # I will leave existing user rates alone for now to be safe, unless explicitly asked to reset data.
        
        db.commit()
        print("Taxes updated successfully.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_taxes()
