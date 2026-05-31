"""Authentication endpoints — register, login, forgot password, get current user."""

import logging
from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile
from pydantic import BaseModel
from app.models.schemas import (
    AuthResponse,
    LoginRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    SettingsUpdateRequest,
    UserProfile,
)
from app.services.auth_service import hash_password, verify_password, create_access_token, get_current_user_id, get_current_user
from app.utils.supabase_client import get_anon_client, get_profile, insert_profile, update_profile, upload_avatar

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Send a password reset email via Supabase Auth."""
    client = get_anon_client()
    try:
        client.auth.reset_password_email(req.email)
    except Exception as exc:
        # Log the error but don't reveal whether the email exists
        logger.warning(f"Password reset request failed: {exc}")

    # Always return success to prevent email enumeration
    return {"message": "If an account with that email exists, a reset link has been sent."}


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

        # Create profile record manually in the backend
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
                settings=profile.get("settings", {}) if profile else {},
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
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user's profile."""
    profile = get_profile(current_user["id"])
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )

    return UserProfile(
        id=profile["id"],
        email=current_user["email"],  # email comes from JWT, not profiles table
        full_name=profile.get("full_name", "User"),
        role=profile.get("role", "Medical Student"),
        avatar_url=profile.get("avatar_url"),
        settings=profile.get("settings", {}),
        created_at=profile.get("created_at"),
    )


@router.post("/avatar", response_model=UserProfile)
async def update_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a new avatar and update the user profile."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
    
    try:
        url = upload_avatar(current_user["id"], file_bytes, file.content_type or "image/png")
        profile = update_profile(current_user["id"], {"avatar_url": url})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {str(exc)}")

    return UserProfile(
        id=profile["id"],
        email=current_user["email"],
        full_name=profile.get("full_name", "User"),
        role=profile.get("role", "Medical Student"),
        avatar_url=profile.get("avatar_url"),
        settings=profile.get("settings", {}),
        created_at=profile.get("created_at"),
    )


@router.patch("/profile", response_model=UserProfile)
async def update_me(req: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update current authenticated user's profile."""
    updates = req.model_dump(exclude_unset=True, exclude_none=True)
    profile = update_profile(current_user["id"], updates) if updates else get_profile(current_user["id"])
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return UserProfile(
        id=profile["id"],
        email=current_user["email"],
        full_name=profile.get("full_name", "User"),
        role=profile.get("role", "Medical Student"),
        avatar_url=profile.get("avatar_url"),
        settings=profile.get("settings", {}),
        created_at=profile.get("created_at"),
    )


@router.patch("/settings", response_model=UserProfile)
async def update_settings(req: SettingsUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Persist current user's UI/analysis settings."""
    profile = update_profile(current_user["id"], {"settings": req.settings})
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return UserProfile(
        id=profile["id"],
        email=current_user["email"],
        full_name=profile.get("full_name", "User"),
        role=profile.get("role", "Medical Student"),
        avatar_url=profile.get("avatar_url"),
        settings=profile.get("settings", {}),
        created_at=profile.get("created_at"),
    )
