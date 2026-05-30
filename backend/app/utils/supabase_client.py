"""Supabase client for database operations and file storage."""

from __future__ import annotations
from supabase import create_client, Client
from app.config import get_settings
from functools import lru_cache


@lru_cache()
def get_supabase_client() -> Client:
    """Get a cached Supabase client instance."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)


def get_anon_client() -> Client:
    """Get a Supabase client with anon key (for auth operations)."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


# ── Database Helpers ──────────────────────────────────────────────────

def insert_profile(user_id: str, full_name: str, role: str = "Medical Student") -> dict:
    """Create a user profile after Supabase Auth sign-up."""
    client = get_supabase_client()
    result = client.table("profiles").insert({
        "id": user_id,
        "full_name": full_name,
        "role": role,
    }).execute()
    return result.data[0] if result.data else {}


def get_profile(user_id: str) -> dict | None:
    """Get a user profile by ID."""
    client = get_supabase_client()
    result = client.table("profiles").select("*").eq("id", user_id).single().execute()
    return result.data


def update_profile(user_id: str, updates: dict) -> dict:
    """Update a user profile."""
    client = get_supabase_client()
    result = client.table("profiles").update(updates).eq("id", user_id).execute()
    return result.data[0] if result.data else {}


def insert_scan(scan_data: dict) -> dict:
    """Insert a new scan record."""
    client = get_supabase_client()
    result = client.table("scans").insert(scan_data).execute()
    return result.data[0] if result.data else {}


def get_user_scans(user_id: str, scan_type: str | None = None,
                   limit: int = 50, offset: int = 0) -> tuple[list[dict], int]:
    """Get scans for a user with optional filtering."""
    client = get_supabase_client()
    query = client.table("scans").select("*", count="exact").eq("user_id", user_id)
    if scan_type:
        query = query.eq("scan_type", scan_type)
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()
    return result.data or [], result.count or 0


def get_scan_by_id(scan_id: str, user_id: str) -> dict | None:
    """Get a single scan by ID (scoped to user)."""
    client = get_supabase_client()
    result = (
        client.table("scans")
        .select("*")
        .eq("id", scan_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return result.data


def delete_scan(scan_id: str, user_id: str) -> bool:
    """Delete a scan (scoped to user)."""
    client = get_supabase_client()
    result = (
        client.table("scans")
        .delete()
        .eq("id", scan_id)
        .eq("user_id", user_id)
        .execute()
    )
    return len(result.data) > 0 if result.data else False


def get_user_stats(user_id: str) -> dict:
    """Get aggregated statistics for a user's scans."""
    client = get_supabase_client()
    scans_result = client.table("scans").select("*").eq("user_id", user_id).execute()
    scans = scans_result.data or []

    total = len(scans)
    critical = sum(1 for s in scans if s.get("urgency") in ("critical", "high"))

    # Finding distribution
    dist: dict[str, int] = {}
    total_confidence = 0.0
    finding_count = 0
    for scan in scans:
        findings = scan.get("findings", [])
        for f in findings:
            name = f.get("name", "Other")
            dist[name] = dist.get(name, 0) + 1
            total_confidence += f.get("confidence", 0)
            finding_count += 1

    avg_conf = (total_confidence / finding_count) if finding_count > 0 else 0

    return {
        "total_scans": total,
        "critical_findings": critical,
        "avg_confidence": round(avg_conf, 1),
        "finding_distribution": dist,
    }


# ── Storage Helpers ──────────────────────────────────────────────────

def _ensure_bucket(client, bucket: str = "xray-images") -> None:
    """Create the storage bucket if it doesn't exist yet."""
    try:
        buckets = [b.name for b in client.storage.list_buckets()]
        if bucket not in buckets:
            client.storage.create_bucket(bucket, options={"public": True})
    except Exception:
        pass  # best-effort — upload will surface the real error if it fails


def upload_image(user_id: str, scan_id: str, file_bytes: bytes,
                 content_type: str = "image/png") -> str:
    """Upload an X-ray image to Supabase Storage and return the public URL."""
    client = get_supabase_client()
    _ensure_bucket(client)
    path = f"{user_id}/{scan_id}.png"
    client.storage.from_("xray-images").upload(
        path, file_bytes, {"content-type": content_type}
    )
    url_result = client.storage.from_("xray-images").get_public_url(path)
    return url_result


# ── Chat Helpers ──────────────────────────────────────────────────────

def create_chat_session(user_id: str, title: str = "New Chat") -> dict:
    """Create a new chat session."""
    client = get_supabase_client()
    result = client.table("chat_sessions").insert({
        "user_id": user_id,
        "title": title,
    }).execute()
    return result.data[0] if result.data else {}


def get_chat_sessions(user_id: str) -> list[dict]:
    """Get all chat sessions for a user."""
    client = get_supabase_client()
    result = (
        client.table("chat_sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def user_owns_chat_session(session_id: str, user_id: str) -> bool:
    """Return whether a chat session belongs to a user."""
    client = get_supabase_client()
    result = (
        client.table("chat_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return bool(result.data)


def get_chat_messages(session_id: str, user_id: str) -> list[dict]:
    """Get all messages for a chat session scoped to the authenticated user."""
    if not user_owns_chat_session(session_id, user_id):
        return []
    client = get_supabase_client()
    result = (
        client.table("chat_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []


def insert_chat_message(session_id: str, role: str, content: str) -> dict:
    """Insert a message into a chat session."""
    client = get_supabase_client()
    result = client.table("chat_messages").insert({
        "session_id": session_id,
        "role": role,
        "content": content,
    }).execute()
    return result.data[0] if result.data else {}
