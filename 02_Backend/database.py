import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database Connection URL
# Defaults to a local PostgreSQL container if not specified in environment variables
from dotenv import load_dotenv
load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/postgres")

# Create SQLAlchemy engine
# This engine manages the connection pool to the database
engine = create_engine(
    SQLALCHEMY_DATABASE_URL
)

# Create SessionLocal class
# Each instance of SessionLocal will be a database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()

def get_db():
    """
    Dependency generator that creates a new database session for a request
    and closes it after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
