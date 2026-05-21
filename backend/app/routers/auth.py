"""Authentication endpoints — register, login, get current user."""

from __future__ import annotations
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import RegisterRequest, LoginRequest, AuthResponse, UserProfile
from app.services.auth_service import hash_password, verify_password, create_access_token, get_current_user_id
from app.utils.supabase_client import get_anon_client, insert_profile, get_profile

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    """Register a new user account."""
    client = get_anon_client()

    try:
        # Create user in Supabase Auth
        auth_response = client.auth.sign_up({
            "email": req.email,
            "password": req.password,
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. Email may already be in use.",
            )

        user_id = auth_response.user.id

        # Create profile record
        insert_profile(user_id, req.full_name, req.role)

        # Generate JWT
        token = create_access_token(user_id, req.email)

        return AuthResponse(
            access_token=token,
            user=UserProfile(
                id=user_id,
                email=req.email,
                full_name=req.full_name,
                role=req.role,
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Sign in with email and password."""
    client = get_anon_client()

    try:
        auth_response = client.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        user_id = auth_response.user.id

        # Fetch profile
        profile = get_profile(user_id)

        # Generate JWT
        token = create_access_token(user_id, req.email)

        return AuthResponse(
            access_token=token,
            user=UserProfile(
                id=user_id,
                email=req.email,
                full_name=profile.get("full_name", "User") if profile else "User",
                role=profile.get("role", "Medical Student") if profile else "Medical Student",
                avatar_url=profile.get("avatar_url") if profile else None,
                created_at=profile.get("created_at") if profile else None,
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}",
        )


@router.get("/me", response_model=UserProfile)
async def get_me(user_id: str = Depends(get_current_user_id)):
    """Get current authenticated user's profile."""
    profile = get_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )

    return UserProfile(
        id=profile["id"],
        email=profile.get("email", ""),
        full_name=profile.get("full_name", "User"),
        role=profile.get("role", "Medical Student"),
        avatar_url=profile.get("avatar_url"),
        created_at=profile.get("created_at"),
    )
