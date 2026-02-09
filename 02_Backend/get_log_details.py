
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL as DATABASE_URL
import uuid

TARGET_LOG_ID = "b6fd00c8-e576-470a-a859-eeacb5d411c0"

def get_log_details():
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            # Fetch Log
            log_query = text(f"SELECT * FROM work_logs WHERE id = '{TARGET_LOG_ID}'")
            log = connection.execute(log_query).mappings().first()
            
            if not log:
                print(f"Log with ID {TARGET_LOG_ID} not found.")
                return

            print(f"Details for Log {TARGET_LOG_ID}:")
            for key, value in log.items():
                print(f"{key}: {value}")
                
            # Fetch User Name
            if log.get('user_id'):
                user_res = connection.execute(text(f"SELECT first_name, last_name, email FROM users WHERE id = '{log['user_id']}'")).mappings().first()
                if user_res:
                    print(f"\nUser: {user_res['first_name']} {user_res['last_name']} ({user_res['email']})")
            
             # Fetch Company Name
            if log.get('company_id'):
                comp_res = connection.execute(text(f"SELECT name FROM companies WHERE id = '{log['company_id']}'")).mappings().first()
                if comp_res:
                    print(f"Company: {comp_res['name']}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_log_details()
