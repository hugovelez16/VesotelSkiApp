"""
Pydantic Schemas Module.

This module defines the Pydantic models used for request validation and response serialization.
It ensures that data sent to and received from the API conforms to the expected structure.
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date as dt_date, time, datetime
from uuid import UUID
from enum import Enum

def to_camel(string: str) -> str:
    words = string.split('_')
    return words[0] + ''.join(word.capitalize() for word in words[1:])


class CamelModel(BaseModel):
    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True

# Enums (mirroring models for validation)
class WorkLogType(str, Enum):
    particular = "particular"
    tutorial = "tutorial"

class WorkLogBase(CamelModel):
    """Base schema for WorkLog data, containing common fields."""
    type: WorkLogType
    date: Optional[dt_date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    start_date: Optional[dt_date] = None
    end_date: Optional[dt_date] = None
    duration_hours: Optional[float] = None
    is_gross_calculation: Optional[bool] = None
    has_coordination: bool = False
    has_night: bool = False
    arrives_prior: bool = False
    description: Optional[str] = None
    pickup_point: Optional[str] = None
    client: Optional[str] = None
    company_id: Optional[UUID] = None

class WorkLogCreate(WorkLogBase):
    """Schema for creating a new WorkLog entry."""
    user_id: UUID
    amount: Optional[float] = None # Allow manual amount override

class WorkLogResponse(WorkLogBase):
    """Schema for WorkLog response data."""
    id: UUID
    user_id: UUID
    amount: Optional[float]
    gross_amount: Optional[float] = Field(None, alias="grossAmount")
    rate_applied: Optional[float]
    created_at: datetime
    updated_at: datetime


class UserDeviceResponse(BaseModel):
    id: UUID
    device_identifier: str
    name: Optional[str] = None
    last_used: datetime
    expires_at: datetime
    created_at: datetime

    class Config:
        orm_mode = True

class UserBase(BaseModel):
    """Base schema for User data, containing common fields."""
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    """Schema for creating a new user (registration)."""
    password: Optional[str] = None

class UserResponse(UserBase):
    """Schema for User response data, excluding sensitive info like passwords."""
    id: UUID
    role: str
    is_active: bool
    is_active_worker: bool = True
    is_supervisor: bool = False # Computed
    must_change_password: bool = False
    default_company_id: Optional[UUID] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_active_worker: Optional[bool] = None
    default_company_id: Optional[UUID] = None

class UserSelfUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    default_company_id: Optional[UUID] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserCompanyRateBase(CamelModel):
    hourly_rate: Optional[float] = 0.0
    daily_rate: Optional[float] = 0.0
    coordination_rate: Optional[float] = 0.0
    night_rate: Optional[float] = 0.0
    is_gross: Optional[bool] = True
    deduction_ss: Optional[float] = None
    deduction_irpf: Optional[float] = 0.0
    deduction_extra: Optional[float] = 0.0

class UserCompanyRateCreate(UserCompanyRateBase):
    company_id: UUID

class UserCompanyRate(UserCompanyRateBase):
    user_id: UUID
    company_id: UUID
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserCompanyRateResponse(UserCompanyRate):
    pass
    user: Optional[UserResponse] = None

class CompanyBase(BaseModel):
    name: str
    fiscal_id: Optional[str] = None
    social_security_deduction: Optional[float] = 0.0
    settings: Optional[Dict[str, Any]] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    fiscal_id: Optional[str] = None
    social_security_deduction: Optional[float] = None
    settings: Optional[Dict[str, Any]] = None

class Company(CompanyBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CompanyResponse(Company):
    membership_status: Optional[str] = None
    role: Optional[str] = None
    pass


class CompanyMemberBase(BaseModel):
    role: str = "worker"
    status: str = "active"
    settings: Optional[Dict[str, Any]] = None

class CompanyMemberUpdate(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class CompanyMemberResponse(CompanyMemberBase):
    user_id: UUID
    company_id: UUID
    joined_at: datetime
    user: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

class CompanyWithMembers(CompanyResponse):
    members: List[CompanyMemberResponse] = []


class Token(BaseModel):
    access_token: str
    token_type: str
    requires_2fa: bool = False
    device_token: Optional[str] = None

class Verify2FA(BaseModel):
    code: str
    trust_device: bool = False


class TokenData(BaseModel):
    email: Optional[str] = None

class NotificationType(str, Enum):
    info = "info"
    warning = "warning"
    error = "error"

class NotificationBase(BaseModel):
    message: str
    type: NotificationType = NotificationType.info
    is_read: bool = False

class NotificationCreate(NotificationBase):
    user_id: UUID

class NotificationResponse(NotificationBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True
