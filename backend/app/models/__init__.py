# Import every model here so Base.metadata knows all tables
# (Alembic autogenerate and test create_all rely on this).
from app.models.application import Application, ApplicationStatus, HousingType
from app.models.cat import Cat, CatStatus, Sex

__all__ = [
    "Application",
    "ApplicationStatus",
    "Cat",
    "CatStatus",
    "HousingType",
    "Sex",
]
