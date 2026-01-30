import os
import httpx

BASE = "https://api.spoonacular.com"

async def get_nutrition(recipe_id: str) -> dict:
    key = os.getenv("SPOONACULAR_API_KEY")
    if not key:
        raise RuntimeError("Missing SPOONACULAR_API_KEY in env")

    # Returns calories, carbs, fat, protein as strings like "543kcal"
    params = {"apiKey": key}
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BASE}/recipes/{recipe_id}/nutritionWidget.json", params=params)
        r.raise_for_status()
        return r.json()