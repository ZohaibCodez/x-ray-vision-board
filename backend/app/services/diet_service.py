"""Personalized diet plan generator powered by OpenRouter.

The plans are written for ordinary households in Pakistan. That constraint is
the whole point of this module: an earlier version produced things like
"Protein Salad Bowl" and "Oat Berry Bowl", which most users here do not
recognise, cannot buy easily, and will not cook. Everything below — the prompt,
the validation, and the offline fallback — pushes the output towards food people
actually eat: anda, roti, daal, chawal, sabzi, dahi, kela.
"""

from __future__ import annotations

import json
import logging
import re

from app.services.openrouter_client import OpenRouterError, complete_text

logger = logging.getLogger(__name__)

HYPERTENSION_TERMS = ("hypertension", "high blood pressure", "blood pressure", "bp", "بلڈ پریشر")
DIABETES_TERMS = ("diabetes", "diabetic", "blood sugar", "glucose", "sugar", "shugar", "شوگر")
KIDNEY_TERMS = ("kidney", "renal", "ckd", "dialysis", "گردہ", "گردے")

# Foods the model reaches for by default that do not belong in a plan meant for
# a Pakistani kitchen. If several show up, the generated plan is rejected.
UNFAMILIAR_FOODS = (
    "quinoa", "oat", "oatmeal", "granola", "kale", "avocado", "tofu",
    "hummus", "chia", "smoothie bowl", "berry bowl", "salad bowl",
    "cottage cheese", "salmon", "asparagus", "zucchini", "couscous",
    "tortilla", "bagel", "pancake", "protein shake", "protein bar",
    "miso", "sushi", "broccoli", "edamame",
)


def generate_diet_plan(
    condition: str | None = None,
    dietary_preferences: str = "balanced",
    restrictions: list[str] | None = None,
    goals: str = "general health",
    language: str = "en",
) -> dict:
    """Generate a simple, personalized 7-day Pakistani meal plan."""
    restrictions = restrictions or []
    condition_text = condition or "general wellness"
    restrictions_text = ", ".join(restrictions) if restrictions else "none"
    urdu = language == "ur"

    lang_instruction = (
        "Write every name, description, nutrient and tip in simple Urdu (اردو). "
        "Use the Urdu words people actually say at home: انڈا، روٹی، دال، چاول، سبزی، دہی، کیلا۔"
        if urdu
        else "Write in simple English. Use the local name first and a short English "
        "explanation in brackets where helpful, e.g. \"Daal Chawal (lentils with rice)\"."
    )

    prompt = f"""You are a nutrition assistant creating a simple, educational 7-day meal plan
for an ordinary household in Pakistan.

PATIENT CONTEXT:
- Medical Condition: {condition_text}
- Dietary Preference: {dietary_preferences}
- Things to avoid: {restrictions_text}
- Health Goal: {goals}

{lang_instruction}

THE MOST IMPORTANT RULE — KEEP IT SIMPLE AND LOCAL:
- Only use everyday Pakistani home food that is cheap and available in any local market.
- Good examples: anda (egg), roti, double roti (bread), chawal (rice), daal (lentils),
  chana, sabzi (vegetable curry), aloo, palak, bhindi, dahi (yogurt), lassi, doodh (milk),
  kela (banana), seb (apple), malta, chicken salan, yakhni, khichdi, paratha, halwa,
  raita, kheera, gajar, tamatar, pyaz, chai.
- NEVER use foods most Pakistani households would not recognise or buy: no quinoa, no oats
  or oatmeal, no granola, no kale, no avocado, no tofu, no hummus, no chia seeds, no
  "protein salad bowl", no "berry bowl", no salmon, no broccoli, no couscous, no smoothies.
- Name each meal the way a person would say it at home, not like a restaurant menu.
- Descriptions must be one short, plain sentence a person with no education in nutrition
  can follow. Say the portion in normal words: "2 roti", "aik pyali chawal", "aik anda".
- Do not use nutrition jargon. Write "gives energy" or "good for strength", not
  "macronutrient profile" or "micronutrient density".
- Vary the 7 days so it is not the same food every day.

MEDICAL AND SAFETY RULES:
{_condition_rules(condition_text, goals)}

FOODS TO AVOID FOR THIS PERSON:
{_restriction_rules(restrictions)}

QUALITY RULES:
- Include exactly 7 days, Day 1 through Day 7.
- Use realistic home portions, not extreme dieting.
- Calorie values must be plausible estimates per meal.
- Give 3 to 5 short tips in plain language.
- Do not claim the plan diagnoses, treats, cures, or replaces a doctor.

Respond ONLY in this JSON format, with no markdown and no extra text:
{{
  "title": "<short plan title>",
  "summary": "<2-3 simple sentences about the plan>",
  "plan": [
    {{
      "day": "Day 1",
      "breakfast": {{"name": "<meal>", "description": "<one plain sentence>", "calories": <number>, "nutrients": "<simple benefit, e.g. protein and energy>"}},
      "lunch": {{"name": "<meal>", "description": "<one plain sentence>", "calories": <number>, "nutrients": "<simple benefit>"}},
      "dinner": {{"name": "<meal>", "description": "<one plain sentence>", "calories": <number>, "nutrients": "<simple benefit>"}},
      "snacks": [{{"name": "<snack>", "description": "<one plain sentence>", "calories": <number>, "nutrients": "<simple benefit>"}}]
    }}
  ],
  "tips": ["<simple tip 1>", "<simple tip 2>", "<simple tip 3>"]
}}
"""

    try:
        # A 7-day plan is ~2,500 tokens of JSON on its own. The free tier
        # routes to reasoning models that spend most of a small budget
        # thinking, so give it real headroom and turn the thinking down.
        response_text = complete_text(
            prompt,
            temperature=0.35,
            max_tokens=16000,
            reasoning={"effort": "low", "exclude": True},
        )
        parsed = _parse_diet_response(response_text)
        return _normalize_diet_plan(
            parsed, condition_text, dietary_preferences, restrictions, goals, language
        )
    except OpenRouterError as exc:
        logger.error("Diet plan generation unavailable: %s", exc)
        return _fallback_diet_plan(condition_text, dietary_preferences, restrictions, goals, language)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Diet plan generation failed: %s", exc)
        return _fallback_diet_plan(condition_text, dietary_preferences, restrictions, goals, language)


