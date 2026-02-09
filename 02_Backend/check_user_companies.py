from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys

# Database URL
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:Granada2025@postgres:5432/postgres"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_user_companies(email):
    db = SessionLocal()
    try:
        # Get User ID
        user_query = text("SELECT id, email FROM users WHERE email = :email")
        user = db.execute(user_query, {"email": email}).fetchone()
        
        if not user:
            print(f"User {email} not found.")
            return

        print(f"User Found: {user.email} (ID: {user.id})")

        # Get Company Memberships
        memberships_query = text("""
            SELECT cm.company_id, c.name, cm.status, cm.role 
            FROM company_members cm
            JOIN companies c ON cm.company_id = c.id
            WHERE cm.user_id = :user_id
        """)
        memberships = db.execute(memberships_query, {"user_id": user.id}).fetchall()
        
        print("\nCompany Memberships:")
        if not memberships:
            print("No memberships found.")
        else:
            for m in memberships:
                print(f"- Company: {m.name} | Status: {m.status} | Role: {m.role}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_user_companies("jandrobamo@gmail.com")
