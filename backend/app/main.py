from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import os
import tempfile
from openai import OpenAI

from .models import MatchRequest, MatchResponse, RecipeOut
from .matching import normalize_name, expiry_urgency, score_recipe
from .providers.spoonacular import find_by_ingredients
from .providers.nutrition import get_nutrition

app = FastAPI(title="MealCraft API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/stt")
async def stt(file: UploadFile = File(...)):
    """Accepts an audio file as multipart/form-data field named 'file' and returns {"text": "..."}."""

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing OPENAI_API_KEY")

    # Basic content-type guard (still allow unknown types because Android uploads vary)
    if file.content_type and not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail=f"Expected audio/* content-type, got {file.content_type}")

    client = OpenAI(api_key=api_key)

    # Preserve file extension when available (helps OpenAI infer format)
    suffix = "." + (
        file.filename.split(".")[-1]
        if file.filename and "." in file.filename
        else "m4a"
    )

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            transcript = client.audio.transcriptions.create(
                model="gpt-4o-mini-transcribe",
                file=f,
            )
        text = (getattr(transcript, "text", None) or "").strip()
        return {"text": text}
    except Exception as e:
        # Return a clean error to the client; keep details for logs
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

def _to_number(s: str | None):
    if not s:
        return None
    # "543kcal" -> 543, "12g" -> 12
    digits = "".join(ch for ch in s if (ch.isdigit() or ch == "."))
    try:
        return float(digits) if digits else None
    except:
        return None

@app.get("/nutrition/{recipe_id}")
async def nutrition(recipe_id: str):
    data = await get_nutrition(recipe_id)
    return {
        "recipe_id": str(recipe_id),
        "calories": _to_number(data.get("calories")),
        "protein_g": _to_number(data.get("protein")),
        "carbs_g": _to_number(data.get("carbs")),
        "fat_g": _to_number(data.get("fat")),
    }

@app.post("/match", response_model=MatchResponse)
async def match(req: MatchRequest):
    pantry_names = [normalize_name(i.name) for i in req.items]
    pantry_urgency: Dict[str, float] = {normalize_name(i.name): expiry_urgency(i.expiry_date) for i in req.items}

    raw = await find_by_ingredients(pantry_names, number=25)

    recipes: List[RecipeOut] = []
    for r in raw:
        used = [normalize_name(x["name"]) for x in r.get("usedIngredients", [])]
        missed = [normalize_name(x["name"]) for x in r.get("missedIngredients", [])]

        if len(missed) > req.max_missing:
            continue

        ready_in = r.get("readyInMinutes")  # may be missing; keep optional

        s = score_recipe(
            used=used,
            missed=missed,
            pantry_urgency=pantry_urgency,
            ready_in_minutes=ready_in,
            time_limit_minutes=req.time_limit_minutes,
        )

        recipes.append(
            RecipeOut(
                id=str(r.get("id")),
                title=r.get("title", "Untitled"),
                image=r.get("image"),
                used_ingredients=used,
                missing_ingredients=missed,
                match_score=s,
                ready_in_minutes=ready_in,
                source="spoonacular",
            )
        )

    recipes.sort(key=lambda x: x.match_score, reverse=True)
    return MatchResponse(recipes=recipes[:15])