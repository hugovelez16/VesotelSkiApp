
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import models

# Database setup
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:Granada2025@postgres:5432/postgres"

def check_gross_diff():
    # Inside Docker, 'postgres' is the host.
    # On Host, 'localhost' is the host.
    # We try 'postgres' first.
    try:
        url = "postgresql://postgres:Granada2025@postgres:5432/postgres"
        engine = create_engine(url)
        with engine.connect() as conn:
            pass # Test connection
        print("Connected via postgres host.")
    except Exception as e:
        print(f"Postgres host failed, trying localhost: {e}")
        url = "postgresql://postgres:Granada2025@localhost:5432/postgres"
        engine = create_engine(url)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    logs = db.query(models.WorkLog).all()
    print(f"Total Logs: {len(logs)}")
    
    diff_count = 0
    gross_only_count = 0
    
    for log in logs:
        gross = float(log.gross_amount or 0)
        net = float(log.amount or 0)
        
        # Round to 2 decimals
        if abs(gross - net) > 0.01:
            diff_count += 1
            print(f"User {log.user_id} | Log {log.id} | Gross: {gross} | Net: {net} | Diff: {gross-net}")
        
        if log.is_gross_calculation:
            gross_only_count += 1

    print(f"Logs with Difference: {diff_count}")
    print(f"Logs marked is_gross_calculation=True: {gross_only_count}")

if __name__ == "__main__":
    check_gross_diff()