def _has_any(text: str, terms: tuple[str, ...]) -> bool:
    normalized = text.lower()
    return any(term in normalized for term in terms)


def _condition_rules(condition: str, goals: str) -> str:
    context = f"{condition} {goals}".lower()
    rules = [
        "Use simple home-cooked food and normal portions.",
        "Do not claim the plan treats or cures anything, or replaces a doctor.",
        "Do not include any food the person said they must avoid.",
        "Include calorie estimates, but never suggest starving or skipping meals.",
    ]

    if _has_any(context, HYPERTENSION_TERMS):
        rules.extend([
            "For high blood pressure, keep salt low: say clearly to use less namak while cooking,"
            " and to avoid achaar (pickle), papad, chips, packet noodles, and salty snacks.",
            "Prefer fresh sabzi, daal, chana, fruit, and plain dahi.",
            "Mention keeping salt under about one small teaspoon a day, and less if the doctor says so.",
            "Only suggest potassium-rich foods with a caution: anyone with kidney trouble or on"
            " blood pressure medicines should ask their doctor first.",
        ])
    if _has_any(context, DIABETES_TERMS):
        rules.extend([
            "For sugar (diabetes), spread roti and rice through the day instead of one big meal,"
            " and always pair them with daal, sabzi, anda, dahi or meat.",
            "Say clearly to avoid soft drinks, packet juice, mithai, and lots of sugar in chai.",
            "Prefer chapati over white bread, and a smaller portion of rice.",
            "NEVER put these in a diabetic plan, not even once: halwa puri, puri, jalebi, gulab jamun,"
            " mithai, sheer khurma, sweet lassi, rooh afza, sugary paratha, cake, biscuits, or any"
            " deep-fried nashta. They are normal Pakistani foods but they are wrong for this person.",
        ])
    if _has_any(context, KIDNEY_TERMS):
        rules.extend([
            "For kidney problems, do not push high-potassium or high-phosphorus food unless a doctor approves.",
            "Say clearly that a kidney patient must get the plan checked by their own doctor or dietitian.",
        ])

    return "\n".join(f"- {rule}" for rule in rules)


def _restriction_rules(restrictions: list[str]) -> str:
    joined = " ".join(restrictions).lower()
    rules: list[str] = []

    if "dairy" in joined or "lactose" in joined or "milk" in joined:
        rules.append(
            "No dairy: no doodh, dahi, lassi, paneer, makhan, cream, or cheese."
        )
    if "gluten" in joined or "wheat" in joined:
        rules.append(
            "No gluten: no wheat roti, no double roti, no naan, no suji. Use rice, chawal ki roti,"
            " besan (gram flour) or makai (corn) roti instead."
        )
    if "nut" in joined or "peanut" in joined or "badam" in joined:
        rules.append("No nuts: no badam, akhrot, moongphali, pista, kaju, or nut-based food.")
    if "egg" in joined or "anda" in joined:
        rules.append("No eggs: do not use anda in any meal.")
    if "beef" in joined:
        rules.append("No beef: use chicken, mutton, fish, daal, or chana instead.")
    if "vegetarian" in joined or "no meat" in joined:
        rules.append("Vegetarian: no chicken, mutton, beef, or fish. Use daal, chana, sabzi, dahi and anda.")

    return "\n".join(f"- {rule}" for rule in rules) or "- No extra foods to avoid."


