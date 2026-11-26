"""PET-5: when a repeating reminder comes back. Pure date maths, no database."""

import calendar
from datetime import datetime, timedelta

from django.utils import timezone


def next_due(due_at: datetime, repeat: str) -> datetime | None:
    """The next alert time one step after `due_at`, at the same local time of day.
    A day the month doesn't have falls back to its last day (31 Jan → 28 Feb, 29 Feb → 28 Feb).
    None for a reminder that doesn't repeat."""
    local = timezone.localtime(due_at)  # step in wall-clock time, so 09:00 stays 09:00 across clock changes
    if repeat == "WEEKLY":
        return local + timedelta(days=7)
    if repeat == "MONTHLY":
        year, month = (local.year + 1, 1) if local.month == 12 else (local.year, local.month + 1)
        return _on(local, year, month)
    if repeat == "YEARLY":
        return _on(local, local.year + 1, local.month)
    return None


def _on(moment: datetime, year: int, month: int) -> datetime:
    """`moment` moved to the given year and month, keeping the day if that month has it."""
    day = min(moment.day, calendar.monthrange(year, month)[1])
    return moment.replace(year=year, month=month, day=day)
