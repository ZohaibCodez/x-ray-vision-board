"""Health chatbot service powered by OpenRouter GLM 4.5 Air.

FYP requirement: General doctor bot for health queries, symptom analysis,
home remedies, doctor type recommendation, and multilingual support.
"""

from __future__ import annotations
import logging
from app.services.openrouter_client import complete_text

logger = logging.getLogger(__name__)


SYSTEM_PROMPT_EN = """You are XRayVision AI Health Assistant — a knowledgeable, empathetic medical chatbot.
You help patients with:
1. Symptom analysis and possible conditions
2. Basic home remedies and first-aid guidance
3. Doctor type recommendations (which specialist to see)
4. General health and disease information
5. When to seek emergency medical care

IMPORTANT RULES:
- Always remind users that you are an AI assistant, not a real doctor.
- For serious symptoms, ALWAYS recommend visiting a hospital.
- Be empathetic and clear in your responses.
- If asked about medications, suggest consulting a pharmacist or doctor.
- Provide evidence-based information when possible.
- Keep responses concise but thorough (2-4 paragraphs max).

Respond in a structured, helpful manner. If you recommend a doctor type, mention it clearly.
If you suggest home remedies, list them as bullet points.
"""

SYSTEM_PROMPT_UR = """آپ XRayVision AI ہیلتھ اسسٹنٹ ہیں — ایک ذہین اور ہمدرد طبی چیٹ بوٹ۔
آپ مریضوں کی مدد کرتے ہیں:
1. علامات کا تجزیہ اور ممکنہ بیماریاں
2. بنیادی گھریلو علاج اور فرسٹ ایڈ
3. ڈاکٹر کی سفارش (کس ماہر سے ملیں)
4. عام صحت اور بیماریوں کی معلومات
5. کب ایمرجنسی میں جانا چاہیے

اہم قواعد:
- ہمیشہ یاد دلائیں کہ آپ AI اسسٹنٹ ہیں، حقیقی ڈاکٹر نہیں۔
- سنگین علامات کے لیے ہمیشہ ہسپتال جانے کی سفارش کریں۔
- اردو میں جواب دیں۔
"""


def chat_with_health_bot(
    message: str,
    conversation_history: list[dict] | None = None,
    language: str = "en",
) -> dict:
    """Process a health query and return AI response.

    Args:
        message: The user's message.
        conversation_history: Previous messages for context.
        language: "en" for English, "ur" for Urdu.

    Returns:
        Dict with reply, doctor_type, and home_remedies.
    """
    system_prompt = SYSTEM_PROMPT_UR if language == "ur" else SYSTEM_PROMPT_EN

    # Build conversation context
    messages = [system_prompt]

    if conversation_history:
        for msg in conversation_history[-10:]:  # Last 10 messages for context
            role = "User" if msg.get("role") == "user" else "Assistant"
            messages.append(f"{role}: {msg.get('content', '')}")

    messages.append(f"User: {message}")

    lang_instruction = ""
    if language == "ur":
        lang_instruction = "\n\nIMPORTANT: Respond entirely in Urdu (اردو)."

    full_prompt = "\n\n".join(messages) + lang_instruction + """

Respond with helpful medical guidance. Also include at the end of your response (in a new line):
DOCTOR_TYPE: <specialist type or "none">
HOME_REMEDIES: <comma-separated list of remedies or "none">
"""

    try:
        response_text = complete_text(full_prompt, temperature=0.35, max_tokens=1200)
        return _parse_chat_response(response_text)
    except Exception as e:
        logger.error(f"Chatbot error: {e}")
        return {
            "reply": (
                "I apologize, but I'm currently unable to process your request. "
                "Please try again later or consult a medical professional directly."
                if language == "en" else
                "معذرت، میں ابھی آپ کی درخواست پر عمل نہیں کر سکتا۔ "
                "براہ کرم بعد میں دوبارہ کوشش کریں یا براہ راست ڈاکٹر سے مشورہ کریں۔"
            ),
            "doctor_type": None,
            "home_remedies": [],
        }


def _parse_chat_response(text: str) -> dict:
    """Parse the chat response to extract doctor type and remedies."""
    lines = text.strip().split("\n")
    reply_lines = []
    doctor_type = None
    home_remedies = []

    for line in lines:
        stripped = line.strip()
        if stripped.upper().startswith("DOCTOR_TYPE:"):
            val = stripped.split(":", 1)[1].strip()
            doctor_type = val if val.lower() != "none" else None
        elif stripped.upper().startswith("HOME_REMEDIES:"):
            val = stripped.split(":", 1)[1].strip()
            if val.lower() != "none":
                home_remedies = [r.strip() for r in val.split(",") if r.strip()]
        else:
            reply_lines.append(line)

    return {
        "reply": "\n".join(reply_lines).strip(),
        "doctor_type": doctor_type,
        "home_remedies": home_remedies,
    }
