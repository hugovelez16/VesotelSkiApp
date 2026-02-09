
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL as DATABASE_URL

TARGET_ID = "7618c3dd-a693-4071-b09d-075317af8871"

def check_members():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        members = connection.execute(text(f"""
            SELECT u.first_name, u.last_name, u.email, cm.role, cm.status 
            FROM company_members cm 
            JOIN users u ON u.id = cm.user_id 
            WHERE cm.company_id = '{TARGET_ID}'
        """))
        
        print("\nMembers of MasSki:")
        for m in members:
            print(f"- {m.first_name} {m.last_name} ({m.email}) - {m.role} [{m.status}]")

if __name__ == "__main__":
    check_members()
