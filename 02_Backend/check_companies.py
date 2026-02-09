from sqlalchemy.orm import Session
from database import SessionLocal
import models

def list_companies():
    db = SessionLocal()
    try:
        companies = db.query(models.Company).all()
        print(f"Found {len(companies)} companies:")
        for c in companies:
            print(f"- {c.name} (ID: {c.id})")
    finally:
        db.close()

if __name__ == "__main__":
    list_companies()
