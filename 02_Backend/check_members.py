
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL as DATABASE_URL

def check_members():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        # Find Masski ID
        result = connection.execute(text("SELECT id, name FROM companies WHERE name LIKE '%MassKi%'"))
        masski = result.first()
        if not masski:
            print("Masski not found")
            return
            
        print(f"Company: {masski.name} ({masski.id})")
        
        # List members
        members = connection.execute(text(f"""
            SELECT u.first_name, u.last_name, u.email, cm.role, cm.status 
            FROM company_members cm 
            JOIN users u ON u.id = cm.user_id 
            WHERE cm.company_id = '{masski.id}'
        """))
        
        print("\nMembers:")
        for m in members:
            print(f"- {m.first_name} {m.last_name} ({m.email}) - {m.role} [{m.status}]")

if __name__ == "__main__":
    check_members()
