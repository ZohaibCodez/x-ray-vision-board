"""Personalized diet plan generator powered by OpenRouter GLM 4.5 Air.

FYP requirement: Generate personalized diet plans based on
medical conditions, dietary preferences, and health goals.
"""

from __future__ import annotations
import json
import logging
from app.services.openrouter_client import complete_text

logger = logging.getLogger(__name__)


def generate_diet_plan(
    condition: str | None = None,
    dietary_preferences: str = "balanced",
    restrictions: list[str] | None = None,
    goals: str = "general health",
    language: str = "en",
) -> dict:
    """Generate a personalized weekly diet plan.

    Args:
        condition: Medical condition (e.g., "diabetes", "heart disease").
        dietary_preferences: e.g., "vegetarian", "balanced", "keto".
        restrictions: e.g., ["gluten-free", "dairy-free"].
        goals: e.g., "weight loss", "muscle gain", "general health".
        language: "en" or "ur".

    Returns:
        Dict with title, summary, plan (7 days), and tips.
    """
    restrictions_text = ", ".join(restrictions) if restrictions else "none"
    condition_text = condition or "general wellness"

    lang_instruction = "Respond entirely in Urdu (اردو)." if language == "ur" else ""

    prompt = f"""You are a certified nutritionist AI assistant. Generate a personalized 3-day diet plan.

PATIENT CONTEXT:
- Medical Condition: {condition_text}
- Dietary Preference: {dietary_preferences}
- Restrictions: {restrictions_text}
- Health Goals: {goals}

{lang_instruction}

Respond ONLY in this JSON format (no markdown, no extra text):
{{
  "title": "<diet plan title>",
  "summary": "<2-3 sentence summary of the diet approach>",
  "plan": [
    {{
      "day": "Day 1",
      "breakfast": {{"name": "<meal>", "description": "<brief description>", "calories": <number>, "nutrients": "<key nutrients>"}},
      "lunch": {{"name": "<meal>", "description": "<brief description>", "calories": <number>, "nutrients": "<key nutrients>"}},
      "dinner": {{"name": "<meal>", "description": "<brief description>", "calories": <number>, "nutrients": "<key nutrients>"}},
      "snacks": [{{"name": "<snack>", "description": "<brief>", "calories": <number>, "nutrients": "<key nutrients>"}}]
    }}
  ],
  "tips": [
    "<health tip 1>",
    "<health tip 2>",
    "<health tip 3>"
  ]
}}

Include 3 days in the plan. Be specific with meal names and calorie estimates.
Ensure the plan is medically appropriate for the stated condition.
"""

    try:
        response_text = complete_text(prompt, temperature=0.3, max_tokens=2200)
        return _parse_diet_response(response_text)
    except Exception as e:
        logger.error(f"Diet plan generation failed: {e}")
        return _fallback_diet_plan()


def _parse_diet_response(text: str) -> dict:
    """Parse the model response into structured diet plan."""
    cleaned = text.strip()

    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
        return {
            "title": parsed.get("title", "Your Personalized Diet Plan"),
            "summary": parsed.get("summary", ""),
            "plan": parsed.get("plan", []),
            "tips": parsed.get("tips", []),
        }
    except json.JSONDecodeError:
        logger.warning("Failed to parse diet plan JSON")
        return _fallback_diet_plan()


def _fallback_diet_plan() -> dict:
    """Return a basic fallback diet plan."""
    return {
        "title": "General Balanced Diet Plan",
        "summary": "A balanced diet plan focusing on whole foods, lean proteins, and plenty of vegetables.",
        "plan": [
            {
                "day": "Day 1",
                "breakfast": {"name": "Oatmeal with Fruits", "description": "Steel-cut oats topped with banana, berries, and honey", "calories": 350, "nutrients": "Fiber, Vitamins C & K"},
                "lunch": {"name": "Grilled Chicken Salad", "description": "Mixed greens with grilled chicken, avocado, and olive oil dressing", "calories": 450, "nutrients": "Protein, Healthy Fats"},
                "dinner": {"name": "Baked Salmon with Vegetables", "description": "Salmon fillet with roasted broccoli and sweet potato", "calories": 500, "nutrients": "Omega-3, Protein, Fiber"},
                "snacks": [{"name": "Mixed Nuts", "description": "Almonds, walnuts, and cashews", "calories": 200, "nutrients": "Healthy Fats, Protein"}],
            }
        ],
        "tips": [
            "Stay hydrated — drink at least 8 glasses of water daily",
            "Eat meals at consistent times to maintain blood sugar levels",
            "Include a variety of colorful vegetables in every meal",
        ],
    }
