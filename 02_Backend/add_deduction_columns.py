from sqlalchemy import create_engine, text
import os

# Database URL
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:Granada2025@postgres:5432/postgres"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_migration():
    with engine.connect() as connection:
        # Add deduction_ss
        try:
            connection.execute(text("ALTER TABLE user_company_rates ADD COLUMN deduction_ss NUMERIC(5, 4);"))
            print("Added deduction_ss column")
        except Exception as e:
            print(f"deduction_ss column might already exist: {e}")

        # Add deduction_irpf
        try:
            connection.execute(text("ALTER TABLE user_company_rates ADD COLUMN deduction_irpf NUMERIC(5, 4) DEFAULT 0.0;"))
            print("Added deduction_irpf column")
        except Exception as e:
            print(f"deduction_irpf column might already exist: {e}")

        # Add deduction_extra
        try:
            connection.execute(text("ALTER TABLE user_company_rates ADD COLUMN deduction_extra NUMERIC(5, 4) DEFAULT 0.0;"))
            print("Added deduction_extra column")
        except Exception as e:
            print(f"deduction_extra column might already exist: {e}")
            
        connection.commit()

if __name__ == "__main__":
    run_migration()
