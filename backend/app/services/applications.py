"""Application review rules (status transitions and their side effects)."""

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Application, ApplicationStatus, Cat, CatStatus

New, Approved, Rejected = ApplicationStatus.new, ApplicationStatus.approved, ApplicationStatus.rejected

# Undoing an approval goes through "rejected" only, so there's one clear path.
ALLOWED = {
    New: {Approved, Rejected},
    Rejected: {New, Approved},
    Approved: {Rejected},
}


class TransitionError(Exception):
    pass


def set_status(db: Session, application: Application, target: ApplicationStatus) -> None:
    """Change an application's status and apply the side effects, in one commit."""
    current = application.status
    if target == current:
        return
    if target not in ALLOWED[current]:
        raise TransitionError(f"Can't change an application from {current} to {target}.")

    # Lock the cat row: two admins approving two applications for the same cat
    # at once must not both win. (Postgres honours this; SQLite serialises writes.)
    # The ORM refreshes a row read FOR UPDATE, so we see the other admin's commit.
    cat = db.scalars(select(Cat).where(Cat.id == application.cat_id).with_for_update()).one()

    if target == Approved:
        if cat.status == CatStatus.adopted:
            raise TransitionError(f"{cat.name} has already been adopted.")
        cat.status = CatStatus.adopted
        # Everyone else waiting for this cat gets a decision too.
        db.execute(
            update(Application)
            .where(
                Application.cat_id == cat.id,
                Application.id != application.id,
                Application.status == New,
            )
            .values(status=Rejected)
        )
    elif current == Approved:
        # Undo: the adoption fell through, the cat is looking for a home again.
        # Auto-rejected applicants stay rejected; an admin can reopen them.
        cat.status = CatStatus.available

    application.status = target
    db.commit()
