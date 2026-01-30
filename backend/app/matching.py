import re
from datetime import date
from typing import Dict, List, Optional


def normalize_name(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9\s]", "", s)
    s = re.sub(r"\s+", " ", s)
    return s


def expiry_urgency(expiry_date: Optional[str]) -> float:
    if not expiry_date:
        return 0.0
    try:
        y, m, d = map(int, expiry_date.split("-"))
        exp = date(y, m, d)
        days = (exp - date.today()).days
        if days <= 0:
            return 1.0
        if days <= 2:
            return 0.9
        if days <= 5:
            return 0.6
        if days <= 10:
            return 0.3
        return 0.1
    except Exception:
        return 0.0


def score_recipe(
    used: List[str],
    missed: List[str],
    pantry_urgency: Dict[str, float],
    ready_in_minutes: Optional[int],
    time_limit_minutes: Optional[int],
) -> float:
    missing_count = len(missed)

    # Hard preference: 0 missing dominates
    score = 100.0 - missing_count * 35.0
    score += len(used) * 2.0

    # Use-up-soon boost
    score += sum(pantry_urgency.get(u, 0.0) for u in used) * 15.0

    # Time preference (soft)
    if time_limit_minutes and ready_in_minutes:
        if ready_in_minutes > time_limit_minutes:
            score -= (ready_in_minutes - time_limit_minutes) * 0.5

    return score