def _repair_truncated_plan(text: str) -> dict | None:
    """Rebuild a plan from output that was cut off mid-JSON.

    Free-tier reasoning models regularly hit the token ceiling partway through
    day 4 or 5. Everything before the cut is still valid, so the complete day
    objects are recovered and the caller decides whether enough survived.
    """
    if '"plan"' not in text:
        return None

    def _grab(field: str) -> str:
        m = re.search(rf'"{field}"\s*:\s*"((?:[^"\\]|\\.)*)"', text)
        return m.group(1) if m else ""

    start = text.find("[", text.find('"plan"'))
    if start == -1:
        return None

    days, depth, obj_start = [], 0, None
    in_string, escaped = False, False

    for i in range(start, len(text)):
        ch = text[i]
        if escaped:
            escaped = False
            continue
        if ch == "\\":
            escaped = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            if depth == 0:
                obj_start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and obj_start is not None:
                try:
                    days.append(json.loads(text[obj_start:i + 1]))
                except json.JSONDecodeError:
                    pass
                obj_start = None
        elif ch == "]" and depth == 0:
            break

    if not days:
        return None

    logger.warning("Recovered %s day(s) from a truncated diet plan", len(days))
    return {
        "title": _grab("title") or "Your Diet Plan",
        "summary": _grab("summary"),
        "plan": days,
        "tips": [],
    }


def _parse_diet_response(text: str) -> dict:
    """Parse the model response into a structured diet plan."""
    cleaned = text.strip()

    # Strip markdown fences the model adds despite being told not to.
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:]).strip()

    parsed = None
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fall back to the outermost JSON object in the text.
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
            except json.JSONDecodeError:
                parsed = None

    if parsed is None:
        # The answer may simply have run out of tokens mid-object. Salvage the
        # days that did come through rather than throwing the whole plan away.
        parsed = _repair_truncated_plan(cleaned)

    if parsed is None:
        logger.warning("Failed to parse diet plan JSON")
        return {}

    if not isinstance(parsed, dict):
        return {}

    return {
        "title": parsed.get("title", "Your Diet Plan"),
        "summary": parsed.get("summary", ""),
        "plan": parsed.get("plan", []),
        "tips": parsed.get("tips", []),
    }


# Foods that are perfectly normal in a Pakistani kitchen but are wrong for a
# specific condition. The model does reach for these — a live run put
# "Halwa puri aur chai" in a diabetes plan — so the prompt rule is backed by a
# hard check here. Matched on word boundaries so "puri" does not fire inside
# an unrelated word.
DIABETES_BANNED = (
    "halwa puri", "puri", "jalebi", "gulab jamun", "mithai", "sheer khurma",
    "sweet lassi", "rooh afza", "kheer", "cake", "biscuit", "soft drink",
    "حلوہ پوری", "پوری", "جلیبی", "مٹھائی", "گلاب جامن", "کھیر", "میٹھی لسی",
)

HYPERTENSION_BANNED = (
    "achaar", "achar", "pickle", "papad", "chips", "instant noodles",
    "processed meat", "salted", "namkeen",
    "اچار", "پاپڑ", "چپس", "نمکین",
)


def _meal_texts(days: list) -> list[str]:
    """Every meal name + description in the plan, lowercased."""
    texts = []
    for day in days:
        if not isinstance(day, dict):
            continue
        meals = [day.get("breakfast"), day.get("lunch"), day.get("dinner")]
        meals += day.get("snacks") if isinstance(day.get("snacks"), list) else []
        for meal in meals:
            if isinstance(meal, dict):
                texts.append(f"{meal.get('name', '')} {meal.get('description', '')}".lower())
    return texts


def _unsafe_for_condition(days: list, condition: str, goals: str) -> list[str]:
    """Foods in the plan that are unsafe for the stated condition."""
    context = f"{condition} {goals}"
    banned: tuple[str, ...] = ()
    if _has_any(context, DIABETES_TERMS):
        banned += DIABETES_BANNED
    if _has_any(context, HYPERTENSION_TERMS):
        banned += HYPERTENSION_BANNED
    if not banned:
        return []

    found = []
    for text in _meal_texts(days):
        for item in banned:
            if re.search(rf"(?<!\w){re.escape(item)}(?!\w)", text):
                found.append(item)
    return found


def _counts_unfamiliar_foods(days: list) -> int:
    """How many meals mention food a Pakistani household would not recognise."""
    hits = 0
    for day in days:
        if not isinstance(day, dict):
            continue
        meals = [day.get("breakfast"), day.get("lunch"), day.get("dinner")]
        meals += day.get("snacks") if isinstance(day.get("snacks"), list) else []
        for meal in meals:
            if not isinstance(meal, dict):
                continue
            text = f"{meal.get('name', '')} {meal.get('description', '')}".lower()
            if any(food in text for food in UNFAMILIAR_FOODS):
                hits += 1
    return hits


URDU_DAY_NAMES = (
    "پہلا دن", "دوسرا دن", "تیسرا دن", "چوتھا دن",
    "پانچواں دن", "چھٹا دن", "ساتواں دن",
)


def _day_label(index: int, language: str) -> str:
    """Human day name for position `index` (1-based)."""
    if language == "ur" and 1 <= index <= len(URDU_DAY_NAMES):
        return URDU_DAY_NAMES[index - 1]
    return f"Day {index}"


def _top_up_days(days: list, language: str) -> list:
    """Extend a short plan to 7 days by cycling the days that came through.

    Repeating meals across a week is normal in a real household plan, and the
    user keeps the food that was chosen for them rather than being handed the
    generic week instead.
    """
    filled = [dict(d) for d in days if isinstance(d, dict)]
    if not filled:
        return days

    while len(filled) < 7:
        filled.append(dict(filled[len(filled) % len(days)]))

    for i, day in enumerate(filled, start=1):
        day["day"] = _day_label(i, language)
    return filled


