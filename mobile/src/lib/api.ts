export const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;

export async function matchRecipes(payload: any) {
  const res = await fetch(`${API_BASE}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getNutrition(recipeId: string) {
  const res = await fetch(`${API_BASE}/nutrition/${recipeId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}