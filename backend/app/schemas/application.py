from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator

from app.models import ApplicationStatus, CatStatus, HousingType


class ApplicationCreate(BaseModel):
    # Trim whitespace everywhere, so "   " counts as empty.
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: Annotated[str, StringConstraints(min_length=1, max_length=100)]
    email: Annotated[EmailStr, Field(max_length=254)]
    phone: Annotated[str, Field(max_length=30, pattern=r"^[0-9+()\s-]*$")] = ""
    message: Annotated[str, Field(max_length=2000)] = ""
    housing_type: HousingType
    has_other_pets: bool = False

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        # Makes the one-application-per-person rule case-insensitive.
        return v.lower()


class ApplicationReceipt(BaseModel):
    """Public response: confirms receipt without echoing personal data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    cat_id: int
    status: ApplicationStatus
    created_at: datetime


class CatSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    status: CatStatus


class ApplicationRead(BaseModel):
    """Admin view: full applicant details."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    cat: CatSummary
    full_name: str
    email: str
    phone: str
    message: str
    housing_type: HousingType
    has_other_pets: bool
    status: ApplicationStatus
    created_at: datetime


class ApplicationPage(BaseModel):
    items: list[ApplicationRead]
    total: int
    page: int
    size: int


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