def _normalize_diet_plan(
    plan: dict,
    condition: str = "general wellness",
    dietary_preferences: str = "balanced",
    restrictions: list[str] | None = None,
    goals: str = "general health",
    language: str = "en",
) -> dict:
    """Keep generated plans complete, local, and safe."""
    restrictions = restrictions or []
    days = plan.get("plan") if isinstance(plan.get("plan"), list) else []

    # A plan cut short at day 6 is still the user's own personalized plan.
    # Topping it up beats throwing it away for the generic one; only a badly
    # short answer falls all the way back.
    if 5 <= len(days) < 7:
        logger.info("Diet plan had %s days; topping up to 7", len(days))
        days = _top_up_days(days, language)

    if len(days) != 7:
        logger.warning("Diet plan had %s days; using validated fallback", len(days))
        return _fallback_diet_plan(condition, dietary_preferences, restrictions, goals, language)

    for idx, day in enumerate(days[:7], start=1):
        if not isinstance(day, dict):
            return _fallback_diet_plan(condition, dietary_preferences, restrictions, goals, language)
        day["day"] = day.get("day") or f"Day {idx}"
        for meal_name in ("breakfast", "lunch", "dinner"):
            meal = day.get(meal_name)
            if not isinstance(meal, dict) or not meal.get("name"):
                logger.warning("Diet plan missing %s on day %s; using fallback", meal_name, idx)
                return _fallback_diet_plan(condition, dietary_preferences, restrictions, goals, language)
        if not isinstance(day.get("snacks"), list):
            day["snacks"] = []

    # The client's actual complaint: plans full of food nobody here eats.
    # A stray mention is tolerable; a plan built on them is not.
    unfamiliar = _counts_unfamiliar_foods(days)
    if unfamiliar >= 4:
        logger.warning(
            "Diet plan used %s unfamiliar foods; falling back to the local plan", unfamiliar
        )
        return _fallback_diet_plan(condition, dietary_preferences, restrictions, goals, language)

    # Safety, not taste: one mithai or halwa puri in a diabetic plan is enough
    # to reject the whole thing.
    unsafe = _unsafe_for_condition(days, condition, goals)
    if unsafe:
        logger.warning(
            "Diet plan contained food unsafe for '%s' (%s); using the validated fallback",
            condition, ", ".join(sorted(set(unsafe))[:5]),
        )
        return _fallback_diet_plan(condition, dietary_preferences, restrictions, goals, language)

    tips = [str(t) for t in plan.get("tips", []) if str(t).strip()]
    context = f"{condition} {goals}"
    urdu = language == "ur"

    if _has_any(context, HYPERTENSION_TERMS):
        tips = _merge_tips(tips, _BP_TIPS_UR if urdu else _BP_TIPS_EN)
    if _has_any(context, DIABETES_TERMS):
        tips = _merge_tips(tips, _SUGAR_TIPS_UR if urdu else _SUGAR_TIPS_EN)
    if _has_any(context, KIDNEY_TERMS):
        tips = _merge_tips(tips, _KIDNEY_TIPS_UR if urdu else _KIDNEY_TIPS_EN)
    if condition and condition.lower() != "general wellness":
        tips = _merge_tips(tips, [_DOCTOR_TIP_UR if urdu else _DOCTOR_TIP_EN])

    default_title = "آپ کا کھانے کا پلان" if urdu else "Your 7-Day Meal Plan"
    default_summary = (
        "سات دن کا آسان پلان، روزمرہ کے پاکستانی گھریلو کھانوں پر مبنی۔"
        if urdu
        else "A simple 7-day plan built from everyday Pakistani home food."
    )

    return {
        "title": plan.get("title") or default_title,
        "summary": plan.get("summary") or default_summary,
        "plan": days[:7],
        "tips": tips[:6],
    }


_DOCTOR_TIP_EN = (
    "Show this plan to your doctor or a dietitian before following it, "
    "especially if you take any medicine."
)
_DOCTOR_TIP_UR = (
    "اس پلان پر عمل کرنے سے پہلے اسے اپنے ڈاکٹر یا ماہرِ غذا کو ضرور دکھائیں، "
    "خاص طور پر اگر آپ کوئی دوا لے رہے ہیں۔"
)

_BP_TIPS_EN = [
    "Use less namak (salt) while cooking, and do not add extra salt at the table.",
    "Avoid achaar, papad, chips, packet noodles and other salty snacks.",
    "If you have any kidney problem or take blood pressure medicine, ask your doctor before eating a lot of fruit.",
]
_BP_TIPS_UR = [
    "کھانا پکاتے وقت نمک کم استعمال کریں، اور اوپر سے مزید نمک نہ ڈالیں۔",
    "اچار، پاپڑ، چپس، پیکٹ والے نوڈلز اور نمکین اسنیکس سے پرہیز کریں۔",
    "اگر گردے کی تکلیف ہے یا بلڈ پریشر کی دوا لیتے ہیں تو زیادہ پھل کھانے سے پہلے ڈاکٹر سے پوچھیں۔",
]

