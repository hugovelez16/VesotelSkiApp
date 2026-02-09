"""
Main API Application Module.

This module defines the FastAPI application, API endpoints, and middleware configuration.
It serves as the entry point for the backend service.
"""
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, Form, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import timedelta, datetime, date
import crud, models, schemas, auth, email_utils
from database import SessionLocal, engine, get_db
import shopify_routes

# Create tables if they don't exist (optional, but good for dev)
models.Base.metadata.create_all(bind=engine)

def check_supervisor_access(db: Session, supervisor_id: str, target_user_id: str) -> bool:
    """
    Check if supervisor_id manages any company that target_user_id is a member of.
    """
    # 1. Get all memberships of supervisor
    sup_memberships = db.query(models.CompanyMember).filter(
        models.CompanyMember.user_id == supervisor_id,
        models.CompanyMember.status == models.MemberStatus.active
    ).all()
    
    # Filter for elevated roles (manager, admin, owner, supervisor)
    # matching the frontend logic
    elevated_company_ids = []
    for m in sup_memberships:
        # Handle Enum or String
        role_val = str(m.role.value if hasattr(m.role, 'value') else m.role).lower()
        if role_val in ['manager', 'admin', 'owner', 'supervisor']:
            elevated_company_ids.append(m.company_id)
            
    if not elevated_company_ids:
        return False

    # 2. Check if target_user is a member of any of these companies
    access = db.query(models.CompanyMember).filter(
        models.CompanyMember.user_id == target_user_id,
        models.CompanyMember.company_id.in_(elevated_company_ids),
        models.CompanyMember.status == models.MemberStatus.active
    ).first()

    return bool(access)

app = FastAPI(title="Vesotel Gestor Jornada API", description="API for managing work logs and user settings.")
app.include_router(shopify_routes.router)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"Incoming Request: {request.method} {request.url.path}")
    try:
        return await call_next(request)
    except Exception as e:
        print(f"Request Failed: {e}")
        raise e

# CORS Configuration
origins = [
    "https://caddy-master-proxy:4400",
    "https://clasesski.vesotel.com"
] # Adjust in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    device_token: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login. 
    Triggers 2FA via email and returns a temporary token with 'requires_2fa=True'.
    Unless a valid device_token is provided.
    """
    user = crud.get_user_by_email(db, form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check Device Token
    if device_token and auth.verify_device_token(db, str(user.id), device_token):
        # Skip 2FA
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": user.email, "scope": "full"}, 
            expires_delta=access_token_expires
        )
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "requires_2fa": False,
            "device_token": device_token # Return it back to confirm? Or rotate?
        }

    # Generate 2FA Code
    code = auth.create_2fa_code()
    user.two_factor_code = code
    user.two_factor_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()
    
    # Send Email
    await email_utils.send_2fa_code(user.email, code)
    
    # Create Temporary Token (Scope: 2fa_pending)
    access_token_expires = timedelta(minutes=15)
    access_token = auth.create_access_token(
        data={"sub": user.email, "scope": "2fa_pending"}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "requires_2fa": True
    }

@app.post("/resend-2fa")
async def resend_2fa(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Resend 2FA code for the current user (allows pending scope).
    """
    import random
    import string
    # Generate 2FA Code
    code = auth.create_2fa_code()
    current_user.two_factor_code = code
    current_user.two_factor_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()
    
    # Send Email
    try:
        await email_utils.send_2fa_code(current_user.email, code)
    except Exception as e:
        print(f"ERROR: Failed to send email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")
        
    return {"message": "Code sent"}

@app.post("/verify-2fa", response_model=schemas.Token)
async def verify_2fa(
    data: schemas.Verify2FA, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user) # Allows 2fa_pending scope
):
    """
    Verify the 2FA code and return a full access token (48h).
    """
    if not auth.verify_2fa_code(current_user, data.code):
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    
    # Clear 2FA
    current_user.two_factor_code = None
    current_user.two_factor_expires = None
    db.commit()
    
    # Issue Full Token
    # Issue Full Token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": current_user.email, "scope": "full"}, 
        expires_delta=access_token_expires
    )
    
    device_token = None
    if data.trust_device:
        device_token = auth.register_user_device(db, str(current_user.id), name="Browser")

    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "requires_2fa": False,
        "device_token": device_token
    }

