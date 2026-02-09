from database import SessionLocal
from crud import get_user_companies
from models import User, CompanyMember, Company

def check_logic():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "velezgutierrezhugo@gmail.com").first() # From screenshot
        if not user:
            user = db.query(User).first() # Fallback
            
        print(f"Testing for user: {user.email} ({user.id})")
        
        # Check raw members
        members = db.query(CompanyMember).filter(CompanyMember.user_id == user.id).all()
        print(f"Raw memberships count: {len(members)}")
        for m in members:
            print(f" - CompanyID: {m.company_id}, Status: {m.status}, Role: {m.role}")
            # Check relation
            try:
                c = m.members # The confusing name
                print(f"   -> Linked Company Name: {c.name if c else 'None'}")
                print(f"   -> Settings: {c.settings if c else 'N/A'}")
            except Exception as e:
                print(f"   -> Relation Error: {e}")

        print("--- Calling get_user_companies ---")
        companies = get_user_companies(db, str(user.id))
        print(f"Found {len(companies)} companies")
        for c in companies:
            print(f"Company: {c['name']}")
            print(f"Settings: {c.get('settings')}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_logic()
