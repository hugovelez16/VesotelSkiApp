
import json
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL as DATABASE_URL

TARGET_COMPANY_ID = "a0f8face-d99a-4e57-bc9a-f081438122bf"

def configure_pickup_point():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        # Fetch all companies
        result = connection.execute(text("SELECT id, settings FROM companies"))
        companies = result.fetchall()
        
        for company in companies:
            c_id = str(company.id)
            settings = company.settings or {}
            features = settings.get("features", {})
            
            # Enable for target, disable for others
            if c_id == TARGET_COMPANY_ID:
                print(f"Enabling pickup_point for {c_id}")
                features["pickup_point"] = True
            else:
                # Ensure it is disabled/removed for others
                features["pickup_point"] = False
                
            settings["features"] = features
            
            # Update DB
            # Note: JSON updates via raw SQL can be tricky with quoting. 
            # We'll use parameter binding.
            connection.execute(
                text("UPDATE companies SET settings = :settings WHERE id = :id"),
                {"settings": json.dumps(settings), "id": c_id}
            )
        
        connection.commit()
        print("Configuration update complete.")

if __name__ == "__main__":
    configure_pickup_point()
