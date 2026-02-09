import models, crud, auth
from database import SessionLocal
from datetime import datetime, timedelta

def debug_2fa():
    db = SessionLocal()
    email = "hugo@vesotel.com"
    user = crud.get_user_by_email(db, email)
    
    if not user:
        print("User not found")
        return

    print(f"--- Debugging User {email} ---")
    
    # 1. Simulate Login / Code Generation
    code = auth.create_2fa_code()
    print(f"Generated Code: {code} (Type: {type(code)})")
    
    user.two_factor_code = code
    # Force commit
    user.two_factor_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()
    db.refresh(user)
    
    print(f"Stored Code: {user.two_factor_code} (Type: {type(user.two_factor_code)})")
    print(f"Stored Expires: {user.two_factor_expires}")
    print(f"Current UTC: {datetime.utcnow()}")
    
    # 2. Simulate Verification
    print("--- Verifying ---")
    verified = auth.verify_2fa_code(user, code)
    print(f"Verification Result: {verified}")
    
    if not verified:
        print("FAILURE REASONS:")
        if user.two_factor_code != code:
            print(f"Mismatch! '{user.two_factor_code}' != '{code}'")
        if datetime.utcnow() > user.two_factor_expires:
             print(f"Expired! Now {datetime.utcnow()} > Expires {user.two_factor_expires}")

    # 3. Simulate specific input failure?
    # Maybe whitespace?
    
    db.close()

if __name__ == "__main__":
    debug_2fa()