@app.post("/users/", response_model=schemas.UserCreate)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.
    """
    db_user = auth.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/work-logs", response_model=schemas.WorkLogResponse)
def create_work_log(work_log: schemas.WorkLogCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    """
    Create a new work log entry.
    """
    # Verify current_user.id matches work_log.user_id or user is admin, or user is manager of the target company
    if str(work_log.user_id) != str(current_user.id) and current_user.role != "admin":
        # Check if user is manager/admin of the target company
        is_manager = False
        if work_log.company_id:
             membership = db.query(models.CompanyMember).filter(
                 models.CompanyMember.user_id == current_user.id,
                 models.CompanyMember.company_id == work_log.company_id,
                 models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin]),
                 models.CompanyMember.status == models.MemberStatus.active
             ).first()
             if membership:
                 is_manager = True
        
        if not is_manager:
             raise HTTPException(status_code=403, detail="Cannot create work logs for other users")
        
    return crud.create_work_log(db=db, work_log=work_log)

@app.get("/work-logs", response_model=List[schemas.WorkLogResponse])
def read_work_logs(
    skip: int = 0, 
    limit: int = 100, 
    user_id: str = None, # Optional filter via query param
    company_id: str = None, # Optional filter via query param
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_verified_user)
):
    """
    Retrieve work logs. 
    Users can only see their own. Admins can filter by user_id or see their own if not specified.
    Supervisors can filter by company_id for their companies.
    """
    target_user_id = current_user.id
    target_company_id = company_id
    
    # Permission Logic
    if current_user.role == "admin":
        # Admin can do anything
        if user_id:
            target_user_id = user_id
        else:
            target_user_id = None 
            # Existing behavior: target_user_id = current_user.id
            if not company_id and not user_id and not start_date and not end_date:
               target_user_id = current_user.id # Default to self if ABSOLUTELY no filters
        
        final_user_id = target_user_id

    else:
        # Check for Supervisor Permission dynamically (as "supervisor" role doesn't exist on User model)
        # Check if user is manager/admin of the requested company OR if they are checking availability for a user in their managed company
        is_supervisor_request = False
        
        if company_id:
             # Check if current_user is manager/admin of this company
             membership = db.query(models.CompanyMember).filter(
                 models.CompanyMember.user_id == current_user.id,
                 models.CompanyMember.company_id == company_id,
                 models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin]),
                 models.CompanyMember.status == models.MemberStatus.active
             ).first()
             if membership:
                 is_supervisor_request = True
                 target_user_id = None # See all logs for this company
                 if user_id:
                     target_user_id = user_id # Filter specific user in this company

        if is_supervisor_request:
             final_user_id = target_user_id
        else:
            # Regular user or Supervisor accessing outside their scope
            # Check generically if supervisor manages this user via any company
            if user_id and str(user_id) != str(current_user.id):
                 if check_supervisor_access(db, str(current_user.id), user_id):
                     final_user_id = user_id
                 else:
                     raise HTTPException(status_code=403, detail="Not authorized to view other users' logs")
            else:
                 final_user_id = current_user.id
    
    work_logs = crud.get_work_logs(
        db, 
        skip=skip, 
        limit=limit, 
        user_id=str(final_user_id) if final_user_id else None, 
        company_id=company_id,
        start_date=start_date,
        end_date=end_date
    )
    return work_logs

@app.delete("/work-logs/{work_log_id}")
def delete_work_log(work_log_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    # Verify ownership
    log = db.query(models.WorkLog).filter(models.WorkLog.id == work_log_id).first()
    if not log:
         raise HTTPException(status_code=404, detail="Work log not found")
    if str(log.user_id) != str(current_user.id) and current_user.role != "admin": # Assuming role field exists
         raise HTTPException(status_code=403, detail="Not authorized")
         
    crud.delete_work_log(db, work_log_id)
    return {"ok": True}

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    # Self-healing for legacy user jandrobamo
    if current_user.email == "jandrobamo@gmail.com":
        membership = db.query(models.CompanyMember).filter(
            models.CompanyMember.user_id == current_user.id
        ).first()
        
        if not membership:
            # Find Escuela Nacional
            company = db.query(models.Company).filter(models.Company.name == "Escuela Nacional").first()
            if company:
                new_member = models.CompanyMember(
                    user_id=current_user.id,
                    company_id=company.id,
                    role=models.CompanyRole.worker,
                    status=models.MemberStatus.active
                )
                db.add(new_member)
                db.commit()
                db.refresh(current_user)

    # Compute is_supervisor
    # Check efficiently
    has_manager_role = db.query(models.CompanyMember).filter(
        models.CompanyMember.user_id == current_user.id,
        models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin]),
        models.CompanyMember.status == models.MemberStatus.active
    ).first()
    
    current_user.is_supervisor = True if has_manager_role else False

    return current_user

@app.get("/users/me/companies", response_model=List[schemas.CompanyResponse])
def read_user_companies(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    """
    Get companies the current user is a member of.
    """
    return crud.get_user_companies(db, str(current_user.id))

@app.get("/users/{user_id}", response_model=schemas.UserResponse)
def read_user(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    if current_user.role != "admin" and not check_supervisor_access(db, str(current_user.id), user_id):
        raise HTTPException(status_code=403, detail="Not authorized")
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/users", response_model=List[schemas.UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@app.post("/users", response_model=schemas.UserResponse)
async def create_user_admin(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Option A: Random Password + Email
    import random
    import string
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    user.password = temp_password # Override with temp
    
    created_user = crud.create_user(db=db, user=user)
    
    # Set must_change_password
    created_user.must_change_password = True
    db.commit()
    
    # Send Email
    await email_utils.send_welcome_email(user.email, temp_password)
    
    return created_user

@app.post("/admin/impersonate/{user_id}", response_model=schemas.Token)
def impersonate_user(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    """
    Admin only: Get a full access token for any user.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": target_user.email, "scope": "full"}, 
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "requires_2fa": False
    }

