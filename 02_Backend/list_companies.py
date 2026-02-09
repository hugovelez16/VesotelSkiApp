
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL as DATABASE_URL

def list_companies():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT id, name FROM companies"))
        for c in result:
            print(f"{c.name}: {c.id}")

if __name__ == "__main__":
    list_companies()
