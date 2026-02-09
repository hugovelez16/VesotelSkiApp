from database import engine
from models import Base
import models # Make sure models are loaded so Base knows about them

if __name__ == "__main__":
    print("WARNING: This will delete all data in the database!")
    confirmation = input("Type 'yes' to confirm: ")
    if confirmation.lower() == 'yes':
        print("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        print("Creating all tables...")
        Base.metadata.create_all(bind=engine)
        print("Database schema reset successfully.")
    else:
        print("Operation cancelled.")