_SUGAR_TIPS_EN = [
    "Avoid soft drinks, packet juice and mithai. Take chai with little or no sugar.",
    "Eat roti or rice together with daal, sabzi, anda or dahi — not on their own.",
]
_SUGAR_TIPS_UR = [
    "کولڈ ڈرنک، پیکٹ والا جوس اور مٹھائی نہ لیں۔ چائے میں چینی بہت کم یا بالکل نہ ڈالیں۔",
    "روٹی یا چاول ہمیشہ دال، سبزی، انڈے یا دہی کے ساتھ کھائیں، اکیلے نہیں۔",
]

_KIDNEY_TIPS_EN = [
    "A kidney patient's diet must be set by their own doctor — salt, potassium, protein and water all change.",
    "Do not increase fruit, daal or milk on your own if you have kidney disease.",
]
_KIDNEY_TIPS_UR = [
    "گردے کے مریض کی خوراک اُس کا اپنا ڈاکٹر طے کرے — نمک، پوٹاشیم، پروٹین اور پانی سب بدلتے ہیں۔",
    "گردے کی بیماری میں پھل، دال یا دودھ اپنی مرضی سے نہ بڑھائیں۔",
]


def _merge_tips(existing: list[str], required: list[str]) -> list[str]:
    merged = list(existing)
    comparable = " ".join(_tip_key(tip) for tip in existing)
    for tip in required:
        if _tip_key(tip) not in comparable:
            merged.append(tip)
    return merged


def _tip_key(tip: str) -> str:
    words = re.sub(r"[^a-z0-9؀-ۿ]+", " ", tip.lower()).strip().split()
    return " ".join(words[:5])


# ── Offline fallback: a plain Pakistani week ──────────────────────────────
#
# Used when OpenRouter is unreachable or returns something unusable. It is the
# plan the client will actually see on a bad day, so it is written to the same
# standard as the prompt above: real home food, real portions, plain words.

def _meal(name: str, description: str, calories: int, nutrients: str) -> dict:
    return {
        "name": name,
        "description": description,
        "calories": calories,
        "nutrients": nutrients,
    }


