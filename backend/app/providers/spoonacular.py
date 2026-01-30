import os
import httpx
from typing import Any, Dict, List

BASE = "https://api.spoonacular.com"


async def find_by_ingredients(ingredients: List[str], number: int = 25) -> List[Dict[str, Any]]:
    key = os.getenv("SPOONACULAR_API_KEY")
    if not key:
        raise RuntimeError("Missing SPOONACULAR_API_KEY in env")

    params = {
        "apiKey": key,
        "ingredients": ",".join(ingredients),
        "number": number,
        "ranking": 1,       # maximize used ingredients
        "ignorePantry": True,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BASE}/recipes/findByIngredients", params=params)
        r.raise_for_status()
        return r.json()