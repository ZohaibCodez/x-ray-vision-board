"""Agentic reasoning engine using Google Gemini 1.5 Flash.

Synthesizes outputs from all specialized models into a unified,
clinically actionable diagnostic report with urgency classification.
"""

from __future__ import annotations
import json
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)

_model = None


def _get_model():
    """Initialize the Gemini model (lazy singleton)."""
    global _model
    if _model is None:
        import google.generativeai as genai
        settings = get_settings()
        genai.configure(api_key=settings.gemini_api_key)
        _model = genai.GenerativeModel("gemini-1.5-flash")
        logger.info("Gemini 1.5 Flash model initialized.")
    return _model


def synthesize_report(
    findings: list[dict],
    scan_type: str,
    patient_notes: str | None = None,
    image_base64: str | None = None,
) -> dict:
    """Generate an agentic synthesis report from model findings.

    Args:
        findings: List of findings from the vision models.
        scan_type: "chest", "fracture", or "wound".
        patient_notes: Optional notes from the clinician.
        image_base64: Optional base64-encoded image for multimodal analysis.

    Returns:
        Dict with urgency, synthesis_text, recommended_actions, specialist.
    """
    model = _get_model()

    prompt = _build_synthesis_prompt(findings, scan_type, patient_notes)

    try:
        response = model.generate_content(prompt)
        parsed = _parse_synthesis_response(response.text)

        # Double-check: if any finding has confidence > 70 but urgency is "clear", escalate
        high_conf_findings = [f for f in findings if f.get("confidence", 0) > 70
                              and f.get("severity") != "clear"]
        if high_conf_findings and parsed["urgency"] == "clear":
            parsed["urgency"] = "medium"
            parsed["synthesis_text"] += (
                " Note: High-confidence findings detected — "
                "radiologist review is recommended."
            )

        return parsed

    except Exception as e:
        logger.error(f"Gemini synthesis failed: {e}")
        # Fallback: generate a basic report from findings alone
        return _fallback_synthesis(findings, scan_type)


def _build_synthesis_prompt(
    findings: list[dict],
    scan_type: str,
    patient_notes: str | None,
) -> str:
    """Construct the structured prompt for Gemini."""

    findings_text = "\n".join(
        f"  - {f['name']}: {f['confidence']}% confidence, "
        f"severity={f.get('severity', 'unknown')}, "
        f"model={f.get('model', 'unknown')}, "
        f"region={f.get('region', 'unknown')}, "
        f"ICD-10={f.get('icd_code', 'N/A')}"
        for f in findings
    )

    notes_section = ""
    if patient_notes:
        notes_section = f"\n\nClinical Notes from Referring Physician:\n{patient_notes}"

    return f"""You are an expert AI radiology assistant integrated into the XRayVision AI system.
You are analyzing the output of specialized medical imaging models.

SCAN TYPE: {scan_type.upper()}

MODEL FINDINGS:
{findings_text}
{notes_section}

Based on these findings, provide a clinical synthesis report. You MUST respond in the following JSON format ONLY (no markdown, no extra text):

{{
  "urgency": "<one of: critical, high, medium, low, clear>",
  "synthesis_text": "<2-4 sentence clinical interpretation of the findings, written as a radiologist would. Reference specific findings, their clinical significance, and how they relate to each other.>",
  "recommended_actions": [
    "<action 1>",
    "<action 2>",
    "<action 3>",
    "<action 4>"
  ],
  "specialist": "<recommended specialist type, e.g., Cardiologist, Orthopedic Surgeon, Pulmonologist, or null if clear>"
}}

IMPORTANT RULES:
1. Be clinically precise. Reference actual finding names and confidence levels.
2. If any finding has severity "high" or confidence > 80%, urgency should be at minimum "high".
3. If no significant pathology is detected, set urgency to "clear" and recommend routine follow-up.
4. Always include a recommendation to consult a qualified radiologist.
5. recommended_actions should be specific, actionable medical steps.
6. This is for educational use — include appropriate disclaimers in your synthesis.
"""


def _parse_synthesis_response(response_text: str) -> dict:
    """Parse the Gemini response into a structured dict."""
    # Try to extract JSON from the response
    text = response_text.strip()

    # Remove markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        text = text.strip()

    try:
        parsed = json.loads(text)
        return {
            "urgency": parsed.get("urgency", "medium"),
            "synthesis_text": parsed.get("synthesis_text", ""),
            "recommended_actions": parsed.get("recommended_actions", []),
            "specialist": parsed.get("specialist"),
        }
    except json.JSONDecodeError:
        # If JSON parsing fails, extract what we can
        logger.warning("Failed to parse Gemini JSON response, using raw text.")
        return {
            "urgency": "medium",
            "synthesis_text": text[:500],
            "recommended_actions": [
                "Consult a qualified radiologist for definitive interpretation",
                "Correlate with clinical symptoms and patient history",
                "Consider additional imaging if findings are inconclusive",
            ],
            "specialist": None,
        }


def _fallback_synthesis(findings: list[dict], scan_type: str) -> dict:
    """Generate a basic synthesis when Gemini is unavailable."""
    if not findings or all(f.get("severity") == "clear" for f in findings):
        return {
            "urgency": "clear",
            "synthesis_text": (
                "No significant pathology detected in the submitted image. "
                "The AI models did not identify findings exceeding the confidence threshold. "
                "Routine follow-up is recommended."
            ),
            "recommended_actions": [
                "No immediate action required",
                "Continue routine screening schedule",
                "Consult radiologist if symptoms persist",
            ],
            "specialist": None,
        }

    # Sort findings by confidence
    sorted_findings = sorted(findings, key=lambda f: f.get("confidence", 0), reverse=True)
    top = sorted_findings[0]

    urgency = "high" if top["confidence"] > 70 else "medium" if top["confidence"] > 50 else "low"

    names = ", ".join(f["name"] for f in sorted_findings[:3])
    synthesis = (
        f"AI models detected the following findings: {names}. "
        f"The highest confidence finding is {top['name']} at {top['confidence']}%. "
        f"Please consult a qualified radiologist for definitive diagnosis."
    )

    return {
        "urgency": urgency,
        "synthesis_text": synthesis,
        "recommended_actions": [
            "Seek radiologist consultation for definitive interpretation",
            f"Consider {top.get('region', 'targeted')} imaging follow-up",
            "Correlate with clinical symptoms and patient history",
            "Do not dismiss findings — clinical verification required",
        ],
        "specialist": _suggest_specialist(scan_type, sorted_findings),
    }


def _suggest_specialist(scan_type: str, findings: list[dict]) -> str | None:
    """Suggest a specialist based on scan type and findings."""
    if scan_type == "chest":
        cardiac_findings = {"Cardiomegaly", "Enlarged Cardiomediastinum"}
        if any(f["name"] in cardiac_findings for f in findings):
            return "Cardiologist"
        return "Pulmonologist"
    elif scan_type == "fracture":
        return "Orthopedic Surgeon"
    elif scan_type == "wound":
        return "General Surgeon"
    return None
