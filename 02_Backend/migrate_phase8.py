from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL as DATABASE_URL

# Override if needed or rely on env
# DATABASE_URL = "postgresql://user:password@localhost/dbname" 
# Since we are running outside docker container but accessing mapped volume... wait, 
# this script needs to run INSIDE the backend container to access the DB service easily 
# or use the exposed port. 
# Inside container: DATABASE_URL is set.

def run_migrations():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # 1. Add social_security_deduction to companies
        try:
            conn.execute(text("ALTER TABLE companies ADD COLUMN social_security_deduction NUMERIC(5, 4) DEFAULT 0.0"))
            print("Added social_security_deduction to companies")
        except Exception as e:
            print(f"Skipping social_security_deduction (probably exists): {e}")

        # 2. Add status to company_members
        # First we need to create the enum type if using postgres enums, but SQLAlchemy 
        # usually handles Enums as VARCHAR if not native, but here it might be native.
        # Let's check how MemberStatus is defined in models. It is a python Enum.
        # Simplest way is adding a varchar column or altering type.
        # Let's try adding column as VARCHAR first to be safe or rely on text check.
        
        try:
            # We assume 'active' as default for existing members
            conn.execute(text("ALTER TABLE company_members ADD COLUMN status VARCHAR DEFAULT 'active'"))
            print("Added status to company_members")
        except Exception as e:
            print(f"Skipping status (probably exists): {e}")

if __name__ == "__main__":
    run_migrations()
