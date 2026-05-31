"""Diet plan generator endpoint — FYP requirement."""

from __future__ import annotations
from fastapi import APIRouter, Depends, Request
from app.main import limiter
from app.models.schemas import DietRequest, DietPlanResponse, DayPlan, MealItem
from app.services.auth_service import get_current_user_id
from app.services.diet_service import generate_diet_plan

router = APIRouter(prefix="/diet", tags=["diet"])


@router.post("", response_model=DietPlanResponse)
@limiter.limit("10/minute")
async def create_diet_plan(
    request: Request,
    req: DietRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Generate a personalized diet plan based on medical conditions and preferences."""
    result = generate_diet_plan(
        condition=req.condition,
        dietary_preferences=req.dietary_preferences,
        restrictions=req.restrictions,
        goals=req.goals,
        language=req.language,
    )

    # Parse plan items
    plan = []
    for day_data in result.get("plan", []):
        def parse_meal(m: dict) -> MealItem:
            return MealItem(
                name=m.get("name", "Meal"),
                description=m.get("description", ""),
                calories=m.get("calories"),
                nutrients=m.get("nutrients"),
            )

        snacks = [parse_meal(s) for s in day_data.get("snacks", [])]

        plan.append(DayPlan(
            day=day_data.get("day", "Day"),
            breakfast=parse_meal(day_data.get("breakfast", {})),
            lunch=parse_meal(day_data.get("lunch", {})),
            dinner=parse_meal(day_data.get("dinner", {})),
            snacks=snacks,
        ))

    return DietPlanResponse(
        title=result.get("title", "Your Diet Plan"),
        summary=result.get("summary", ""),
        plan=plan,
        tips=result.get("tips", []),
    )
