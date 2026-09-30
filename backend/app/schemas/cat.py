from datetime import datetime

from pydantic import BaseModel, ConfigDict

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