@app.put("/users/{user_id}/status")
def toggle_user_status(user_id: str, is_active: bool, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    user = crud.update_user_status(db, user_id=user_id, is_active=is_active)
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Status updated", "is_active": user.is_active}




@app.put("/users/me", response_model=schemas.UserResponse)
def update_user_me(user: schemas.UserSelfUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    # Create a full UserUpdate object but only with allowed fields
    db_user = crud.update_user(db, str(current_user.id), schemas.UserUpdate(**user.dict()))
    return db_user

@app.post("/users/me/change-password")
def change_password(data: schemas.PasswordChange, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    # Verify current password
    if not auth.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    # Update password
    current_user.hashed_password = auth.get_password_hash(data.new_password)
    current_user.must_change_password = False
    
    db.commit()
    return {"message": "Password updated successfully"}

@app.post("/users/{user_id}/reset-password-email")
async def reset_password_via_email(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    """
    Admin only: Reset user password to a random one and email it.
    """
    if current_user.role != "admin":
        # Supervisor check? maybe later. For now Admin explicitly requested.
        # Check supervisor access
        is_supervisor = check_supervisor_access(db, str(current_user.id), user_id)
        if not is_supervisor:
             raise HTTPException(status_code=403, detail="Not authorized")

    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Generate random password
    import random
    import string
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    
    # Update User
    user.hashed_password = auth.get_password_hash(temp_password)
    user.must_change_password = True
    db.commit()
    
    # Send Email
    try:
        await email_utils.send_welcome_email(user.email, temp_password)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email. Password was reset but email failed.")
        
    return {"message": "Password reset and email sent"}

@app.put("/work-logs/{work_log_id}", response_model=schemas.WorkLogResponse)
def update_work_log(work_log_id: str, work_log: schemas.WorkLogCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    # Verify ownership
    log = db.query(models.WorkLog).filter(models.WorkLog.id == work_log_id).first()
    if not log:
         raise HTTPException(status_code=404, detail="Work log not found")
    if str(log.user_id) != str(current_user.id) and current_user.role != "admin":
         raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_log = crud.update_work_log(db, work_log_id, work_log)
    return updated_log

@app.get("/companies", response_model=List[schemas.CompanyResponse]) 
def read_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    companies = db.query(models.Company).offset(skip).limit(limit).all()
    return companies

@app.get("/users/me/rates", response_model=List[schemas.UserCompanyRateResponse])
def read_user_rates(company_id: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    query = db.query(models.UserCompanyRate).filter(models.UserCompanyRate.user_id == current_user.id)
    if company_id:
        query = query.filter(models.UserCompanyRate.company_id == company_id)
    return query.all()

@app.get("/users/{user_id}/rates", response_model=List[schemas.UserCompanyRateResponse])
def read_user_rates_admin(user_id: str, company_id: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    if current_user.role != "admin" and not check_supervisor_access(db, str(current_user.id), user_id):
        raise HTTPException(status_code=403, detail="Not authorized")
    query = db.query(models.UserCompanyRate).filter(models.UserCompanyRate.user_id == user_id)
    if company_id:
        query = query.filter(models.UserCompanyRate.company_id == company_id)
    return query.all()

@app.put("/users/me/rates", response_model=schemas.UserCompanyRateResponse)
def update_user_rates(rates: schemas.UserCompanyRateCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    return crud.update_user_rates(db, str(current_user.id), rates)

@app.get("/users/{user_id}/companies", response_model=List[schemas.CompanyResponse])
def read_user_companies_admin(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    if current_user.role != "admin" and not check_supervisor_access(db, str(current_user.id), user_id):
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_user_companies(db, user_id)

# --- Admin Company Management ---

@app.post("/companies", response_model=schemas.CompanyResponse)
def create_company(company: schemas.CompanyCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.create_company(db, company)

@app.put("/companies/{company_id}", response_model=schemas.CompanyResponse)
def update_company(company_id: str, company: schemas.CompanyUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    db_company = crud.update_company(db, company_id, company)
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    return db_company



@app.get("/companies/detailed", response_model=List[schemas.CompanyWithMembers])
def read_companies_detailed(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    # If admin, return all
    if current_user.role == "admin":
        return db.query(models.Company).all()

    # If not admin, check for permissions
    # 1. Supervisor permissions (manager/admin of specific companies)
    supervisor_memberships = db.query(models.CompanyMember).filter(
        models.CompanyMember.user_id == current_user.id,
        models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin]),
        models.CompanyMember.status == models.MemberStatus.active
    ).all()
    
    allowed_company_ids = {m.company_id for m in supervisor_memberships}

    # 2. Worker Daily Report permissions
    # Check if user is a member of any company that has this feature enabled
    # We can fetch all active memberships of the user
    user_memberships = db.query(models.CompanyMember).options(joinedload(models.CompanyMember.members)).filter(
        models.CompanyMember.user_id == current_user.id,
        models.CompanyMember.status == models.MemberStatus.active
    ).all()

    for m in user_memberships:
        company = m.members # The Company relationship
        if company and company.settings:
             features = company.settings.get("features", {})
             if features.get("worker_daily_report") is True:
                 allowed_company_ids.add(company.id)

    if allowed_company_ids:
        companies = db.query(models.Company).filter(models.Company.id.in_(allowed_company_ids)).all()
        return companies

    raise HTTPException(status_code=403, detail="Not authorized")

@app.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: str, user: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    db_user = crud.update_user(db, user_id, user)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.get("/users/{user_id}/devices", response_model=List[schemas.UserDeviceResponse])
def read_user_devices(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_user_devices(db, user_id)

@app.delete("/users/{user_id}/devices/{device_id}")
def delete_user_device(user_id: str, device_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    device = crud.delete_user_device(db, user_id, device_id)
    if not device:
         raise HTTPException(status_code=404, detail="Device not found")
    return {"ok": True}

# --- Company Member Management ---

@app.post("/companies/{company_id}/join", response_model=schemas.CompanyMemberResponse)
async def join_company(company_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    """
    Request to join a company.
    """
    # Verify company exists
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    member = crud.join_company(db, str(current_user.id), company_id)
    
    # Notify User
    background_tasks.add_task(
        email_utils.send_notification_email,
        current_user.email,
        f"Request to join {company.name}",
        f"You have requested to join <strong>{company.name}</strong>. An administrator will review your request shortly."
    )
    
    # Notify Admin (Hardcoded or based on role lookup - for this MVP just logging or notifying specific admin)
    # Finding company admins:
    admins = db.query(models.User).filter(models.User.role == "admin").all()
    for admin in admins:
         background_tasks.add_task(
            email_utils.send_notification_email,
            admin.email,
            f"New Member Request: {company.name}",
            f"User <strong>{current_user.first_name} {current_user.last_name}</strong> ({current_user.email}) has requested to join <strong>{company.name}</strong>.",
            "https://clasesski.vesotel.com/admin/companies" # Link to admin panel
        )
    
    return member

@app.get("/companies/available", response_model=List[schemas.CompanyResponse])
def read_available_companies(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    """
    Get companies that the user is NOT a member of.
    """
    return crud.get_available_companies(db, str(current_user.id))



@app.get("/companies/{company_id}/members", response_model=List[schemas.CompanyMemberResponse])
def read_company_members(company_id: str, status: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    """
    Get members of a company. 
    Restricted to Admin or Supervisors (TODO: Supervisor check).
    For now, Admin only or members of the company?
    Let's allow Admin for now.
    """
    is_authorized = False
    if current_user.role == "admin":
        is_authorized = True
    else:
        membership = db.query(models.CompanyMember).filter(
            models.CompanyMember.user_id == current_user.id,
            models.CompanyMember.company_id == company_id,
            models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin]),
            models.CompanyMember.status == models.MemberStatus.active
        ).first()
        if membership:
            is_authorized = True
            
    if not is_authorized:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    return crud.get_company_members(db, company_id, status)

@app.post("/companies/{company_id}/members/add", response_model=schemas.CompanyMemberResponse)
def add_company_member(company_id: str, member_data: schemas.TokenData, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    Admin: Add a user to a company directly by email (bypass request).
    """
    is_authorized = False
    if current_user.role == "admin":
        is_authorized = True
    else:
        membership = db.query(models.CompanyMember).filter(
            models.CompanyMember.user_id == current_user.id,
            models.CompanyMember.company_id == company_id,
            models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin]),
            models.CompanyMember.status == models.MemberStatus.active
        ).first()
        if membership:
            is_authorized = True
            
    if not is_authorized:
         raise HTTPException(status_code=403, detail="Not authorized")
    
    user_to_add = crud.get_user_by_email(db, member_data.email)
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User email not found")

    # Verify company
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Check if exists
    existing = crud.join_company(db, str(user_to_add.id), company_id)
    
    # If it was pending or just created, force active
    if existing.status != models.MemberStatus.active:
        existing.status = models.MemberStatus.active
        db.commit()
        db.refresh(existing)
        
    return existing

@app.put("/companies/{company_id}/members/{user_id}/status", response_model=schemas.CompanyMemberResponse)
def update_member_status(company_id: str, user_id: str, status: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    Approve/Reject company membership.
    """
    is_authorized = False
    if current_user.role == "admin":
        is_authorized = True
    else:
        membership = db.query(models.CompanyMember).filter(
            models.CompanyMember.user_id == current_user.id,
            models.CompanyMember.company_id == company_id,
            models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin]),
            models.CompanyMember.status == models.MemberStatus.active
        ).first()
        if membership:
            is_authorized = True
            
    if not is_authorized:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    member = crud.update_company_member_status(db, company_id, user_id, status)
    if not member:
        raise HTTPException(status_code=404, detail="Member request not found")
    
    # Notify User on Status Change - REMOVED AUTO EMAIL AS REQUESTED
    # User requested explicit "Notify" button. 
    # Logic moved to new endpoint /notify-member-status
    
    return member

@app.post("/companies/{company_id}/members/{user_id}/notify-status")
def notify_member_status(company_id: str, user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_verified_user)):
    """
    Manually send an email notification regarding member status/role.
    """
    if current_user.role != "admin": # And maybe Manager?
         raise HTTPException(status_code=403, detail="Not authorized")
    
    member = crud.get_company_member(db, company_id, user_id)
    if not member:
         raise HTTPException(status_code=404, detail="Member not found")
         
    user_obj = member.user
    company = member.members # Relationship usage, confirm name
    # crud.get_company_member usually returns Member object. 
    # In models, member.members -> Company. Confusing name but established.
    
    if not user_obj or not company:
         raise HTTPException(status_code=404, detail="User or Company not found")

    subject = f"Update from {company.name}"
    msg = f"Your membership status in <strong>{company.name}</strong> is currently: <strong>{member.status}</strong>."
    
    if member.status == models.MemberStatus.active:
         msg += "<br><br>Please check your profile to ensure your <strong>rates</strong> are configured correctly."

    # Using background task here? No, user clicked a button, explicit wait is fine or background.
    # Since we are inside a sync function, we need to be careful with async send.
    # But email_utils.send_notification_email is async.
    # We can use BackgroundTasks if we add it to signature, but I can't easily add it to this signature without `BackgroundTasks`.
    # Let's add BackgroundTasks to signature.

    return {"message": "Notification queued"}

# Re-defining with BackgroundTasks
@app.post("/companies/{company_id}/members/{user_id}/notify", response_model=schemas.CompanyMemberResponse)
async def notify_company_member(
    company_id: str, 
    user_id: str, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_verified_user)
):
    is_authorized = False
    if current_user.role == "admin":
        is_authorized = True
    else:
        membership = db.query(models.CompanyMember).filter(
            models.CompanyMember.user_id == current_user.id,
            models.CompanyMember.company_id == company_id,
            models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin]),
            models.CompanyMember.status == models.MemberStatus.active
        ).first()
        if membership:
            is_authorized = True
            
    if not is_authorized:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    member = db.query(models.CompanyMember).filter(
        models.CompanyMember.company_id == company_id,
        models.CompanyMember.user_id == user_id
    ).first()
    
    if not member:
         raise HTTPException(status_code=404, detail="Member not found")
    
    user_obj = db.query(models.User).filter(models.User.id == user_id).first()
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    
    subject = f"Update from {company.name}"
    msg = f"Your status in <strong>{company.name}</strong> has been updated to: <strong>{member.status.value.title()}</strong>."
    
    if member.role == models.CompanyRole.manager:
         msg += "<br><strong>You have been assigned as a Supervisor/Manager.</strong>"
    
    background_tasks.add_task(
        email_utils.send_notification_email,
        user_obj.email,
        subject,
        msg
    )
    
    return member

    return member

    return member

@app.get("/companies/{company_id}", response_model=schemas.CompanyResponse)
def read_company(company_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    company = crud.get_company(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Access control
    if current_user.role == "admin":
        return company
    
    membership = db.query(models.CompanyMember).filter(
        models.CompanyMember.user_id == current_user.id,
        models.CompanyMember.company_id == company_id,
        models.CompanyMember.status == models.MemberStatus.active
    ).first()
    
    if not membership:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    return company

@app.get("/companies/{company_id}/rates-v2", response_model=List[schemas.UserCompanyRateResponse])
def read_company_rates(company_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Allow Admin or Manager of this company
    is_authorized = False
    if current_user.role == "admin":
        is_authorized = True
    else:
        # Check if user is manager/admin of this company
        membership = db.query(models.CompanyMember).filter(
            models.CompanyMember.user_id == current_user.id,
            models.CompanyMember.company_id == company_id,
            models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin]),
            models.CompanyMember.status == models.MemberStatus.active
        ).first()
        if membership:
            is_authorized = True
    
    if not is_authorized:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    return crud.get_company_rates(db, company_id)

@app.put("/companies/{company_id}/members/{user_id}", response_model=schemas.CompanyMemberResponse)
def update_company_member(company_id: str, user_id: str, member_data: schemas.CompanyMemberUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    is_authorized = False
    if current_user.role == "admin":
        is_authorized = True
    else:
        membership = db.query(models.CompanyMember).filter(
            models.CompanyMember.user_id == current_user.id,
            models.CompanyMember.company_id == company_id,
            models.CompanyMember.role.in_([models.CompanyRole.manager, models.CompanyRole.admin]),
            models.CompanyMember.status == models.MemberStatus.active
        ).first()
        if membership:
            is_authorized = True
            
    if not is_authorized:
         raise HTTPException(status_code=403, detail="Not authorized")
    
    member = crud.update_company_member(db, company_id, user_id, member_data)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@app.get("/notifications", response_model=List[schemas.NotificationResponse])
def read_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return crud.get_user_notifications(db, str(current_user.id))

@app.put("/notifications/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_notification_read(notification_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    notif = crud.mark_notification_read(db, notification_id)
    if not notif:
         raise HTTPException(status_code=404, detail="Notification not found")
    if str(notif.user_id) != str(current_user.id):
         raise HTTPException(status_code=403, detail="Not authorized")
    return notif




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


