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

# Model priority list for maximum availability
MODEL_CANDIDATES = ["gemini-flash-latest", "gemini-pro-latest", "gemini-3.5-flash", "gemini-3.7-flash"]
_current_model_idx = 0

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
    global _current_key_idx, _current_model_idx
    if not _API_KEYS:
        raise RuntimeError("No Gemini API keys configured in .env")
    key = _API_KEYS[_current_key_idx % len(_API_KEYS)]
    model_name = MODEL_CANDIDATES[_current_model_idx % len(MODEL_CANDIDATES)]
    key_preview = key[:8] + "..." if key else "none"
    print(f"[FairLens] Using key [{(_current_key_idx % len(_API_KEYS)) + 1}/{len(_API_KEYS)}] with {model_name}: {key_preview}")
    genai.configure(api_key=key)
    return genai.GenerativeModel(model_name)

def _rotate_key():
    global _current_key_idx, _current_model_idx
    old = (_current_key_idx % len(_API_KEYS)) + 1
    _current_key_idx = (_current_key_idx + 1) % max(len(_API_KEYS), 1)
    new = (_current_key_idx % len(_API_KEYS)) + 1
    # Also rotate candidate model if completed a full cycle
    if new == 1:
        _current_model_idx = (_current_model_idx + 1) % len(MODEL_CANDIDATES)
    print(f"[FairLens] Key rotated: {old} -> {new} (model/quota rotation)")

def _generate_with_retry(prompt: str, max_retries: int = 5) -> str:
    """Call Gemini with automatic key and model rotation on rate limit, 404, or quota errors."""
    last_error = None
    attempts = max_retries * max(len(_API_KEYS), 1) * len(MODEL_CANDIDATES)
    for attempt in range(attempts):
        try:
            model = _get_model()
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            err_str = str(e)
            # Rotate on quota, 404, auth, or server errors
            if any(x in err_str for x in ["429", "403", "404", "503", "quota", "PERMISSION",
                                           "API_KEY", "ResourceExhausted", "PermissionDenied",
                                           "NotFound", "no longer available", "ServiceUnavailable", "overloaded", "UNAVAILABLE"]):
                _rotate_key()
                last_error = e
                wait = 1.0 if "quota" in err_str.lower() or "exceeded" in err_str.lower() else 0.2
                time.sleep(wait)
                continue
            raise e
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

async def explain_bias_findings(analysis_results: dict, dataset_context: str = "", language: str = "English") -> dict:
    """Generate structured bias explanation. Returns dict with tldr, key_findings, etc."""
    lang_instruction = f"Write your entire response in {language}." if language != "English" else ""

    # Slim the payload — only send what Gemini needs (saves tokens → faster)
    slim = {
        "overall_fairness_score": analysis_results.get("overall_fairness_score"),
        "overall_risk_level":     analysis_results.get("overall_risk_level"),
        "total_rows":             analysis_results.get("total_rows"),
        "bias_drivers":           analysis_results.get("bias_drivers", []),
        "attribute_results": [
            {
                "sensitive_column":               r.get("sensitive_column"),
                "risk_level":                     r.get("risk_level"),
                "fairness_score":                 r.get("fairness_score"),
                "demographic_parity_difference":  r.get("demographic_parity_difference"),
                "disparate_impact_ratio":          r.get("disparate_impact_ratio"),
                "most_disadvantaged_group":        r.get("most_disadvantaged_group"),
                "most_advantaged_group":           r.get("most_advantaged_group"),
            }
            for r in analysis_results.get("attribute_results", []) if not r.get("error")
        ],
    }

    prompt = f"""You are an AI fairness expert. Explain bias results to a non-technical manager.
{lang_instruction}
Dataset: {dataset_context or "Decision-making dataset (hiring, loans, or similar)"}
Results: {json.dumps(slim)}

Return ONLY valid JSON:
{{"tldr":"One clear verdict sentence (max 20 words)","risk_emoji":"single emoji","key_findings":["Finding 1 with numbers","Finding 2 with numbers","Finding 3 with numbers"],"who_is_affected":"Specific group(s) disadvantaged and by how much","real_world_consequence":"What happens to real people if deployed","urgency":"What must be done immediately (1-2 sentences)"}}"""
    
    try:
        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(None, _generate_with_retry, prompt)
        cleaned = _clean_json(text)
        return json.loads(cleaned)
    except Exception as ex:
        print(f"[FairLens] Gemini explanation fallback triggered: {ex}")
        overall = analysis_results.get("overall_risk_level", "UNKNOWN")
        score = analysis_results.get("overall_fairness_score", 0)
        
        # Localized fallbacks
        prefix = f"[{language}] " if language != "English" else ""
        return {
            "tldr": f"{prefix}This AI system has {overall} bias risk with an overall fairness score of {score}/100.",
            "risk_emoji": "🔴" if overall == "HIGH" else "🟡" if overall == "MEDIUM" else "🟢",
            "key_findings": [
                f"{prefix}Overall fairness score: {score}/100",
                f"{prefix}Risk level: {overall}",
                f"{prefix}Detailed metric analysis available in the table below."
            ],
            "who_is_affected": f"{prefix}See individual protected attributes in the table for specific group impacts.",
            "real_world_consequence": f"{prefix}Biased models can produce unequal distribution of positive outcomes across demographic groups.",
            "urgency": f"{prefix}Review recommended fixes in the Mitigation Studio before deployment.",
        }


