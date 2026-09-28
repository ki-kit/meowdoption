"""Fill an empty database with sample cats.

Usage (inside the api container):  python -m app.seed
Idempotent: does nothing if any cat already exists.
"""

from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import Cat, CatStatus, Sex

SAMPLE_CATS = [
    dict(name="Mourek", sex=Sex.male, age_months=24, breed="European Shorthair",
         castrated=True, good_with_kids=True, good_with_cats=True,
         description="Calm tabby who loves windowsills and slow blinks."),
    dict(name="Micka", sex=Sex.female, age_months=6, breed="Siamese",
         good_with_kids=True, good_with_cats=True,
         description="Playful kitten, chatty, follows you everywhere."),
    dict(name="Líza", sex=Sex.female, age_months=60, breed="European Shorthair",
         castrated=True, status=CatStatus.pending,
         description="Independent lady, prefers a quiet home without kids."),
    dict(name="Garfield", sex=Sex.male, age_months=120, breed="Persian",
         castrated=True, good_with_dogs=True, status=CatStatus.adopted,
         description="Senior gentleman. Lasagna enthusiast."),
    dict(name="Luna", sex=Sex.female, age_months=18, breed="British Shorthair",
         castrated=True, good_with_kids=True, good_with_dogs=True,
         description="Gentle and cuddly, gets along with everyone."),
    dict(name="Oskar", sex=Sex.male, age_months=36, breed="Maine Coon",
         good_with_cats=True, good_with_dogs=True,
         description="Big fluffy softie, needs regular brushing."),
]


def seed() -> int:
    with SessionLocal() as db:
        if db.scalar(select(func.count(Cat.id))):
            return 0
        db.add_all(Cat(**data) for data in SAMPLE_CATS)
        db.commit()
        return len(SAMPLE_CATS)


if __name__ == "__main__":
    print(f"Seeded {seed()} cats.")
