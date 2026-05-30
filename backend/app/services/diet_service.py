"""Personalized diet plan generator powered by OpenRouter.

The model creates the menu, while this service adds condition-specific
guardrails and validates that the response is complete enough to show.
"""

from __future__ import annotations

import json
import logging
import re

from app.services.openrouter_client import complete_text

logger = logging.getLogger(__name__)

HYPERTENSION_TERMS = ("hypertension", "high blood pressure", "blood pressure", "bp")
DIABETES_TERMS = ("diabetes", "diabetic", "blood sugar", "glucose")
KIDNEY_TERMS = ("kidney", "renal", "ckd", "dialysis")


def generate_diet_plan(
    condition: str | None = None,
    dietary_preferences: str = "balanced",
    restrictions: list[str] | None = None,
    goals: str = "general health",
    language: str = "en",
) -> dict:
    """Generate a personalized weekly diet plan."""
    restrictions = restrictions or []
    condition_text = condition or "general wellness"
    restrictions_text = ", ".join(restrictions) if restrictions else "none"
    lang_instruction = "Respond entirely in Urdu." if language == "ur" else ""

    prompt = f"""You are a nutrition assistant creating an educational 7-day meal plan.

PATIENT CONTEXT:
- Medical Condition: {condition_text}
- Dietary Preference: {dietary_preferences}
- Restrictions: {restrictions_text}
- Health Goals: {goals}

{lang_instruction}

MEDICAL AND SAFETY RULES:
{_condition_rules(condition_text, goals)}

RESTRICTION RULES:
{_restriction_rules(restrictions)}

QUALITY RULES:
- Include exactly 7 days, Day 1 through Day 7.
- Use realistic meals and portions, not extreme dieting.
- Calorie values must be plausible estimates per meal.
- Do not include foods that violate allergies or restrictions.
- Tips must include one professional-safety note when a medical condition is present.
- Do not claim the plan diagnoses, treats, cures, or replaces clinician care.

Respond ONLY in this JSON format, with no markdown or extra text:
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
  "tips": ["<health tip 1>", "<health tip 2>", "<health tip 3>"]
}}
"""

    try:
        response_text = complete_text(prompt, temperature=0.25, max_tokens=2600)
        parsed = _parse_diet_response(response_text)
        return _normalize_diet_plan(parsed, condition_text, dietary_preferences, restrictions, goals)
    except Exception as exc:
        logger.error("Diet plan generation failed: %s", exc)
        return _fallback_diet_plan(condition_text, dietary_preferences, restrictions, goals)


def _has_any(text: str, terms: tuple[str, ...]) -> bool:
    normalized = text.lower()
    return any(term in normalized for term in terms)


def _condition_rules(condition: str, goals: str) -> str:
    context = f"{condition} {goals}".lower()
    rules = [
        "Use whole foods, realistic portions, and culturally adaptable meals.",
        "Avoid claiming the plan treats, cures, or replaces care from a clinician.",
        "Do not include foods that conflict with stated allergies or restrictions.",
        "Include calorie estimates, but avoid extreme daily calorie restriction.",
    ]

    if _has_any(context, HYPERTENSION_TERMS):
        rules.extend([
            "For blood pressure, follow a DASH-style pattern: vegetables, fruits, beans/lentils, whole grains, fish/poultry/soy, nuts/seeds, and unsaturated fats.",
            "Keep sodium low: prefer unsalted/no-salt-added foods; avoid processed meats, instant noodles, pickles, salty sauces, regular miso, regular soy sauce, and salty packaged snacks.",
            "Mention a sodium target of no more than 2,300 mg/day, and ideally 1,500 mg/day if advised by a clinician.",
            "Emphasize potassium-rich foods only with a caution: people with kidney disease or potassium-raising medicines should ask a clinician first.",
        ])
    if _has_any(context, DIABETES_TERMS):
        rules.extend([
            "For diabetes, distribute carbohydrates across meals and pair carbs with protein, fiber, or healthy fat.",
            "Avoid sugary drinks and large dessert portions; prefer low-glycemic whole grains, legumes, non-starchy vegetables, lean proteins, and unsweetened foods.",
        ])
    if _has_any(context, KIDNEY_TERMS):
        rules.extend([
            "For kidney disease, do not recommend high-potassium or high-phosphorus patterns unless clinician-approved.",
            "Avoid generic advice to increase potassium; recommend renal dietitian review.",
        ])

    return "\n".join(f"- {rule}" for rule in rules)


