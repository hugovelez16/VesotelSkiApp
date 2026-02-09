
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL as DATABASE_URL

def find_user_membership():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        # Find User
        users = connection.execute(text("SELECT id, first_name, last_name, email FROM users WHERE first_name LIKE '%Jandro%' OR last_name LIKE '%Velez%'"))
        
        for u in users:
            print(f"User: {u.first_name} {u.last_name} ({u.id})")
            
            # Find Memberships
            memberships = connection.execute(text(f"""
                SELECT c.name, cm.role, cm.status 
                FROM company_members cm 
                JOIN companies c ON c.id = cm.company_id 
                WHERE cm.user_id = '{u.id}'
            """))
            
            for m in memberships:
                print(f"  - Company: {m.name}, Role: {m.role}, Status: {m.status}")

if __name__ == "__main__":
    find_user_membership()