def _base_week_en(
    vegetarian: bool, dairy_free: bool, no_egg: bool, gluten_free: bool = False
) -> list[dict]:
    # Makai (corn) roti is the everyday gluten-free bread here — far more
    # familiar to this audience than any imported substitute.
    roti = "Makai ki Roti" if gluten_free else "Roti"
    roti_low = "makai ki roti" if gluten_free else "roti"
    paratha = "Makai ki Roti" if gluten_free else "Paratha"
    paratha_low = "makai ki roti" if gluten_free else "paratha"
    bread = "Chawal" if gluten_free else "Double Roti"
    bread_desc = "a small bowl of rice" if gluten_free else "two slices of bread"
    dalia_name = "Chawal ka Dalia" if gluten_free else "Suji Dalia"
    dalia_grain = "rice porridge" if gluten_free else "wheat porridge"

    egg_breakfast = (
        _meal(f"Aloo {paratha} aur Chai", f"One {paratha_low} with a cup of tea.", 420, "Energy")
        if no_egg
        else _meal(f"Anda aur {roti}", f"Two eggs with one {roti_low} and a cup of tea.", 400, "Protein and energy")
    )
    dahi_item = (
        _meal("Kela (banana)", "One banana.", 100, "Energy and potassium")
        if dairy_free
        else _meal("Dahi (yogurt)", "One small bowl of plain yogurt.", 100, "Protein and good for the stomach")
    )
    meat_lunch = (
        _meal("Chana Chaat", f"Boiled chickpeas with onion, tomato and lemon, with one {roti_low}.", 480, "Protein and fibre")
        if vegetarian
        else _meal(f"Chicken Salan aur {roti}", f"Chicken curry with two {roti_low} and a slice of onion and cucumber.", 550, "Protein and energy")
    )
    meat_dinner = (
        _meal("Daal aur Chawal", "Lentils with one bowl of rice.", 480, "Protein and energy")
        if vegetarian
        else _meal(f"Chicken Yakhni aur {roti}", f"Light chicken soup with one {roti_low}.", 420, "Protein, easy to digest")
    )
    # Dalia is normally cooked in milk and biryani is normally served with
    # raita — both have to drop the dairy when the user cannot have it.
    dalia_liquid = "water" if dairy_free else "water or milk"
    biryani_side = "salad" if dairy_free else "raita or salad"

    return [
        {
            "day": "Day 1",
            "breakfast": egg_breakfast,
            "lunch": _meal("Daal Chawal", "Lentils with one bowl of rice and a plain salad.", 500, "Protein and energy"),
            "dinner": _meal(f"Mix Sabzi aur {roti}", f"Mixed vegetable curry with two {roti_low}.", 450, "Vitamins and fibre"),
            "snacks": [dahi_item],
        },
        {
            "day": "Day 2",
            "breakfast": _meal(
                f"{bread} aur Anda" if not no_egg else f"{bread} aur Jam",
                f"An omelette with {bread_desc} and tea." if not no_egg else f"Jam with {bread_desc} and tea.",
                380,
                "Protein and energy" if not no_egg else "Energy",
            ),
            "lunch": meat_lunch,
            "dinner": _meal("Khichdi", "Soft rice and lentils cooked together, with a little plain salad.", 430, "Light and easy to digest"),
            "snacks": [_meal("Seb (apple)", "One apple.", 90, "Fibre and vitamins")],
        },
        {
            "day": "Day 3",
            "breakfast": _meal(dalia_name, f"A bowl of {dalia_grain} cooked in {dalia_liquid}, with a banana.", 350, "Energy and fibre"),
            "lunch": _meal(f"Aloo Gosht aur {roti}" if not vegetarian else f"Aloo Palak aur {roti}",
                           f"Potato curry with meat and two {roti_low}." if not vegetarian else f"Potato and spinach curry with two {roti_low}.",
                           520, "Protein and iron"),
            "dinner": _meal(f"Bhindi aur {roti}", f"Okra curry with two {roti_low}.", 420, "Fibre and vitamins"),
            "snacks": [_meal("Malta ya Kela", "One orange or one banana.", 90, "Vitamin C")],
        },
        {
            "day": "Day 4",
            "breakfast": _meal(
                f"Anda Bhurji aur {roti}" if not no_egg else "Chana Chaat Nashta",
                f"Scrambled eggs with one {roti_low} and tea." if not no_egg else "A small bowl of boiled chickpeas with lemon and tea.",
                400,
                "Protein",
            ),
            "lunch": _meal(f"Chana Daal aur {roti}", f"Split chickpea lentils with two {roti_low} and salad.", 490, "Protein and fibre"),
            "dinner": _meal("Vegetable Pulao", "Rice cooked with peas, carrot and potato.", 470, "Energy and vitamins"),
            "snacks": [dahi_item],
        },
        {
            "day": "Day 5",
            "breakfast": _meal(f"{paratha} aur Dahi" if not dairy_free else f"{paratha} aur Chai",
                               f"One {paratha_low} with a small bowl of yogurt." if not dairy_free else f"One {paratha_low} with a cup of tea.",
                               430, "Energy"),
            "lunch": meat_dinner if vegetarian else _meal(f"Machli aur {roti}", f"Fried or baked fish with two {roti_low} and salad.", 520, "Protein and good fats"),
            "dinner": _meal(f"Palak aur {roti}", f"Spinach curry with two {roti_low}.", 400, "Iron and fibre"),
            "snacks": [_meal("Gajar ya Kheera", "A few carrot or cucumber sticks.", 60, "Fibre and water")],
        },
        {
            "day": "Day 6",
            "breakfast": _meal(f"Doodh aur {bread}" if not dairy_free else f"Chai aur {bread}",
                               f"A glass of milk with {bread_desc}." if not dairy_free else f"A cup of tea with {bread_desc}.",
                               350, "Calcium and energy" if not dairy_free else "Energy"),
            "lunch": _meal("Rajma ya Lobia Chawal", "Kidney beans or black-eyed peas with one bowl of rice.", 520, "Protein and fibre"),
            "dinner": _meal("Karhi Chawal" if not dairy_free else f"Daal aur {roti}",
                            "Yogurt curry with one bowl of rice." if not dairy_free else f"Lentils with two {roti_low}.",
                            460, "Protein and energy"),
            "snacks": [_meal("Kela (banana)", "One banana.", 100, "Energy")],
        },
        {
            "day": "Day 7",
            "breakfast": egg_breakfast,
            "lunch": _meal("Biryani (small plate)" if not vegetarian else "Sabzi Biryani (small plate)",
                           f"One small plate of biryani with {biryani_side}.", 600, "Energy and protein"),
            "dinner": _meal(f"Daal aur {roti}", f"Lentils with two {roti_low} and a plain salad.", 420, "Protein and fibre"),
            "snacks": [_meal("Mausami Phal", "Any seasonal fruit.", 90, "Vitamins")],
        },
    ]


