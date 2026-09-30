from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator
from pydantic_core import PydanticCustomError

from app.models import CatStatus, Sex


class CatRead(BaseModel):
    # from_attributes lets Pydantic read directly from SQLAlchemy objects.
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    age_months: int
    sex: Sex
    breed: str
    description: str
    castrated: bool
    status: CatStatus
    good_with_kids: bool
    good_with_cats: bool
    good_with_dogs: bool
    created_at: datetime
    updated_at: datetime


class CatPage(BaseModel):
    items: list[CatRead]
    total: int
    page: int
    size: int


Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
AgeMonths = Annotated[int, Field(ge=0, le=360)]  # 30 years: a generous cat lifespan
Breed = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)]


class CatCreate(BaseModel):
    name: Name
    sex: Sex
    age_months: AgeMonths
    breed: Breed = ""
    description: Description = ""
    castrated: bool = False
    status: CatStatus = CatStatus.available
    good_with_kids: bool = False
    good_with_cats: bool = False
    good_with_dogs: bool = False


class CatUpdate(BaseModel):
    """PATCH body: only the fields sent are changed (exclude_unset).
    Sending null is rejected, so a required field can't be cleared."""

    name: Name | None = None
    sex: Sex | None = None
    age_months: AgeMonths | None = None
    breed: Breed | None = None
    description: Description | None = None
    castrated: bool | None = None
    status: CatStatus | None = None
    good_with_kids: bool | None = None
    good_with_cats: bool | None = None
    good_with_dogs: bool | None = None

    @model_validator(mode="after")
    def _no_nulls(self) -> "CatUpdate":
        for field in self.model_fields_set:
            if getattr(self, field) is None:
                raise PydanticCustomError("null_field", f"{field} can't be null")
        return self
