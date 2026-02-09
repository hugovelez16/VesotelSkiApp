"""
CRUD Operations Module.

This module contains functions to interact with the database using the SQLAlchemy session.
It abstracts the database queries for creating, reading, updating, and deleting records.
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
import models, schemas, auth
import uuid
from datetime import date, datetime



def get_user_by_email(db: Session, email: str):
    """
    Retrieves a user from the database by their email address.

    Args:
        db (Session): The database session.
        email (str): The email address of the user to retrieve.

    Returns:
        models.User: The user object if found, otherwise None.
    """
    return db.query(models.User).filter(models.User.email == email).first()

def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    from auth import get_password_hash
    hashed_password = get_password_hash(user.password)
    # Basic name splitting logic or defaults
    first_name = user.first_name
    last_name = user.last_name
    
    # If schema has full_name but model needs split
    if hasattr(user, 'full_name') and user.full_name:
        parts = user.full_name.split(' ', 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

    db_user = models.User(email=user.email, hashed_password=hashed_password, first_name=first_name, last_name=last_name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Auto-join "Personal" company
    personal_company = db.query(models.Company).filter(models.Company.name == "Personal").first()
    if personal_company:
        new_member = models.CompanyMember(
            user_id=db_user.id,
            company_id=personal_company.id,
            role=models.CompanyRole.worker,
            status=models.MemberStatus.active # Auto-active for Personal
        )
        db.add(new_member)
        db_user.default_company_id = personal_company.id
        db.commit()
        db.refresh(db_user)
        
    return db_user

def update_user_status(db: Session, user_id: str, is_active: bool):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.is_active = is_active
        db.commit()
        db.refresh(user)
    return user

def get_user_rates(db: Session, user_id: str, company_id: str):
    return db.query(models.UserCompanyRate).filter(
        models.UserCompanyRate.user_id == user_id,
        models.UserCompanyRate.company_id == company_id
    ).first()

def update_user_rates(db: Session, user_id: str, rates: schemas.UserCompanyRateCreate):
    db_rates = get_user_rates(db, user_id, str(rates.company_id))
    if not db_rates:
        db_rates = models.UserCompanyRate(user_id=user_id, **rates.dict())
        db.add(db_rates)
    else:
        for key, value in rates.dict().items():
            setattr(db_rates, key, value)
    
    db.commit()
    db.refresh(db_rates)
    return db_rates


def calculate_work_log_earnings(user_rates, log_data, social_security_deduction=0.0):
    """
    Helper function to calculate earnings for a work log based on user rates for the specific company.
    """
    # 1. Manual Amount Override (e.g. Personal)
    if log_data.get('amount') is not None:
        return float(log_data['amount']), 0.0, float(log_data.get('duration_hours') or 0), True, float(log_data['amount']) # Assume Manual Amount is Gross? Or Net? Usually Manual is "Payload". Let's assume Gross=Net for manual override unless specified.

    # Default values
    hourly_rate = user_rates.hourly_rate if user_rates else 0
    daily_rate = user_rates.daily_rate if user_rates else 0
    coordination_rate = user_rates.coordination_rate if user_rates else 0
    night_rate = user_rates.night_rate if user_rates else 0
    default_is_gross = user_rates.is_gross if user_rates else True

    is_gross = log_data.get('is_gross_calculation', default_is_gross)
    if is_gross is None: 
        is_gross = default_is_gross

    amount = 0.0
    rate_applied = 0.0
    duration = 0.0
    
    log_type = log_data.get('type')
    
    if log_type == models.WorkLogType.particular:
        rate_applied = hourly_rate
        duration = log_data.get('duration_hours') or 0
        if not duration and log_data.get('start_time') and log_data.get('end_time'):
            st = log_data['start_time']
            et = log_data['end_time']
            # Convert to float hours
            start_h = st.hour + st.minute / 60.0
            end_h = et.hour + et.minute / 60.0
            
            diff = end_h - start_h
            if diff < 0:
                diff += 24.0
            duration = diff

        if duration:
            amount = float(duration) * float(hourly_rate)
            
    elif log_type == models.WorkLogType.tutorial:
        rate_applied = daily_rate
        start_date = log_data.get('start_date')
        end_date = log_data.get('end_date')
        if start_date and end_date:
            if isinstance(start_date, (str)):
                pass 
            delta = end_date - start_date
            days = delta.days + 1
            duration = days
            amount = days * float(daily_rate)

    if log_data.get('has_coordination'):
        amount += float(coordination_rate)
    
    if log_data.get('has_night'):
        amount += float(night_rate)

    # Apply Social Security Deduction if applicable
    # Apply Deductions logic if is_gross is True
    # Apply deductions logic
    gross_amount = amount # Initially Gross = Base Amount (Rate * Duration + Extras)

    if is_gross and amount > 0:
        # SS Deduction: Priority User Override > Company Default > 0
        ss_deduction = 0.0
        if user_rates and user_rates.deduction_ss is not None:
             ss_deduction = float(user_rates.deduction_ss)
        elif social_security_deduction:
             ss_deduction = float(social_security_deduction)
        
        # IRPF
        irpf_deduction = float(user_rates.deduction_irpf) if user_rates and user_rates.deduction_irpf else 0.0
        
        # Extra
        extra_deduction = float(user_rates.deduction_extra) if user_rates and user_rates.deduction_extra else 0.0
        
        total_deduction = ss_deduction + irpf_deduction + extra_deduction
        
        if total_deduction > 0:
             amount = gross_amount * (1.0 - total_deduction) # Net Amount
        
    return amount, rate_applied, duration, is_gross, gross_amount


def get_company_rates(db: Session, company_id: str):
    return db.query(models.UserCompanyRate) \
             .options(joinedload(models.UserCompanyRate.user)) \
             .filter(models.UserCompanyRate.company_id == company_id).all()


def create_work_log(db: Session, work_log: schemas.WorkLogCreate):
    """
    Creates a new work log entry.
    Calculates the amount based on user settings and log type.
    """
    company_id = work_log.company_id
    social_security_deduction = 0.0
    user_rates = None

    if company_id:
        user_rates = get_user_rates(db, str(work_log.user_id), str(company_id))
        company = db.query(models.Company).filter(models.Company.id == company_id).first()
        if company:
            social_security_deduction = company.social_security_deduction or 0.0
    
    # Use helper
    amount, rate_applied, duration, is_gross, gross_amount = calculate_work_log_earnings(
        user_rates, 
        work_log.model_dump(),
        social_security_deduction
    )

    # Prepare data for model creation
    work_log_data = work_log.model_dump()
    
    # Remove calculated fields from input data if they exist to avoid collision or override
    # But KEEP 'amount' if it was passed manually, although we recalculated it (it returns manual amount if present)
    work_log_data.pop('amount', None)
    work_log_data.pop('rate_applied', None)
    work_log_data.pop('duration_hours', None)
    work_log_data.pop('is_gross_calculation', None)
    work_log_data.pop('gross_amount', None)

    # Create DB Object
    db_work_log = models.WorkLog(
        **work_log_data,
        amount=amount,
        gross_amount=gross_amount,
        rate_applied=rate_applied,
        # Ensure calculated fields are set
        duration_hours=duration if work_log.type == models.WorkLogType.particular else None,
        is_gross_calculation=is_gross
    )
    
    db.add(db_work_log)
    db.commit()
    db.refresh(db_work_log)
    return db_work_log

def get_work_logs(db: Session, skip: int = 0, limit: int = 100, user_id: str = None, company_id: str = None, start_date: date = None, end_date: date = None):
    query = db.query(models.WorkLog)
    if user_id:
        query = query.filter(models.WorkLog.user_id == user_id)
    if company_id:
        query = query.filter(models.WorkLog.company_id == company_id)
    
    if start_date:
        # Filter for logs where date is >= start_date OR end_date >= start_date (Overlap logic: ends after query start)
        query = query.filter(or_(models.WorkLog.date >= start_date, models.WorkLog.end_date >= start_date))
    
    if end_date:
        query = query.filter(or_(models.WorkLog.date <= end_date, models.WorkLog.start_date <= end_date)) # Use start_date for upper bound approx or check end_date

    return query.order_by(models.WorkLog.date.desc(), models.WorkLog.start_time.desc()).offset(skip).limit(limit).all()

def update_work_log(db: Session, work_log_id: str, work_log: schemas.WorkLogCreate):
    """
    Updates an existing work log using the helper function to recalculate amounts.
    """
    db_work_log = db.query(models.WorkLog).filter(models.WorkLog.id == work_log_id).first()
    if not db_work_log:
        return None
    
    current_data = {c.name: getattr(db_work_log, c.name) for c in db_work_log.__table__.columns}
    new_data = work_log.dict(exclude_unset=True)
    merged_data = {**current_data, **new_data}
    
    company_id = merged_data.get('company_id')
    user_rates = None
    social_security_deduction = 0.0

    if company_id:
         user_rates = get_user_rates(db, str(db_work_log.user_id), str(company_id))
         company = db.query(models.Company).filter(models.Company.id == company_id).first()
         if company:
            social_security_deduction = company.social_security_deduction or 0.0
    
    # Recalculate
    amount, rate_applied, duration, is_gross, gross_amount = calculate_work_log_earnings(
        user_rates, merged_data, social_security_deduction
    )
    
    # Apply patches
    for key, value in new_data.items():
        setattr(db_work_log, key, value)
        
    setattr(db_work_log, "amount", amount)
    setattr(db_work_log, "gross_amount", gross_amount)
    setattr(db_work_log, "rate_applied", rate_applied)
    setattr(db_work_log, "duration_hours", duration)
    setattr(db_work_log, "is_gross_calculation", is_gross)
    
    db.commit()
    db.refresh(db_work_log)
    return db_work_log


# --- Notification Logic ---

def create_notification(db: Session, notification: schemas.NotificationCreate):
    db_notification = models.Notification(**notification.dict())
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def get_user_notifications(db: Session, user_id: str):
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False
    ).order_by(models.Notification.created_at.desc()).all()

def mark_notification_read(db: Session, notification_id: str):
    notification = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if notification:
        notification.is_read = True
        db.commit()
    return notification


# --- Company Membership Logic ---

def join_company(db: Session, user_id: str, company_id: str):
    member = db.query(models.CompanyMember).filter(
        models.CompanyMember.user_id == user_id, 
        models.CompanyMember.company_id == company_id
    ).first()
    
    if member:
        return member # Already requested or joined
        
    new_member = models.CompanyMember(
        user_id=user_id,
        company_id=company_id,
        role=models.CompanyRole.worker,
        status=models.MemberStatus.pending
    )
    db.add(new_member)
    db.commit()

    # Create default rates if they don't exist
    existing_rates = db.query(models.UserCompanyRate).filter(
        models.UserCompanyRate.user_id == user_id,
        models.UserCompanyRate.company_id == company_id
    ).first()
    
    if not existing_rates:
        default_rates = models.UserCompanyRate(
            user_id=user_id,
            company_id=company_id,
            hourly_rate=0.0,
            daily_rate=0.0,
            night_rate=0.0,
            coordination_rate=0.0,
            is_gross=False # Default to Net as requested
        )
        db.add(default_rates)
        db.commit()

    db.refresh(new_member)
    return new_member

    # Left join Company with CompanyMember for this user
    results = db.query(models.Company, models.CompanyMember.status)\
        .outerjoin(models.CompanyMember, and_(
            models.CompanyMember.company_id == models.Company.id,
            models.CompanyMember.user_id == user_id
        ))\
        .filter(
            or_(
                models.CompanyMember.id == None,          # No relationship
                models.CompanyMember.status == models.MemberStatus.rejected # Rejected relationship
            )
        ).all()
    
    companies = []
    for company, status in results:
        # Clone or augment the company object with status
        # Since company is an ORM object bound to session, we shouldn't modify it directly if it affects session state.
        # But for reading into Pydantic, we can assign a transient attribute.
        company.membership_status = status
        companies.append(company)
        
    return companies

def get_user_companies(db: Session, user_id: str):
    """Get companies the user is a member of (joined), merging member-specific settings."""
    members = db.query(models.CompanyMember).options(
        # Eager load the company to avoid N+1 and ensure we have it
        # models.CompanyMember.members refers to the Company relationship based on model definition
        # But we need to be sure about relationship name.
        # In models.py: members = relationship("Company", back_populates="members")
        # So m.members is the Company.
    ).filter(
        models.CompanyMember.user_id == user_id,
        models.CompanyMember.status == models.MemberStatus.active
    ).all()
    
    results = []
    for m in members:
        company = m.members
        if not company: continue
        
        c_settings = company.settings if isinstance(company.settings, dict) else {}
        m_settings = m.settings if isinstance(m.settings, dict) else {}
        
        effective = c_settings.copy()
        effective.update(m_settings)
        
        # Construct response object (dict compatible with Pydantic)
        results.append({
            "id": company.id,
            "name": company.name,
            "fiscal_id": company.fiscal_id,
            "social_security_deduction": company.social_security_deduction,
            "created_at": company.created_at,
            "updated_at": company.updated_at,
            "settings": effective,
            "role": m.role.value if hasattr(m.role, 'value') else m.role
        })
    return results

def get_company_members(db: Session, company_id: str, status: models.MemberStatus = None):
    query = db.query(models.CompanyMember).filter(models.CompanyMember.company_id == company_id)
    if status:
        query = query.filter(models.CompanyMember.status == status)
    return query.all()

def update_company_member_status(db: Session, company_id: str, user_id: str, status: str):
    member = db.query(models.CompanyMember).filter(
        models.CompanyMember.company_id == company_id,
        models.CompanyMember.user_id == user_id
    ).first()
    
    if member:
        if status == "rejected" and member.status != models.MemberStatus.rejected:
             company = db.query(models.Company).filter(models.Company.id == company_id).first()
             msg = f"Has sido dado de baja de la empresa {company.name}" if company else "Has sido dado de baja de una empresa."
             create_notification(db, schemas.NotificationCreate(
                 user_id=user_id,
                 message=msg,
                 type=schemas.NotificationType.warning
             ))

        member.status = status
        db.commit()
        db.refresh(member)
    return member

def update_company_member(db: Session, company_id: str, user_id: str, member_update: schemas.CompanyMemberUpdate):
    member = db.query(models.CompanyMember).filter(
        models.CompanyMember.company_id == company_id,
        models.CompanyMember.user_id == user_id
    ).first()
    
    if member:
        update_data = member_update.dict(exclude_unset=True)
        
        # Check for status change to rejected
        if "status" in update_data and update_data["status"] == "rejected" and member.status != models.MemberStatus.rejected:
             company = db.query(models.Company).filter(models.Company.id == company_id).first()
             msg = f"Has sido dado de baja de la empresa {company.name}" if company else "Has sido dado de baja de una empresa."
             create_notification(db, schemas.NotificationCreate(
                 user_id=user_id,
                 message=msg,
                 type=schemas.NotificationType.warning
             ))

        for key, value in update_data.items():
            setattr(member, key, value)
            if key == "settings":
                 from sqlalchemy.orm.attributes import flag_modified
                 flag_modified(member, "settings")
        db.commit()
        db.refresh(member)
    return member


def delete_work_log(db: Session, work_log_id: str):
    db_work_log = db.query(models.WorkLog).filter(models.WorkLog.id == work_log_id).first()
    if db_work_log:
        db.delete(db_work_log)
        db.commit()
    return db_work_log

def get_user_devices(db: Session, user_id: str):
    return db.query(models.UserDevice).filter(models.UserDevice.user_id == user_id).all()

def delete_user_device(db: Session, user_id: str, device_id: str):
    device = db.query(models.UserDevice).filter(
        models.UserDevice.user_id == user_id,
        models.UserDevice.id == device_id
    ).first()
    if device:
        db.delete(device)
        db.commit()
    return device


def create_company(db: Session, company: schemas.CompanyCreate):
    db_company = models.Company(**company.dict())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

def get_company(db: Session, company_id: str):
    return db.query(models.Company).filter(models.Company.id == company_id).first()

def update_company(db: Session, company_id: str, company: schemas.CompanyUpdate):
    db_company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if db_company:
        update_data = company.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_company, key, value)
            if key == "settings":
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(db_company, "settings")
        db.commit()
        db.refresh(db_company)
    return db_company

def update_user(db: Session, user_id: str, user: schemas.UserUpdate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        update_data = user.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_user, key, value)
        db.commit()
        db.refresh(db_user)
    return db_user