def _base_week_ur(
    vegetarian: bool, dairy_free: bool, no_egg: bool, gluten_free: bool = False
) -> list[dict]:
    roti = "مکئی کی روٹی" if gluten_free else "روٹی"
    paratha = "مکئی کی روٹی" if gluten_free else "پراٹھا"
    bread = "چاول" if gluten_free else "ڈبل روٹی"
    bread_desc = "ایک چھوٹی پیالی چاول" if gluten_free else "ڈبل روٹی کے دو سلائس"
    dalia_name = "چاول کا دلیہ" if gluten_free else "سوجی کا دلیہ"

    egg_breakfast = (
        _meal(f"آلو {paratha} اور چائے", f"ایک {paratha} اور ایک کپ چائے۔", 420, "توانائی")
        if no_egg
        else _meal(f"انڈا اور {roti}", f"دو انڈے، ایک {roti} اور ایک کپ چائے۔", 400, "پروٹین اور توانائی")
    )
    dahi_item = (
        _meal("کیلا", "ایک کیلا۔", 100, "توانائی")
        if dairy_free
        else _meal("دہی", "ایک چھوٹی پیالی سادہ دہی۔", 100, "پروٹین، معدے کے لیے اچھا")
    )
    meat_lunch = (
        _meal("چنا چاٹ", f"ابلے ہوئے چنے پیاز، ٹماٹر اور لیموں کے ساتھ، ایک {roti}۔", 480, "پروٹین اور فائبر")
        if vegetarian
        else _meal(f"چکن سالن اور {roti}", f"چکن سالن، دو {roti} اور تھوڑا سا سلاد۔", 550, "پروٹین اور توانائی")
    )
    meat_dinner = (
        _meal("دال اور چاول", "دال کے ساتھ ایک پیالی چاول۔", 480, "پروٹین اور توانائی")
        if vegetarian
        else _meal(f"چکن یخنی اور {roti}", f"ہلکی چکن یخنی اور ایک {roti}۔", 420, "پروٹین، آسانی سے ہضم")
    )
    dalia_liquid = "پانی" if dairy_free else "پانی یا دودھ"
    biryani_side = "سلاد" if dairy_free else "رائتے یا سلاد"

    return [
        {
            "day": "پہلا دن",
            "breakfast": egg_breakfast,
            "lunch": _meal("دال چاول", "دال کے ساتھ ایک پیالی چاول اور سادہ سلاد۔", 500, "پروٹین اور توانائی"),
            "dinner": _meal(f"مکس سبزی اور {roti}", f"ملی جلی سبزی کے ساتھ دو {roti}۔", 450, "وٹامن اور فائبر"),
            "snacks": [dahi_item],
        },
        {
            "day": "دوسرا دن",
            "breakfast": _meal(
                f"{bread} اور انڈا" if not no_egg else f"{bread} اور جام",
                f"{bread_desc}، آملیٹ اور چائے۔" if not no_egg else f"{bread_desc} جام کے ساتھ اور چائے۔",
                380,
                "پروٹین اور توانائی" if not no_egg else "توانائی",
            ),
            "lunch": meat_lunch,
            "dinner": _meal("کھچڑی", "نرم چاول اور دال ملا کر پکائی ہوئی، ساتھ سادہ سلاد۔", 430, "ہلکی اور جلد ہضم"),
            "snacks": [_meal("سیب", "ایک سیب۔", 90, "فائبر اور وٹامن")],
        },
        {
            "day": "تیسرا دن",
            "breakfast": _meal(dalia_name, f"ایک پیالی دلیہ {dalia_liquid} میں پکا کر، ساتھ ایک کیلا۔", 350, "توانائی اور فائبر"),
            "lunch": _meal(f"آلو گوشت اور {roti}" if not vegetarian else f"آلو پالک اور {roti}",
                           f"آلو گوشت کا سالن اور دو {roti}۔" if not vegetarian else f"آلو پالک کا سالن اور دو {roti}۔",
                           520, "پروٹین اور آئرن"),
            "dinner": _meal(f"بھنڈی اور {roti}", f"بھنڈی کی سبزی کے ساتھ دو {roti}۔", 420, "فائبر اور وٹامن"),
            "snacks": [_meal("مالٹا یا کیلا", "ایک مالٹا یا ایک کیلا۔", 90, "وٹامن سی")],
        },
        {
            "day": "چوتھا دن",
            "breakfast": _meal(
                f"انڈا بھجیا اور {roti}" if not no_egg else "چنے کا ناشتہ",
                f"بھنا ہوا انڈا، ایک {roti} اور چائے۔" if not no_egg else "ایک چھوٹی پیالی ابلے چنے لیموں کے ساتھ اور چائے۔",
                400,
                "پروٹین",
            ),
            "lunch": _meal(f"چنے کی دال اور {roti}", f"چنے کی دال، دو {roti} اور سلاد۔", 490, "پروٹین اور فائبر"),
            "dinner": _meal("سبزی پلاؤ", "مٹر، گاجر اور آلو کے ساتھ پکے ہوئے چاول۔", 470, "توانائی اور وٹامن"),
            "snacks": [dahi_item],
        },
        {
            "day": "پانچواں دن",
            "breakfast": _meal(f"{paratha} اور دہی" if not dairy_free else f"{paratha} اور چائے",
                               f"ایک {paratha} اور ایک چھوٹی پیالی دہی۔" if not dairy_free else f"ایک {paratha} اور ایک کپ چائے۔",
                               430, "توانائی"),
            "lunch": meat_dinner if vegetarian else _meal(f"مچھلی اور {roti}", f"تلی یا پکی ہوئی مچھلی، دو {roti} اور سلاد۔", 520, "پروٹین اور اچھی چکنائی"),
            "dinner": _meal(f"پالک اور {roti}", f"پالک کی سبزی کے ساتھ دو {roti}۔", 400, "آئرن اور فائبر"),
            "snacks": [_meal("گاجر یا کھیرا", "چند گاجر یا کھیرے کے ٹکڑے۔", 60, "فائبر اور پانی")],
        },
        {
            "day": "چھٹا دن",
            "breakfast": _meal(f"دودھ اور {bread}" if not dairy_free else f"چائے اور {bread}",
                               f"ایک گلاس دودھ اور {bread_desc}۔" if not dairy_free else f"ایک کپ چائے اور {bread_desc}۔",
                               350, "کیلشیم اور توانائی" if not dairy_free else "توانائی"),
            "lunch": _meal("راجما یا لوبیا چاول", "راجما یا لوبیا کے ساتھ ایک پیالی چاول۔", 520, "پروٹین اور فائبر"),
            "dinner": _meal("کڑھی چاول" if not dairy_free else f"دال اور {roti}",
                            "دہی کی کڑھی کے ساتھ ایک پیالی چاول۔" if not dairy_free else f"دال کے ساتھ دو {roti}۔",
                            460, "پروٹین اور توانائی"),
            "snacks": [_meal("کیلا", "ایک کیلا۔", 100, "توانائی")],
        },
        {
            "day": "ساتواں دن",
            "breakfast": egg_breakfast,
            "lunch": _meal("بریانی (چھوٹی پلیٹ)" if not vegetarian else "سبزی بریانی (چھوٹی پلیٹ)",
                           f"ایک چھوٹی پلیٹ بریانی {biryani_side} کے ساتھ۔", 600, "توانائی اور پروٹین"),
            "dinner": _meal(f"دال اور {roti}", f"دال، دو {roti} اور سادہ سلاد۔", 420, "پروٹین اور فائبر"),
            "snacks": [_meal("موسمی پھل", "کوئی بھی موسمی پھل۔", 90, "وٹامن")],
        },
    ]


