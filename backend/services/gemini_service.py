"""
Gemini API Key Rotator — cycles through multiple keys on 429 rate limit errors.
Add keys as: GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... in your .env
"""
import google.generativeai as genai
import json
import os
import time
import asyncio
from dotenv import load_dotenv

load_dotenv()

MODEL_NAME = "gemini-2.5-flash"

# ─── Load all API keys ────────────────────────────────────────────────────────
def _load_keys() -> list[str]:
    keys = []
    # Primary key
    primary = os.getenv("GEMINI_API_KEY", "")
    if primary and "your_gemini" not in primary:
        keys.append(primary)
    # Additional keys: GEMINI_API_KEY_1 through GEMINI_API_KEY_20
    for i in range(1, 21):
        k = os.getenv(f"GEMINI_API_KEY_{i}", "")
        if k and "your_gemini" not in k:
            keys.append(k)
    print(f"[FairLens] Gemini key pool loaded: {len(keys)} key(s) available")
    return keys

_API_KEYS = _load_keys()
_current_key_idx = 0

def _get_model() -> genai.GenerativeModel:
    global _current_key_idx
    if not _API_KEYS:
        raise RuntimeError("No Gemini API keys configured in .env")
    key = _API_KEYS[_current_key_idx % len(_API_KEYS)]
    key_preview = key[:8] + "..." if key else "none"
    print(f"[FairLens] Using key [{(_current_key_idx % len(_API_KEYS)) + 1}/{len(_API_KEYS)}]: {key_preview}")
    genai.configure(api_key=key)
    return genai.GenerativeModel(MODEL_NAME)

def _rotate_key():
    global _current_key_idx
    old = (_current_key_idx % len(_API_KEYS)) + 1
    _current_key_idx = (_current_key_idx + 1) % max(len(_API_KEYS), 1)
    new = (_current_key_idx % len(_API_KEYS)) + 1
    print(f"[FairLens] Key rotated: {old} → {new} (rate limit hit)")

def _generate_with_retry(prompt: str, max_retries: int = 5) -> str:
    """Call Gemini with automatic key rotation on rate limit or auth errors."""
    last_error = None
    attempts = max_retries * max(len(_API_KEYS), 1)
    for attempt in range(attempts):
        try:
            model = _get_model()
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            err_str = str(e)
            # Rotate on quota, auth, or server errors
            if any(x in err_str for x in ["429", "403", "503", "quota", "PERMISSION",
                                           "API_KEY", "ResourceExhausted", "PermissionDenied",
                                           "ServiceUnavailable", "overloaded", "UNAVAILABLE"]):
                _rotate_key()
                last_error = e
                # Longer wait on daily quota exhaustion
                wait = 2.0 if "quota" in err_str.lower() or "exceeded" in err_str.lower() else 1.0
                time.sleep(wait)
                continue
            raise e  # Re-raise content/model errors immediately
    raise Exception(f"All {len(_API_KEYS)} Gemini API keys exhausted. Last error: {last_error}")


def _clean_json(text: str) -> str:
    """Strip markdown code fences from Gemini JSON responses."""
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    return text


# ─── AI Functions ─────────────────────────────────────────────────────────────

async def explain_bias_findings(analysis_results: dict, dataset_context: str = "") -> str:
    """Generate a plain-English explanation of bias findings."""
    prompt = f"""
You are an AI fairness expert explaining bias detection results to a non-technical organization manager.

Analysis Results:
{json.dumps(analysis_results, indent=2)}

Dataset Context: {dataset_context if dataset_context else "General decision-making dataset (hiring, loans, or similar)"}

Write a clear, impactful explanation (300-400 words) that:
1. Opens with the overall verdict: Is this AI system fair or not? (be direct)
2. Explains what each metric found means in real-world human terms (not ML jargon)
3. Describes who is being disadvantaged and by how much
4. States the real-world consequences if this system is deployed
5. Closes with urgency appropriate to the risk level

Use plain, powerful language. Make it feel real — these are decisions about people's lives.
Do NOT use bullet points — write in flowing paragraphs.
"""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _generate_with_retry, prompt)


async def generate_fix_suggestions(analysis_results: dict) -> list:
    """Generate ranked, actionable remediation steps."""
    prompt = f"""
You are an AI fairness engineer providing remediation advice to a technical team.

Bias Analysis Results:
{json.dumps(analysis_results, indent=2)}

Generate exactly 5 specific, actionable fix suggestions in this JSON format:
[
  {{
    "title": "Short action title",
    "priority": "HIGH",
    "description": "Specific steps to implement this fix",
    "expected_impact": "Quantified improvement expected",
    "effort": "LOW"
  }}
]

Priority must be HIGH/MEDIUM/LOW. Effort must be LOW/MEDIUM/HIGH.
Order by priority (HIGH first). Be specific to the actual bias found.
Return ONLY valid JSON array, nothing else.
"""
    loop = asyncio.get_running_loop()
    text = await loop.run_in_executor(None, _generate_with_retry, prompt)
    cleaned = _clean_json(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return [
            {
                "title": "Balance training data representation",
                "priority": "HIGH",
                "description": "Analyse distribution of sensitive attributes and apply resampling techniques to achieve balanced representation across all groups.",
                "expected_impact": "Expected to reduce Demographic Parity Difference by 40-60%",
                "effort": "MEDIUM"
            }
        ]


async def generate_report_summary(analysis_results: dict, audit_name: str) -> str:
    """Generate a professional executive summary for the PDF report."""
    prompt = f"""
Write a professional executive summary for an AI bias audit report.

Audit Name: {audit_name}
Analysis Results: {json.dumps(analysis_results, indent=2)}

Write exactly 3 paragraphs:
1. Summary of key findings (what was found, severity, which attributes)
2. Business and legal risk assessment (consequences of deploying this system)
3. Immediate recommended actions (top 3 things to do right now)

Professional tone suitable for C-suite executives. Maximum 220 words.
Do not use headers — just 3 clean paragraphs.
"""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _generate_with_retry, prompt)


async def answer_question(question: str, analysis_results: dict) -> str:
    """Answer a user question about their audit results."""
    prompt = f"""
You are a helpful AI fairness assistant. The user has run a bias audit on their dataset.

Their Analysis Results:
{json.dumps(analysis_results, indent=2)}

User's Question: {question}

Answer clearly and helpfully. Reference specific numbers from the results when relevant.
Keep your answer focused and under 200 words.
"""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _generate_with_retry, prompt)
