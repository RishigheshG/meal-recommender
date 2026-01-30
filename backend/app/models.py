from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class PantryItemIn(BaseModel):
    name: str
    quantity: float = Field(gt=0)
    unit: str
    expiry_date: Optional[str] = None  # YYYY-MM-DD
    location: Optional[Literal["pantry", "fridge", "freezer"]] = "pantry"


class MatchRequest(BaseModel):
    items: List[PantryItemIn]
    max_missing: int = 2
    time_limit_minutes: Optional[int] = None
    cuisine: Optional[str] = None
    spice_level: Optional[Literal["mild", "medium", "hot"]] = None
    budget_mode: bool = False


class RecipeOut(BaseModel):
    id: str
    title: str
    image: Optional[str] = None
    used_ingredients: List[str]
    missing_ingredients: List[str]
    match_score: float
    ready_in_minutes: Optional[int] = None
    source: str = "spoonacular"


class MatchResponse(BaseModel):
    recipes: List[RecipeOut]