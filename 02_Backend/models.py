from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric, Date, Time, Text, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum
from database import Base

class NotificationType(str, enum.Enum):
    info = "info"
    warning = "warning"
    error = "error"

class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"

class UserRole(str, enum.Enum):
    admin = "admin" # System Creator / Super Admin
    user = "user" # Regular User

class CompanyRole(str, enum.Enum):
    admin = "admin" # Deprecated or specific high-level company admin
    manager = "manager" # Supervisor/Boss
    worker = "worker" # Regular Employee

class WorkLogType(str, enum.Enum):
    particular = "particular"
    tutorial = "tutorial"

class RequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class User(Base):
    """
    User Model.
    
    Represents a registered user in the system.
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.user)
    is_active = Column(Boolean, default=True) # System Login Access
    is_active_worker = Column(Boolean, default=True) # Work Log / Calendar Access
    default_company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)

    # Auth & Security
    two_factor_code = Column(String, nullable=True)
    two_factor_expires = Column(DateTime, nullable=True)
    must_change_password = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    default_company = relationship("Company", foreign_keys=[default_company_id])

    rates = relationship("UserCompanyRate", back_populates="user")
    work_logs = relationship("WorkLog", back_populates="user")
    company_memberships = relationship("CompanyMember", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    devices = relationship("UserDevice", back_populates="user")

class UserDevice(Base):
    __tablename__ = "user_devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    device_identifier = Column(String, unique=True, nullable=False) # The token stored on client
    name = Column(String, nullable=True) # e.g. "Chrome on Linux"
    last_used = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="devices")

class MemberStatus(str, enum.Enum):
    active = "active"
    pending = "pending"
    rejected = "rejected"

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    fiscal_id = Column(String)
    social_security_deduction = Column(Numeric(5, 4), default=0.0) # e.g. 0.0648 for 6.48%
    settings = Column(JSON, default={}) # Configurable features (e.g. { "allow_tutorial": false })
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("CompanyMember", back_populates="members")
    work_logs = relationship("WorkLog", back_populates="company")
    user_rates = relationship("UserCompanyRate", back_populates="company")

class CompanyMember(Base):
    __tablename__ = "company_members"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), primary_key=True)
    role = Column(Enum(CompanyRole), default=CompanyRole.worker)
    status = Column(Enum(MemberStatus), default=MemberStatus.active) # Default active for backward compat or seeds
    settings = Column(JSON, default={}) # User-specific overrides
    joined_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="company_memberships")
    members = relationship("Company", back_populates="members")

class UserCompanyRate(Base):
    __tablename__ = "user_company_rates"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), primary_key=True)

    hourly_rate = Column(Numeric(10, 2), default=0.00)
    daily_rate = Column(Numeric(10, 2), default=0.00)
    coordination_rate = Column(Numeric(10, 2), default=0.00)
    night_rate = Column(Numeric(10, 2), default=0.00)
    is_gross = Column(Boolean, default=True)
    deduction_ss = Column(Numeric(5, 4), nullable=True) # Override for SS
    deduction_irpf = Column(Numeric(5, 4), default=0.00) 
    deduction_extra = Column(Numeric(5, 4), default=0.00)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="rates")
    company = relationship("Company", back_populates="user_rates")

class WorkLog(Base):
    __tablename__ = "work_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)
    
    type = Column(Enum(WorkLogType), nullable=False)
    
    date = Column(Date, nullable=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    
    duration_hours = Column(Numeric(5, 2), nullable=True)
    
    amount = Column(Numeric(10, 2), nullable=True)
    gross_amount = Column(Numeric(10, 2), default=0.0)
    rate_applied = Column(Numeric(10, 2), nullable=True)
    
    is_gross_calculation = Column(Boolean, nullable=True)
    has_coordination = Column(Boolean, default=False)
    has_night = Column(Boolean, default=False)
    arrives_prior = Column(Boolean, default=False)
    
    description = Column(Text, nullable=True)
    pickup_point = Column(String, nullable=True)
    client = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="work_logs")
    company = relationship("Company", back_populates="work_logs")

class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    status = Column(Enum(RequestStatus), default=RequestStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    message = Column(String, nullable=False)
    type = Column(Enum(NotificationType), default=NotificationType.info)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")
