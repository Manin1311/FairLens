import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-pro")


def _clean_json(text: str) -> str:
    """Strip markdown code fences from Gemini JSON responses."""
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    return text


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
    response = model.generate_content(prompt)
    return response.text


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
    "expected_impact": "Quantified improvement expected (e.g., 'Reduces DPD from 0.31 to ~0.08')",
    "effort": "LOW"
  }}
]

Priority must be HIGH/MEDIUM/LOW. Effort must be LOW/MEDIUM/HIGH.
Order by priority (HIGH first). Be specific to the actual bias found.
Return ONLY valid JSON array, nothing else.
"""
    response = model.generate_content(prompt)
    cleaned = _clean_json(response.text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return [
            {
                "title": "Review and balance training data",
                "priority": "HIGH",
                "description": "Analyze the distribution of sensitive attributes in your training data and apply resampling techniques to achieve balanced representation.",
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
    response = model.generate_content(prompt)
    return response.text


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
    response = model.generate_content(prompt)
    return response.text
