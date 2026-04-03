# app/ai.py
from typing import Tuple
from config import settings

# If you already have a client elsewhere, keep that and remove this.
try:
    from openai import OpenAI
except Exception:
    OpenAI = None  # type: ignore


def _client():
    if OpenAI is None:
        raise RuntimeError("openai package not installed. Add it to requirements.")
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")
    return OpenAI(api_key=settings.openai_api_key)


VALID_CATEGORIES = [
    "Politics", "Economy", "Business", "Markets", "World",
    "Society", "Education", "Health", "Science", "Technology",
    "Energy", "Environment", "Security", "Culture", "Sports",
]

_VALID_CATEGORIES_SET = {c.lower() for c in VALID_CATEGORIES}


def translate_and_summarize(title: str, snippet: str, source_lang_hint: str = "") -> Tuple[str, str, str]:
    """
    Input: title + snippet only (RSS metadata).
    Output: (title_en, summary_en, category).
    category is one of VALID_CATEGORIES or "General".
    """
    text = f"TITLE:\n{title}\n\nSNIPPET:\n{snippet or ''}".strip()

    categories_str = ", ".join(VALID_CATEGORIES)
    sys = (
        "You are a news assistant. Translate the title into English, write a short English summary, "
        "and classify the article into exactly one category.\n"
        "Rules:\n"
        "- Use ONLY the provided TITLE and SNIPPET.\n"
        "- Do NOT invent facts.\n"
        "- Keep the summary 1–2 sentences.\n"
        f"- category must be exactly one of: {categories_str}\n"
        "- Choose the category based on the actual content, NOT the source's own category label.\n"
        "- Return strict JSON: {\"title_en\": \"...\", \"summary_en\": \"...\", \"category\": \"...\"}\n"
    )
    if source_lang_hint:
        sys += f"\nLanguage hint: {source_lang_hint}\n"

    client = _client()
    resp = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": sys},
            {"role": "user", "content": text},
        ],
        temperature=0.2,
    )

    content = resp.choices[0].message.content or ""
    import json

    try:
        data = json.loads(content)
        title_en = (data.get("title_en") or "").strip()
        summary_en = (data.get("summary_en") or "").strip()
        category = (data.get("category") or "").strip()
    except Exception:
        title_en = title.strip()
        summary_en = (snippet or "").strip()[:280]
        category = ""

    if not title_en:
        title_en = title.strip()
    if not summary_en:
        summary_en = (snippet or "").strip()

    # Validate category
    if category.lower() not in _VALID_CATEGORIES_SET:
        category = "General"

    return title_en, summary_en, category