def _fallback_diet_plan(
    condition: str = "general wellness",
    dietary_preferences: str = "balanced",
    restrictions: list[str] | None = None,
    goals: str = "general health",
    language: str = "en",
) -> dict:
    """A validated everyday Pakistani plan, used when the model is unavailable."""
    restrictions = restrictions or []
    context = f"{condition} {goals}".lower()
    restrictions_text = " ".join(restrictions).lower()
    prefs = dietary_preferences.lower()
    urdu = language == "ur"

    dairy_free = any(t in restrictions_text for t in ("dairy", "lactose", "milk", "دودھ"))
    no_egg = any(t in restrictions_text for t in ("egg", "anda", "انڈا"))
    gluten_free = any(t in restrictions_text for t in ("gluten", "wheat", "roti", "گندم"))
    vegetarian = "vegetarian" in prefs or "vegan" in prefs or "vegetarian" in restrictions_text

    days = (_base_week_ur if urdu else _base_week_en)(
        vegetarian, dairy_free, no_egg, gluten_free
    )

    tips = (
        [
            "دن میں 6 سے 8 گلاس پانی پیئیں، اگر ڈاکٹر نے پانی کم کرنے کو نہ کہا ہو۔",
            "کھانا روز ایک ہی وقت پر کھائیں اور ناشتہ نہ چھوڑیں۔",
            "ہر کھانے کے ساتھ تھوڑی سبزی یا سلاد ضرور رکھیں۔",
            "تلی ہوئی چیزیں اور بازار کا کھانا ہفتے میں ایک بار سے زیادہ نہ کھائیں۔",
        ]
        if urdu
        else [
            "Drink 6 to 8 glasses of water a day, unless your doctor has told you to drink less.",
            "Eat at the same times every day and do not skip breakfast.",
            "Keep some sabzi or salad with every meal.",
            "Keep fried food and bazaar food to no more than once a week.",
        ]
    )

    if _has_any(context, HYPERTENSION_TERMS):
        tips = _merge_tips(tips, _BP_TIPS_UR if urdu else _BP_TIPS_EN)
    if _has_any(context, DIABETES_TERMS):
        tips = _merge_tips(tips, _SUGAR_TIPS_UR if urdu else _SUGAR_TIPS_EN)
    if _has_any(context, KIDNEY_TERMS):
        tips = _merge_tips(tips, _KIDNEY_TIPS_UR if urdu else _KIDNEY_TIPS_EN)
    if condition and condition.lower() != "general wellness":
        tips = _merge_tips(tips, [_DOCTOR_TIP_UR if urdu else _DOCTOR_TIP_EN])

    # The summary names the foods the plan is built from, so it has to drop the
    # ones this person cannot eat — otherwise it advertises anda and dahi to
    # someone who told us they avoid both.
    if urdu:
        title = "سات دن کا آسان پاکستانی کھانے کا پلان"
        foods = []
        if not no_egg:
            foods.append("انڈا")
        if not gluten_free:
            foods.append("روٹی")
        foods += ["دال", "چاول", "سبزی"]
        if not dairy_free:
            foods.append("دہی")
        foods.append("پھل")
        summary = (
            "روزمرہ کے عام گھریلو کھانوں پر مبنی سات دن کا سادہ پلان — "
            + "، ".join(foods)
            + "۔ سب کچھ عام بازار سے مل جاتا ہے۔"
        )
    else:
        title = "Simple 7-Day Pakistani Meal Plan"
        foods = []
        if not no_egg:
            foods.append("anda")
        foods.append("makai ki roti" if gluten_free else "roti")
        foods += ["daal", "chawal", "sabzi"]
        if not dairy_free:
            foods.append("dahi")
        foods.append("fruit")
        summary = (
            "A simple 7-day plan made from everyday home food — "
            + ", ".join(foods[:-1])
            + f" and {foods[-1]}. Everything is available in any local market."
        )

    return {
        "title": title,
        "summary": summary,
        "plan": days,
        "tips": tips[:6],
    }
