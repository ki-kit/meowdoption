# Import every model here so Base.metadata knows all tables
# (Alembic autogenerate and test create_all rely on this).
from app.models.cat import Cat, CatStatus, Sex

__all__ = ["Cat", "CatStatus", "Sex"]
