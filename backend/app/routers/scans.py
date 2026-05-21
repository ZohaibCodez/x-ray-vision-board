"""Scan history CRUD endpoints."""

from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.schemas import ScanResult, ScanListItem, ScanListResponse, Finding, AgentSynthesis, BoundingBox
from app.services.auth_service import get_current_user_id
from app.utils.supabase_client import get_user_scans, get_scan_by_id, delete_scan

router = APIRouter(prefix="/scans", tags=["scans"])


@router.get("", response_model=ScanListResponse)
async def list_scans(
    scan_type: str | None = Query(default=None),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    user_id: str = Depends(get_current_user_id),
):
    """List all scans for the authenticated user."""
    scans, total = get_user_scans(user_id, scan_type=scan_type, limit=limit, offset=offset)

    items = []
    for s in scans:
        findings = s.get("findings", [])
        items.append(ScanListItem(
            id=s["id"],
            scan_type=s["scan_type"],
            session_label=s.get("session_label"),
            image_url=s.get("image_url", ""),
            urgency=s.get("urgency", "clear"),
            findings_count=len(findings) if isinstance(findings, list) else 0,
            created_at=s.get("created_at", ""),
        ))

    return ScanListResponse(scans=items, total=total)


@router.get("/{scan_id}", response_model=ScanResult)
async def get_scan(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get a single scan with full results."""
    scan = get_scan_by_id(scan_id, user_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found.",
        )

    # Parse findings
    raw_findings = scan.get("findings", [])
    findings = []
    for f in raw_findings:
        bbox = None
        if f.get("bbox"):
            bbox = BoundingBox(**f["bbox"])
        findings.append(Finding(
            name=f.get("name", "Unknown"),
            confidence=f.get("confidence", 0),
            severity=f.get("severity", "low"),
            model=f.get("model", "Unknown"),
            region=f.get("region"),
            icd_code=f.get("icd_code"),
            bbox=bbox,
            color=f.get("color", "info"),
        ))

    # Parse agent synthesis
    agent_actions = scan.get("agent_actions", [])
    synthesis = AgentSynthesis(
        urgency=scan.get("urgency", "clear"),
        synthesis_text=scan.get("agent_synthesis", ""),
        recommended_actions=agent_actions if isinstance(agent_actions, list) else [],
        specialist=None,
    )

    return ScanResult(
        id=scan["id"],
        scan_type=scan["scan_type"],
        session_label=scan.get("session_label"),
        image_url=scan.get("image_url", ""),
        urgency=scan.get("urgency", "clear"),
        findings=findings,
        agent_synthesis=synthesis,
        model_results=scan.get("model_results", {}),
        created_at=scan.get("created_at", ""),
    )


@router.delete("/{scan_id}")
async def remove_scan(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Delete a scan."""
    deleted = delete_scan(scan_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found or already deleted.",
        )
    return {"message": "Scan deleted successfully."}
