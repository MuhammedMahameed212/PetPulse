"""PET-3 (AC6): when each vaccination or treatment is next needed. Pure rules, no request code."""

from datetime import date, timedelta

DUE_SOON_DAYS = 30

OVERDUE = "OVERDUE"
DUE_SOON = "DUE_SOON"
UP_TO_DATE = "UP_TO_DATE"


def dose_key(category: str, name: str) -> tuple[str, str]:
    """Doses of the same care share a category and a name (ignoring letter case and outer spaces)."""
    return category, name.strip().casefold()


def replaced_ids(records) -> set[int]:
    """Ids of records that a later dose of the same care replaces.

    `records` are (id, category, name, given_on) tuples for one pet. Later means a later date,
    or the same date and a higher id.
    """
    latest = {}
    for record_id, category, name, given_on in records:
        key = dose_key(category, name)
        latest[key] = max(latest.get(key, (given_on, record_id)), (given_on, record_id))
    return {
        record_id
        for record_id, category, name, given_on in records
        if latest[dose_key(category, name)] != (given_on, record_id)
    }


def due_status(next_due: date | None, replaced: bool, today: date) -> str | None:
    """OVERDUE, DUE_SOON or UP_TO_DATE for the current dose; None when replaced or no next date is set."""
    if replaced or next_due is None:
        return None
    if next_due < today:
        return OVERDUE
    if next_due <= today + timedelta(days=DUE_SOON_DAYS):
        return DUE_SOON
    return UP_TO_DATE
