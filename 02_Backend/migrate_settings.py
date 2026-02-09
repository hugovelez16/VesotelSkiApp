from database import engine
from sqlalchemy import text

def run_migration():
    print("Starting migration...")
    with engine.connect() as connection:
        trans = connection.begin()
        try:
            # Add settings to companies
            try:
                connection.execute(text("ALTER TABLE companies ADD COLUMN settings JSON DEFAULT '{}'"))
                print("Added settings to companies")
            except Exception as e:
                # Check if it's "column exists" error
                if "already exists" in str(e):
                    print("Column 'settings' already exists in 'companies'.")
                else:
                    print(f"Error adding settings to companies: {e}")
            
            # Add settings to company_members
            try:
                connection.execute(text("ALTER TABLE company_members ADD COLUMN settings JSON DEFAULT '{}'"))
                print("Added settings to company_members")
            except Exception as e:
                if "already exists" in str(e):
                    print("Column 'settings' already exists in 'company_members'.")
                else:
                    print(f"Error adding settings to company_members: {e}")
            
            trans.commit()
            print("Migration committed.")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed causing rollback: {e}")

if __name__ == "__main__":
    run_migration()
