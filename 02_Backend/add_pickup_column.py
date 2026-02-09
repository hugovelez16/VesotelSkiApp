import os
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL as DATABASE_URL

def add_pickup_point_column():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        try:
            # Check if column exists
            result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'work_logs' AND column_name = 'pickup_point'"))
            if result.fetchone():
                print("Column 'pickup_point' already exists.")
                return

            print("Adding 'pickup_point' column to 'work_logs' table...")
            connection.execute(text("ALTER TABLE work_logs ADD COLUMN pickup_point VARCHAR"))
            connection.commit()
            print("Successfully added 'pickup_point' column.")
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_pickup_point_column()
