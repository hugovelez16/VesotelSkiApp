import sqlite3
import os
from datetime import datetime

# Adjust DB URL if needed. Assuming sqlite default.
DB_FILE = "./sql_app.db"

if not os.path.exists(DB_FILE):
    print(f"Error: Database file {DB_FILE} not found.")
    exit(1)

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

try:
    # Get total count
    cursor.execute("SELECT count(*) FROM work_logs")
    total = cursor.fetchone()[0]
    print(f"Total WorkLogs: {total}")

    # Get min/max date
    cursor.execute("SELECT min(date), max(date) FROM work_logs")
    result = cursor.fetchone()
    print(f"Date Range (field 'date'): {result[0]} to {result[1]}")

    # Get min/max start_date (for tutorials)
    cursor.execute("SELECT min(start_date), max(start_date) FROM work_logs")
    result_tutorial = cursor.fetchone()
    print(f"Date Range (field 'start_date'): {result_tutorial[0]} to {result_tutorial[1]}")
    
    # Check distribution by company
    print("\nLogs by Company:")
    cursor.execute("SELECT company_id, count(*) as c, min(date), max(date) FROM work_logs GROUP BY company_id")
    companies = cursor.fetchall()
    for row in companies:
        print(f"Company {row[0]}: {row[1]} logs. Range: {row[2]} - {row[3]}")

finally:
    conn.close()