def _restriction_rules(restrictions: list[str]) -> str:
    joined = " ".join(restrictions).lower()
    rules: list[str] = []

    if "dairy" in joined or "lactose" in joined:
        rules.append("Dairy-free means no milk, yogurt, cheese, paneer, butter, cream, whey, casein, or cottage cheese; use fortified unsweetened alternatives if needed.")
    if "gluten" in joined:
        rules.append("Gluten-free means no wheat, barley, rye, regular bread, regular pasta, or standard wraps; use certified gluten-free grains.")
    if "nut" in joined or "peanut" in joined:
        rules.append("Nut allergy means no tree nuts, peanuts, nut butters, almond milk, cashews, walnuts, pistachios, or nut-based snacks.")
    if "shellfish" in joined or "shrimp" in joined:
        rules.append("Shellfish restriction means no shrimp, prawns, crab, lobster, or shellfish sauces.")

    return "\n".join(f"- {rule}" for rule in rules) or "- No extra restriction-specific exclusions."


def _parse_diet_response(text: str) -> dict:
    """Parse the model response into structured diet plan."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:]).strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse diet plan JSON")
        return {}

    return {
        "title": parsed.get("title", "Your Personalized Diet Plan"),
        "summary": parsed.get("summary", ""),
        "plan": parsed.get("plan", []),
        "tips": parsed.get("tips", []),
    }


def _normalize_diet_plan(
    plan: dict,
    condition: str = "general wellness",
    dietary_preferences: str = "balanced",
    restrictions: list[str] | None = None,
    goals: str = "general health",
) -> dict:
    """Keep generated plans complete and add condition-specific guardrails."""
    restrictions = restrictions or []
    days = plan.get("plan") if isinstance(plan.get("plan"), list) else []
    if len(days) != 7:
        logger.warning("Diet plan had %s days; using validated fallback", len(days))
        return _fallback_diet_plan(condition, dietary_preferences, restrictions, goals)

    for idx, day in enumerate(days[:7], start=1):
        if not isinstance(day, dict):
            return _fallback_diet_plan(condition, dietary_preferences, restrictions, goals)
        day["day"] = day.get("day") or f"Day {idx}"
        for meal_name in ("breakfast", "lunch", "dinner"):
            meal = day.get(meal_name)
            if not isinstance(meal, dict) or not meal.get("name"):
                logger.warning("Diet plan missing %s on day %s; using fallback", meal_name, idx)
                return _fallback_diet_plan(condition, dietary_preferences, restrictions, goals)
        if not isinstance(day.get("snacks"), list):
            day["snacks"] = []

    tips = [str(t) for t in plan.get("tips", []) if str(t).strip()]
    context = f"{condition} {goals}"

    if _has_any(context, HYPERTENSION_TERMS):
        tips = _merge_tips(tips, [
            "Keep sodium under 2,300 mg/day; ask a clinician whether a 1,500 mg/day target is appropriate.",
            "Use potassium-rich foods for blood pressure only if you do not have kidney disease and are not on potassium-raising medicines.",
            "Choose no-salt-added foods and herbs/spices instead of salty sauces or packaged snacks.",
        ])
    if _has_any(context, DIABETES_TERMS):
        tips = _merge_tips(tips, [
            "Monitor blood glucose response and coordinate meal timing with prescribed diabetes medicines.",
            "Pair carbohydrate foods with protein, fiber, and healthy fats to reduce glucose spikes.",
        ])
    if _has_any(context, KIDNEY_TERMS):
        tips = _merge_tips(tips, [
            "Kidney disease diets must be individualized for potassium, phosphorus, sodium, protein, and fluid limits.",
            "Review this plan with a renal dietitian or clinician before following it.",
        ])
    if condition and condition.lower() != "general wellness":
        tips = _merge_tips(tips, [
            "This educational plan should be reviewed by a qualified clinician or dietitian for your diagnosis, medicines, labs, and allergies.",
        ])

    return {
        "title": plan.get("title") or "Your Personalized Diet Plan",
        "summary": plan.get("summary") or "A structured 7-day meal plan built around whole foods, balanced portions, and the stated health goals.",
        "plan": days[:7],
        "tips": tips[:6],
    }


def _merge_tips(existing: list[str], required: list[str]) -> list[str]:
    merged = list(existing)
    comparable = " ".join(_tip_key(tip) for tip in existing)
    for tip in required:
        if _tip_key(tip) not in comparable:
            merged.append(tip)
    return merged


def _tip_key(tip: str) -> str:
    words = re.sub(r"[^a-z0-9]+", " ", tip.lower()).strip().split()
    return " ".join(words[:5])


def _fallback_diet_plan(
    condition: str = "general wellness",
    dietary_preferences: str = "balanced",
    restrictions: list[str] | None = None,
    goals: str = "general health",
) -> dict:
    """Return a validated fallback plan when the model is unavailable."""
    restrictions = restrictions or []
    context = f"{condition} {goals}".lower()
    restrictions_text = " ".join(restrictions).lower()
    dairy_free = "dairy" in restrictions_text or "lactose" in restrictions_text
    vegetarian = "vegetarian" in dietary_preferences.lower() or "vegan" in dietary_preferences.lower()

    if _has_any(context, HYPERTENSION_TERMS):
        protein_lunch = "Lentil Quinoa Bowl" if vegetarian else "Grilled Chicken Brown Rice Bowl"
        dinner_name = "Bean and Vegetable Stew" if vegetarian else "Herb Baked Fish"
        dinner_nutrients = "Fiber, magnesium, plant protein" if vegetarian else "Omega-3, protein, potassium"
        dairy_alt = "fortified unsweetened soy milk" if dairy_free else "low-fat yogurt"
        return {
            "title": "7-Day Low-Sodium DASH-Style Diet Plan",
            "summary": "A blood-pressure-focused plan emphasizing vegetables, fruits, legumes, whole grains, lean proteins, unsalted nuts or seeds, and low-sodium preparation. It avoids salty sauces and highly processed foods while keeping dairy optional based on restrictions.",
            "plan": [
                {
                    "day": f"Day {i}",
                    "breakfast": {
                        "name": "Oat Berry Bowl",
                        "description": f"Rolled oats with berries, chia seeds, cinnamon, and {dairy_alt}",
                        "calories": 360,
                        "nutrients": "Fiber, magnesium, potassium",
                    },
                    "lunch": {
                        "name": protein_lunch,
                        "description": "Whole grains, vegetables, herbs, olive oil, and no-salt-added protein",
                        "calories": 470,
                        "nutrients": "Protein, fiber, unsaturated fats",
                    },
                    "dinner": {
                        "name": dinner_name,
                        "description": "Served with sweet potato and steamed greens; seasoned with lemon, garlic, and herbs instead of salt",
                        "calories": 510,
                        "nutrients": dinner_nutrients,
                    },
                    "snacks": [
                        {
                            "name": "Fruit with Unsalted Seeds",
                            "description": "Apple or orange with unsalted pumpkin or sunflower seeds",
                            "calories": 180,
                            "nutrients": "Fiber, minerals",
                        }
                    ],
                }
                for i in range(1, 8)
            ],
            "tips": [
                "Keep sodium under 2,300 mg/day; ask a clinician whether a 1,500 mg/day target is appropriate.",
                "Use no-salt-added foods and herbs/spices instead of salty sauces, pickles, processed meats, or packaged snacks.",
                "Use potassium-rich foods for blood pressure only if you do not have kidney disease and are not on potassium-raising medicines.",
                "This educational plan should be reviewed by a qualified clinician or dietitian for your diagnosis, medicines, labs, and allergies.",
            ],
        }

    return {
        "title": "General 7-Day Balanced Diet Plan",
        "summary": "A 7-day balanced diet plan focusing on whole foods, lean proteins, and plenty of vegetables.",
        "plan": [
            {
                "day": f"Day {i}",
                "breakfast": {
                    "name": "Oatmeal with Fruit",
                    "description": "Steel-cut oats topped with banana, berries, and cinnamon",
                    "calories": 350,
                    "nutrients": "Fiber, vitamins, magnesium",
                },
                "lunch": {
                    "name": "Protein Salad Bowl",
                    "description": "Mixed greens with lean protein or beans, avocado, and olive oil dressing",
                    "calories": 450,
                    "nutrients": "Protein, healthy fats, fiber",
                },
                "dinner": {
                    "name": "Balanced Grain Plate",
                    "description": "Whole grains with vegetables and fish, poultry, tofu, or legumes",
                    "calories": 500,
                    "nutrients": "Protein, fiber, minerals",
                },
                "snacks": [
                    {
                        "name": "Fruit or Unsalted Seeds",
                        "description": "A simple whole-food snack",
                        "calories": 180,
                        "nutrients": "Fiber, minerals",
                    }
                ],
            }
            for i in range(1, 8)
        ],
        "tips": [
            "Stay hydrated with water unless your clinician has given fluid restrictions.",
            "Eat meals at consistent times and include vegetables at most meals.",
            "This educational plan should be reviewed by a qualified clinician or dietitian for your diagnosis, medicines, labs, and allergies.",
        ],
    }
