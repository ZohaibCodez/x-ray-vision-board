"""Nearby clinic/hospital locator using OpenStreetMap Overpass API."""

from __future__ import annotations

import logging
import math
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.schemas import ClinicResult, ClinicSearchResponse
from app.services.auth_service import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter(tags=["clinics"])

OVERPASS_ENDPOINTS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
)

AMENITY_LABELS = {
    "hospital": "Hospital",
    "clinic": "Clinic",
    "doctors": "Doctors",
    "doctor": "Doctors",
    "pharmacy": "Pharmacy",
    "health_centre": "Health Centre",
    "centre": "Health Centre",
}


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in km between two GPS coordinates."""
    radius = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return radius * 2 * math.asin(math.sqrt(a))


@router.get("/clinics", response_model=ClinicSearchResponse)
async def find_nearby_clinics(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius_km: float = Query(default=5.0, ge=0.5, le=25.0, description="Search radius in km"),
    _user_id: str = Depends(get_current_user_id),
):
    """Find hospitals, clinics, doctors, and pharmacies near the given GPS coordinates."""
    radius_m = int(radius_km * 1000)
    elements = await _fetch_overpass_elements(lat, lon, radius_m)
    clinics = _parse_clinics(elements, lat, lon, radius_km)

    return ClinicSearchResponse(
        clinics=clinics,
        total=len(clinics),
        search_location={"lat": lat, "lon": lon, "radius_km": radius_km},
    )


async def _fetch_overpass_elements(lat: float, lon: float, radius_m: int) -> list[dict[str, Any]]:
    query = f"""
[out:json][timeout:25];
(
  node["amenity"~"^(hospital|clinic|doctors|pharmacy|health_centre)$"](around:{radius_m},{lat},{lon});
  way["amenity"~"^(hospital|clinic|doctors|pharmacy|health_centre)$"](around:{radius_m},{lat},{lon});
  relation["amenity"~"^(hospital|clinic|doctors|pharmacy|health_centre)$"](around:{radius_m},{lat},{lon});
  node["healthcare"~"^(hospital|clinic|doctor|pharmacy|centre|health_centre)$"](around:{radius_m},{lat},{lon});
  way["healthcare"~"^(hospital|clinic|doctor|pharmacy|centre|health_centre)$"](around:{radius_m},{lat},{lon});
  relation["healthcare"~"^(hospital|clinic|doctor|pharmacy|centre|health_centre)$"](around:{radius_m},{lat},{lon});
);
out center 80;
"""

    last_error: str | None = None
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(30.0, connect=10.0),
        headers={"User-Agent": "XRayVisionAI/2.1 educational clinic locator"},
        follow_redirects=True,
    ) as client:
        for endpoint in OVERPASS_ENDPOINTS:
            try:
                response = await client.post(endpoint, data={"data": query})
                response.raise_for_status()
                payload = response.json()
                return payload.get("elements", [])
            except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.TransportError, ValueError) as exc:
                last_error = str(exc)
                logger.warning("Overpass endpoint failed (%s): %s", endpoint, exc)

    raise HTTPException(
        status_code=503,
        detail=f"Clinic lookup service temporarily unavailable. Tried {len(OVERPASS_ENDPOINTS)} OpenStreetMap mirrors.",
    ) from RuntimeError(last_error or "Overpass unavailable")


def _parse_clinics(elements: list[dict[str, Any]], lat: float, lon: float, radius_km: float) -> list[ClinicResult]:
    clinics: list[ClinicResult] = []
    seen: set[tuple[str, float, float]] = set()

    for element in elements:
        tags = element.get("tags") or {}
        name = tags.get("name") or tags.get("operator") or tags.get("brand") or "Unnamed Facility"
        raw_type = (tags.get("amenity") or tags.get("healthcare") or "clinic").replace(" ", "_").lower()
        facility_type = AMENITY_LABELS.get(raw_type, raw_type.replace("_", " ").title())

        coords = _element_coords(element, lat, lon)
        if coords is None:
            continue
        clat, clon = coords
        distance = round(_haversine(lat, lon, clat, clon), 2)
        if distance > radius_km + 0.2:
            continue

        dedupe_key = (name.strip().lower(), round(clat, 4), round(clon, 4))
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        clinics.append(
            ClinicResult(
                name=name,
                type=facility_type,
                address=_address_from_tags(tags),
                lat=clat,
                lon=clon,
                distance_km=distance,
                maps_url=f"https://www.google.com/maps/search/?api=1&query={clat},{clon}",
            )
        )

    clinics.sort(key=lambda clinic: (clinic.distance_km, clinic.type, clinic.name))
    return clinics[:80]


def _element_coords(element: dict[str, Any], fallback_lat: float, fallback_lon: float) -> tuple[float, float] | None:
    if element.get("type") == "node" and "lat" in element and "lon" in element:
        return float(element["lat"]), float(element["lon"])

    center = element.get("center") or {}
    if "lat" in center and "lon" in center:
        return float(center["lat"]), float(center["lon"])

    if "bounds" in element:
        bounds = element["bounds"]
        try:
            return (
                (float(bounds["minlat"]) + float(bounds["maxlat"])) / 2,
                (float(bounds["minlon"]) + float(bounds["maxlon"])) / 2,
            )
        except (KeyError, TypeError, ValueError):
            pass

    return fallback_lat, fallback_lon


def _address_from_tags(tags: dict[str, Any]) -> str:
    parts = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:barangay"),
        tags.get("addr:suburb"),
        tags.get("addr:city") or tags.get("addr:municipality"),
        tags.get("addr:province") or tags.get("addr:state"),
        tags.get("addr:country"),
    ]
    return ", ".join(str(part) for part in parts if part) or "Address not available"
