# App/schemas/ShiftSchema.py

from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List


class ShiftDurationUnit(str, Enum):
    """Supported time units for custom shift & token duration."""
    SECONDS = "seconds"
    MINUTES = "minutes"
    HOURS = "hours"
    DAYS = "days"
    WEEKS = "weeks"
    MONTHS = "months"
    YEARS = "years"


class StartShiftRequest(BaseModel):
    """Payload to start a new work session / shift."""
    target_user_id: Optional[int] = Field(
        None, 
        description="Target user ID to start shift for (Admin-only capability. Normal users start shifts for themselves)"
    )
    key_id: Optional[str] = Field(
        None, 
        description="Optional CryptoKey UUID to bind to this shift (Defaults automatically to the primary active key)"
    )
    duration_hours: Optional[int] = Field(
        8,
        ge=1,
        description="Shift duration in hours (default 8; overridden if duration_value is provided)",
    )
    duration_value: Optional[int] = Field(
        None,
        ge=1,
        description="Custom duration numerical value (e.g. 30, 8, 7). Use with duration_unit.",
    )
    duration_unit: ShiftDurationUnit = Field(
        ShiftDurationUnit.HOURS,
        description="Unit for shift duration: seconds, minutes, hours, days, weeks, months, years",
    )
    device_id: Optional[str] = Field(None, max_length=255, description="Physical scanner or handheld device serial/ID")
    include_rules: bool = Field(
        True,
        description="Checkbox: if true (checked), embeds active inventory rules into the shift token. If false (unchecked), token is minted without rules."
    )


class RevokeShiftRequest(BaseModel):
    """Payload to forcefully revoke an active shift."""
    reason: str = Field(..., min_length=3, max_length=255, description="Administrative justification for revocation")


class ShiftResponse(BaseModel):
    """Public representation of a shift."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: int
    key_id: str
    device_id: Optional[str] = None
    status: str
    started_at: Optional[str] = None
    expires_at: Optional[str] = None
    ended_at: Optional[str] = None
    revoked_reason: Optional[str] = None
    created_by: Optional[int] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None


class StartShiftResponse(BaseModel):
    """Response returned upon shift start, containing the scoped shift_token JWT."""
    shift: ShiftResponse
    shift_token: str
    expires_at: str
    expires_in_seconds: Optional[int] = None
    qr_code_base64: Optional[str] = None


class ShiftListResponse(BaseModel):
    """Paginated collection of shifts."""
    items: List[ShiftResponse]
    limit: int
    offset: int
    total: int


class ExpireShiftsResponse(BaseModel):
    """Response returned by shift maintenance job."""
    expired_shifts_count: int


class DeleteShiftResponse(BaseModel):
    """Response returned after permanently deleting a shift."""
    status: str
    message: str
    shift: ShiftResponse
    removed_scans: int = 0