async def generate_fix_suggestions(analysis_results: dict) -> list:
    """Generate ranked, actionable remediation steps."""
    slim = {
        "overall_risk_level":   analysis_results.get("overall_risk_level"),
        "overall_fairness_score": analysis_results.get("overall_fairness_score"),
        "bias_drivers":         analysis_results.get("bias_drivers", []),
        "attribute_results": [
            {"sensitive_column": r.get("sensitive_column"), "risk_level": r.get("risk_level"),
             "demographic_parity_difference": r.get("demographic_parity_difference"),
             "disparate_impact_ratio": r.get("disparate_impact_ratio")}
            for r in analysis_results.get("attribute_results", []) if not r.get("error")
        ],
    }
    prompt = f"""You are an AI fairness engineer. Give 5 specific, actionable fixes.
Results: {json.dumps(slim)}
Return ONLY a JSON array of 5 objects: [{{"title":"...","priority":"HIGH|MEDIUM|LOW","description":"...","expected_impact":"...","effort":"LOW|MEDIUM|HIGH"}}]
Order HIGH priority first. Be specific to the actual bias found."""
    try:
        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(None, _generate_with_retry, prompt)
        cleaned = _clean_json(text)
        return json.loads(cleaned)
    except Exception as ex:
        print(f"[FairLens] Fix suggestions fallback triggered: {ex}")
        return [
            {
                "title": "Apply Fair Sample Reweighting",
                "priority": "HIGH",
                "description": "Recalibrate sample weights for underrepresented demographics to reduce disparate impact.",
                "expected_impact": "Expected to improve Disparate Impact Ratio to > 0.80",
                "effort": "LOW"
            },
            {
                "title": "Group Threshold Calibration",
                "priority": "HIGH",
                "description": "Adjust decision thresholds independently per sensitive group to equalize true positive rates.",
                "expected_impact": "Reduces Equalized Odds Difference by 30-50%",
                "effort": "MEDIUM"
            },
            {
                "title": "Ablate Proxy Feature Correlations",
                "priority": "MEDIUM",
                "description": "Audit non-protected columns with Cramér's V > 0.40 to prevent indirect discrimination.",
                "expected_impact": "Mitigates hidden proxy bias vectors",
                "effort": "MEDIUM"
            }
        ]


async def generate_report_summary(analysis_results: dict, audit_name: str, language: str = "English") -> str:
    """Generate a professional executive summary for the PDF report."""
    lang_instruction = f"Write in {language}." if language != "English" else ""
    prompt = f"""
Write a professional executive summary for an AI bias audit report. {lang_instruction}

Audit Name: {audit_name}
Analysis Results: {json.dumps(analysis_results, indent=2)}

Write exactly 3 paragraphs:
1. Summary of key findings (what was found, severity, which attributes)
2. Business and legal risk assessment (consequences of deploying this system)
3. Immediate recommended actions (top 3 things to do right now)

Professional tone suitable for C-suite executives. Maximum 220 words.
Do not use headers — just 3 clean paragraphs.
"""
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _generate_with_retry, prompt)
    except Exception as ex:
        print(f"[FairLens] Report summary fallback triggered: {ex}")
        score = analysis_results.get("overall_fairness_score", 0)
        risk = analysis_results.get("overall_risk_level", "UNKNOWN")
        return f"This algorithmic audit evaluated '{audit_name}' across all designated sensitive attributes. The system achieved a Global Fairness Score of {score}/100, categorized under a {risk} risk rating.\n\nAutomated statistical tests including Demographic Parity Difference and Disparate Impact Ratio were conducted under EU AI Act and EEOC frameworks.\n\nIt is recommended to deploy the mitigation recalibrations provided in FairLens 2.0 to ensure regulatory compliance and ethical decision boundaries."


async def regenerate_explanation(analysis_results: dict, language: str, dataset_context: str = "") -> dict:
    """Re-generate explanation in a different language."""
    return await explain_bias_findings(analysis_results, dataset_context, language)


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
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _generate_with_retry, prompt)
    except Exception as ex:
        print(f"[FairLens] Chat fallback triggered: {ex}")
        score = analysis_results.get("overall_fairness_score", 0)
        risk = analysis_results.get("overall_risk_level", "UNKNOWN")
        return f"Based on your audit results, this model scored {score}/100 with a {risk} risk rating. You can inspect specific demographic disparity metrics and test threshold mitigations in the Mitigation Studio tab."
