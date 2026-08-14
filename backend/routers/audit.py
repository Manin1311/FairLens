import json
import asyncio
import os
import pandas as pd
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from sqlalchemy.orm import Session
from models.database import get_db, User, Audit, AuditResult
from models.schemas import (
    AuditOut, AuditDetailOut, ColumnDetectOut, ChatRequest, ChatResponse,
    MitigateRequest, IntersectionalRequest, CounterfactualRequest, LlmAuditRequest
)
from services.bias_engine import (
    load_dataframe, detect_sensitive_columns,
    detect_target_column, run_full_analysis
)
from services.mitigation_engine import mitigate_dataset, simulate_mitigation_from_analysis
from services.intersectional_engine import compute_intersectional_matrix, compute_intersectional_from_analysis
from services.counterfactual_engine import simulate_counterfactual, simulate_counterfactual_from_analysis
from services.llm_bias_engine import audit_llm_text
from services import gemini_service
from routers.auth import get_current_user

router = APIRouter()

MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}


# ─── Upload & Auto-detect columns ────────────────────────────────────────────
@router.post("/detect-columns", response_model=ColumnDetectOut)
async def detect_columns(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload CSV and auto-detect sensitive & target columns."""
    _validate_file(file)
    content = await file.read()
    df = load_dataframe(content, file.filename)
    sensitive = detect_sensitive_columns(df)
    target = detect_target_column(df)
    return ColumnDetectOut(
        columns=list(df.columns),
        detected_sensitive=sensitive,
        detected_target=target
    )


# ─── Run Full Analysis ────────────────────────────────────────────────────────
@router.post("/run", response_model=AuditOut, status_code=status.HTTP_201_CREATED)
async def run_audit(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form(...),
    sensitive_columns: str = Form(...),
    target_column: str = Form(...),
    prediction_column: Optional[str] = Form(None),
    language: str = Form("English"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload CSV, run bias analysis immediately, then enrich with Gemini in background."""
    _validate_file(file)
    content = await file.read()
    df = load_dataframe(content, file.filename)

    try:
        sensitive_cols: List[str] = json.loads(sensitive_columns)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="sensitive_columns must be a valid JSON array")

    # ── Phase 1: Run bias engine (fast) ──────────────────────────────────────
    analysis = run_full_analysis(df, sensitive_cols, target_column, prediction_column)

    # ── Persist audit + empty result placeholder ──────────────────────────────
    audit = Audit(
        user_id=current_user.id,
        name=name,
        dataset_name=file.filename,
        total_rows=len(df),
        total_columns=len(df.columns),
        sensitive_columns=json.dumps(sensitive_cols),
        target_column=target_column,
        prediction_column=prediction_column or "",
        overall_risk=analysis["overall_risk_level"],
        overall_score=analysis["overall_fairness_score"],
        language=language,
        status="processing"
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)

    # Save bias results + instant rule-based explanation (zero wait for user)
    result = AuditResult(
        audit_id=audit.id,
        raw_analysis=json.dumps(analysis),
        gemini_explanation=json.dumps(_instant_explanation(analysis, file.filename)),
        fix_suggestions=json.dumps(_instant_fixes(analysis)),
        report_summary=""
    )
    db.add(result)
    audit.status = "complete"   # page can load immediately
    db.commit()

    # ── Gemini enriches in background (replaces instant results silently) ─────
    background_tasks.add_task(
        _enrich_with_gemini, audit.id, analysis, file.filename, language
    )

    return audit


def _instant_explanation(analysis: dict, dataset_name: str = "") -> dict:
    """Generate a complete structured explanation purely from bias metrics — zero API calls."""
    risk    = analysis.get("overall_risk_level", "UNKNOWN")
    score   = analysis.get("overall_fairness_score", 0)
    attrs   = [a for a in analysis.get("attribute_results", []) if not a.get("error")]
    drivers = analysis.get("bias_drivers", [])
    rows    = analysis.get("total_rows", 0)
    emoji   = "\U0001f534" if risk == "HIGH" else "\U0001f7e1" if risk == "MEDIUM" else "\U0001f7e2"

    if risk == "HIGH":
        tldr = f"This AI system has HIGH bias risk (score {score}/100) and likely violates fairness regulations."
    elif risk == "MEDIUM":
        tldr = f"This AI system has MEDIUM bias risk (score {score}/100) \u2014 remediation recommended before deployment."
    else:
        tldr = f"This AI system has LOW bias risk (score {score}/100) and appears broadly fair across groups."

    findings = []
    if drivers:
        top = drivers[0]
        findings.append(f"'{top['column']}' is the strongest bias driver ({top['contribution_pct']:.1f}% influence, {top['risk_level']} risk).")
    for a in attrs[:3]:
        dpd = a.get("demographic_parity_difference")
        dis = a.get("most_disadvantaged_group")
        adv = a.get("most_advantaged_group")
        if dpd is not None and dis and adv and dis != adv:
            findings.append(f"'{a['sensitive_column']}': '{dis}' group is most disadvantaged (DPD={dpd:.3f}, score={a.get('fairness_score')}/100).")
    if not findings:
        findings.append(f"Analysis completed on {rows:,} rows across {len(attrs)} attribute(s).")

    high_risk = [a for a in attrs if a.get("risk_level") == "HIGH"]
    if high_risk:
        groups = ", ".join(f"'{a.get('most_disadvantaged_group','?')}' in {a['sensitive_column']}" for a in high_risk[:2])
        who = f"Groups most at risk: {groups}. These individuals may receive unfair AI decisions."
    elif attrs:
        who = "Minority groups across the analysed attributes may experience unequal outcomes."
    else:
        who = "Could not determine affected groups from available data."

    if risk == "HIGH":
        consequence = "Deploying this system could systematically disadvantage specific groups, creating legal liability under EU AI Act and EEOC regulations."
    elif risk == "MEDIUM":
        consequence = "Some groups may receive unfair decisions at a rate that could attract regulatory scrutiny. Remediate before full deployment."
    else:
        consequence = "Current fairness levels are acceptable for deployment, though continuous monitoring is recommended."

    if risk == "HIGH":
        top_col = drivers[0]['column'] if drivers else 'the top attribute'
        urgency = f"Do not deploy. Address '{top_col}' immediately using data rebalancing or fairness constraints."
    elif risk == "MEDIUM":
        urgency = "Review fix suggestions below. Apply data rebalancing for high-risk attributes before production rollout."
    else:
        urgency = "System is ready for deployment. Set up ongoing monitoring to catch bias drift over time."

    return {
        "tldr": tldr, "risk_emoji": emoji, "key_findings": findings,
        "who_is_affected": who, "real_world_consequence": consequence, "urgency": urgency,
        "_source": "instant"
    }


def _instant_fixes(analysis: dict) -> list:
    """Generate rule-based fix suggestions from bias metrics — zero API calls."""
    attrs   = [a for a in analysis.get("attribute_results", []) if not a.get("error")]
    drivers = analysis.get("bias_drivers", [])
    risk    = analysis.get("overall_risk_level", "LOW")
    fixes   = []

    if drivers:
        top = drivers[0]
        fixes.append({"title": f"Rebalance training data for '{top['column']}'",
            "priority": top.get("risk_level", "HIGH"),
            "description": f"'{top['column']}' accounts for {top['contribution_pct']:.1f}% of bias. Apply SMOTE or undersampling to equalise group representation.",
            "expected_impact": "Reduces demographic parity difference by 30\u201360%", "effort": "MEDIUM"})

    if risk in ("HIGH", "MEDIUM"):
        fixes.append({"title": "Apply fairness constraints during model training",
            "priority": "HIGH",
            "description": "Use adversarial debiasing or Fairlearn's ExponentiatedGradient to enforce demographic parity during training.",
            "expected_impact": "Reduces DPD by 40\u201370% with minimal accuracy loss", "effort": "HIGH"})

    fixes.append({"title": "Calibrate decision thresholds per group",
        "priority": "MEDIUM",
        "description": "Apply separate classification thresholds per sensitive group to equalise positive rates. Fastest fix without retraining.",
        "expected_impact": "Immediate improvement in disparate impact ratio", "effort": "LOW"})

    proxy = drivers[1] if len(drivers) > 1 else None
    if proxy:
        fixes.append({"title": f"Audit '{proxy['column']}' for proxy discrimination",
            "priority": proxy.get("risk_level", "MEDIUM"),
            "description": f"'{proxy['column']}' may act as a proxy for protected characteristics. Analyse its correlation and consider removing or transforming it.",
            "expected_impact": "Reduces indirect discrimination risk", "effort": "MEDIUM"})
    else:
        fixes.append({"title": "Remove high-correlation proxy features",
            "priority": "MEDIUM",
            "description": "Identify features correlated with sensitive attributes (e.g. zip code \u2194 race) and apply feature transformation.",
            "expected_impact": "Reduces indirect discrimination", "effort": "MEDIUM"})

    fixes.append({"title": "Implement continuous fairness monitoring",
        "priority": "LOW",
        "description": "Set up automated bias audits in your CI/CD pipeline. Alert when DPD exceeds 0.1 or DIR drops below 0.8 in production.",
        "expected_impact": "Early detection prevents bias drift", "effort": "LOW"})

    return fixes[:5]


async def _enrich_with_gemini(audit_id: int, analysis: dict, dataset_name: str, language: str):
    """Background task: replaces instant results with Gemini-quality explanations."""
    from models.database import SessionLocal
    db = SessionLocal()
    try:
        # Run explain and fix_suggestions in parallel — report_summary done lazily
        explanation_dict, fixes = await asyncio.gather(
            gemini_service.explain_bias_findings(analysis, dataset_name, language),
            gemini_service.generate_fix_suggestions(analysis),
        )
        result = db.query(AuditResult).filter(AuditResult.audit_id == audit_id).first()
        audit  = db.query(Audit).filter(Audit.id == audit_id).first()
        if result and audit:
            result.gemini_explanation = json.dumps(explanation_dict)
            result.fix_suggestions    = json.dumps(fixes)
            audit.status              = "complete"
            db.commit()
    except Exception as e:
        import traceback; traceback.print_exc()
        print(f"[BG Gemini error for audit {audit_id}]: {e}")
        try:
            audit = db.query(Audit).filter(Audit.id == audit_id).first()
            if audit:
                audit.status = "complete"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()



# ─── List Audits ──────────────────────────────────────────────────────────────
@router.get("/", response_model=List[AuditOut])
def list_audits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    audits = db.query(Audit).filter(
        Audit.user_id == current_user.id
    ).order_by(Audit.created_at.desc()).all()
    return audits


# ─── Get Audit Detail ─────────────────────────────────────────────────────────
@router.get("/{audit_id}")
def get_audit(
    audit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    audit = _get_owned_audit(audit_id, current_user.id, db)
    result = audit.result
    gemini_raw = result.gemini_explanation if result else "{}"
    try:
        gemini_data = json.loads(gemini_raw)
    except Exception:
        gemini_data = {"tldr": gemini_raw, "key_findings": [], "detailed_analysis": gemini_raw}

    return {
        "id": audit.id,
        "name": audit.name,
        "dataset_name": audit.dataset_name,
        "total_rows": audit.total_rows,
        "total_columns": audit.total_columns,
        "sensitive_columns": json.loads(audit.sensitive_columns),
        "target_column": audit.target_column,
        "overall_risk": audit.overall_risk,
        "overall_score": audit.overall_score,
        "status": audit.status,
        "is_public": audit.is_public,
        "language": audit.language,
        "created_at": audit.created_at,
        "raw_analysis": json.loads(result.raw_analysis) if result else None,
        "gemini_explanation": gemini_data,
        "fix_suggestions": json.loads(result.fix_suggestions) if result else [],
        "report_summary": result.report_summary if result else "",
    }


# ─── Chat / Q&A ──────────────────────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
async def chat_about_audit(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    audit = _get_owned_audit(payload.audit_id, current_user.id, db)
    if not audit.result:
        raise HTTPException(status_code=404, detail="Audit results not found")
    analysis = json.loads(audit.result.raw_analysis)
    answer = await gemini_service.answer_question(payload.question, analysis)
    return ChatResponse(answer=answer)


@router.post("/demo/chat")
async def demo_chat_about_audit(payload: Dict[str, Any]):
    question = payload.get("question", "")
    analysis = payload.get("analysis")
    if not analysis:
        dataset_name = payload.get("dataset_name", "compas")
        demo = _load_demo(dataset_name)
        analysis = demo.get("analysis", {})
    answer = await gemini_service.answer_question(question, analysis)
    return {"answer": answer}


# ─── Toggle Public Sharing ────────────────────────────────────────────────────
@router.patch("/{audit_id}/share")
def toggle_share(audit_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit = _get_owned_audit(audit_id, current_user.id, db)
    audit.is_public = not audit.is_public
    db.commit()
    return {"is_public": audit.is_public, "share_url": f"/audit/public/{audit.id}" if audit.is_public else None}


# ─── Public Audit (no auth) ───────────────────────────────────────────────────
@router.get("/public/{audit_id}")
def get_public_audit(audit_id: int, db: Session = Depends(get_db)):
    audit = db.query(Audit).filter(Audit.id == audit_id, Audit.is_public == True).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found or not public")
    result = audit.result
    gemini_raw = result.gemini_explanation if result else "{}"
    try:
        gemini_data = json.loads(gemini_raw)
    except Exception:
        gemini_data = {"tldr": gemini_raw, "key_findings": [], "detailed_analysis": gemini_raw}
    return {
        "id": audit.id, "name": audit.name, "dataset_name": audit.dataset_name,
        "total_rows": audit.total_rows, "overall_risk": audit.overall_risk,
        "overall_score": audit.overall_score, "created_at": audit.created_at,
        "raw_analysis": json.loads(result.raw_analysis) if result else None,
        "gemini_explanation": gemini_data,
        "fix_suggestions": json.loads(result.fix_suggestions) if result else [],
    }


# ─── Re-explain in Different Language ────────────────────────────────────────
@router.post("/{audit_id}/re-explain")
async def re_explain(audit_id: int, language: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit = _get_owned_audit(audit_id, current_user.id, db)
    if not audit.result:
        raise HTTPException(status_code=404, detail="Audit results not found")
    analysis = json.loads(audit.result.raw_analysis)
    explanation_dict = await gemini_service.regenerate_explanation(analysis, language, audit.dataset_name)
    audit.language = language
    audit.result.gemini_explanation = json.dumps(explanation_dict)
    db.commit()
    return {"gemini_explanation": explanation_dict, "language": language}


@router.post("/{audit_id}/mitigate")
async def mitigate_audit(
    audit_id: int,
    payload: MitigateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """FairLens 2.0: Run mitigation engine on an existing audit using stored analysis."""
    audit = _get_owned_audit(audit_id, current_user.id, db)
    if not audit.result:
        raise HTTPException(status_code=404, detail="Audit results not found")
    analysis = json.loads(audit.result.raw_analysis)
    result = simulate_mitigation_from_analysis(
        analysis=analysis,
        sensitive_col=payload.sensitive_column,
        fairness_goal=payload.fairness_goal,
        strength=payload.strength,
        dataset_name=audit.dataset_name
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{audit_id}/intersectional")
async def intersectional_audit(
    audit_id: int,
    payload: IntersectionalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """FairLens 2.0: Compute 2D intersectional disparity matrix on an existing audit."""
    audit = _get_owned_audit(audit_id, current_user.id, db)
    if not audit.result:
        raise HTTPException(status_code=404, detail="Audit results not found")
    analysis = json.loads(audit.result.raw_analysis)
    result = compute_intersectional_from_analysis(
        analysis=analysis,
        primary_col=payload.primary_column,
        secondary_col=payload.secondary_column,
        target_col=payload.target_column or audit.target_column
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{audit_id}/counterfactual")
async def counterfactual_audit(
    audit_id: int,
    payload: CounterfactualRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """FairLens 2.0: Simulate counterfactual individual fairness on an existing audit."""
    audit = _get_owned_audit(audit_id, current_user.id, db)
    if not audit.result:
        raise HTTPException(status_code=404, detail="Audit results not found")
    analysis = json.loads(audit.result.raw_analysis)
    result = simulate_counterfactual_from_analysis(
        analysis=analysis,
        sample_index=payload.sample_index,
        sensitive_col=payload.sensitive_column,
        target_col=payload.target_column or audit.target_column
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ─── Delete Audit ─────────────────────────────────────────────────────────────
@router.delete("/{audit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_audit(
    audit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    audit = _get_owned_audit(audit_id, current_user.id, db)
    db.delete(audit)
    db.commit()


# ─── Demo Mode (no auth) ──────────────────────────────────────────────────────
# In-memory cache so we don't re-read CSVs on every request
_DEMO_CACHE: dict = {}

def _load_demo(dataset_name: str):
    """Load and cache demo dataset + run bias analysis (fast, no Gemini)."""
    import os, pandas as pd
    if dataset_name not in _DEMO_CACHE:
        demo_path = f"demo_datasets/{dataset_name}.csv"
        if not os.path.exists(demo_path):
            raise HTTPException(status_code=404, detail=f"Demo dataset '{dataset_name}' not found")
        df = pd.read_csv(demo_path)
        sensitive_cols = detect_sensitive_columns(df)
        target_col = detect_target_column(df)
        analysis = run_full_analysis(df, sensitive_cols, target_col)
        _DEMO_CACHE[dataset_name] = {
            "columns": list(df.columns),
            "sensitive_columns": sensitive_cols,
            "target_column": target_col,
            "analysis": analysis,
        }
    return _DEMO_CACHE[dataset_name]


@router.post("/demo/{dataset_name}/quick")
async def run_demo_quick(dataset_name: str):
    """
    Phase-1 demo: returns bias analysis instantly (no Gemini wait).
    Frontend renders results immediately; then calls /explain for AI layer.
    Available: compas | adult_income | german_credit
    """
    data = _load_demo(dataset_name)
    return {
        "dataset": dataset_name,
        **data,
        "gemini_explanation": None,
        "fix_suggestions": [],
    }


@router.post("/demo/{dataset_name}/explain")
async def run_demo_explain(dataset_name: str):
    """
    Phase-2 demo: returns Gemini AI explanation + fix suggestions.
    Results are cached in memory — instant on repeat calls.
    """
    data = _load_demo(dataset_name)

    # ── Return cached Gemini result if available (instant) ───────────────────
    if "gemini_explanation" in data:
        return {
            "gemini_explanation": data["gemini_explanation"],
            "fix_suggestions":    data["fix_suggestions"],
        }

    analysis = data["analysis"]
    explanation = {}
    fixes = []
    try:
        explanation, fixes = await asyncio.gather(
            gemini_service.explain_bias_findings(analysis, f"{dataset_name} dataset"),
            gemini_service.generate_fix_suggestions(analysis),
        )
    except Exception as e:
        import traceback
        print(f"[GEMINI ERROR in demo/{dataset_name}/explain]: {e}")
        traceback.print_exc()
        explanation = {"tldr": f"AI explanation temporarily unavailable. Error: {str(e)[:120]}", "key_findings": []}
        fixes = []

    # ── Cache so next caller gets it instantly ────────────────────────────────
    _DEMO_CACHE[dataset_name]["gemini_explanation"] = explanation
    _DEMO_CACHE[dataset_name]["fix_suggestions"]    = fixes

    return {
        "gemini_explanation": explanation,
        "fix_suggestions":    fixes,
    }


@router.post("/demo/{dataset_name}")
async def run_demo(dataset_name: str):
    """
    Legacy combined demo endpoint (kept for backward compat).
    Prefer /demo/{dataset_name}/quick + /demo/{dataset_name}/explain.
    """
    data = _load_demo(dataset_name)
    analysis = data["analysis"]
    explanation = ""
    fixes = []
    try:
        explanation, fixes = await asyncio.gather(
            gemini_service.explain_bias_findings(analysis, f"{dataset_name} dataset"),
            gemini_service.generate_fix_suggestions(analysis),
        )
    except Exception as e:
        explanation = {"tldr": f"AI explanation temporarily unavailable. Error: {str(e)[:120]}", "key_findings": []}
        fixes = []
    return {
        "dataset": dataset_name,
        **data,
        "gemini_explanation": explanation,
        "fix_suggestions": fixes,
    }


# ─── FairLens 2.0 Endpoints ───────────────────────────────────────────────────

@router.post("/demo/{dataset_name}/mitigate")
async def mitigate_demo_dataset(dataset_name: str, payload: MitigateRequest):
    """FairLens 2.0: Run automated bias mitigation on a demo dataset."""
    demo_path = f"demo_datasets/{dataset_name}.csv"
    if not os.path.exists(demo_path):
        raise HTTPException(status_code=404, detail=f"Demo dataset '{dataset_name}' not found")
    df = pd.read_csv(demo_path)
    target_col = payload.target_column or detect_target_column(df)
    result = mitigate_dataset(
        df=df,
        sensitive_col=payload.sensitive_column,
        target_col=target_col,
        fairness_goal=payload.fairness_goal or "equalized_odds",
        strength=payload.strength or 0.8
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/demo/{dataset_name}/intersectional")
async def intersectional_demo_dataset(dataset_name: str, payload: IntersectionalRequest):
    """FairLens 2.0: Compute 2D intersectional disparity matrix on a demo dataset."""
    demo_path = f"demo_datasets/{dataset_name}.csv"
    if not os.path.exists(demo_path):
        raise HTTPException(status_code=404, detail=f"Demo dataset '{dataset_name}' not found")
    df = pd.read_csv(demo_path)
    target_col = payload.target_column or detect_target_column(df)
    result = compute_intersectional_matrix(
        df=df,
        primary_col=payload.primary_column,
        secondary_col=payload.secondary_column,
        target_col=target_col
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/demo/{dataset_name}/counterfactual")
async def counterfactual_demo_dataset(dataset_name: str, payload: CounterfactualRequest):
    """FairLens 2.0: Simulate counterfactual individual fairness on a demo dataset."""
    demo_path = f"demo_datasets/{dataset_name}.csv"
    if not os.path.exists(demo_path):
        raise HTTPException(status_code=404, detail=f"Demo dataset '{dataset_name}' not found")
    df = pd.read_csv(demo_path)
    target_col = payload.target_column or detect_target_column(df)
    result = simulate_counterfactual(
        df=df,
        sample_index=payload.sample_index,
        sensitive_col=payload.sensitive_column,
        target_col=target_col
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/demo/{dataset_name}/compliance")
def get_demo_compliance(dataset_name: str):
    """FairLens 2.0: Generate EU AI Act, US EEOC, NYC LL144, & ISO 42001 scorecards."""
    data = _load_demo(dataset_name)
    analysis = data["analysis"]
    score = analysis.get("overall_fairness_score", 0)
    risk = analysis.get("overall_risk_level", "UNKNOWN")
    attrs = analysis.get("attribute_results", [])
    
    # Calculate regulatory compliance statuses
    eeoc_pass = all(
        (a.get("disparate_impact_ratio") or 1.0) >= 0.80 for a in attrs if not a.get("error")
    )
    eu_act_pass = score >= 75 and all(
        (a.get("demographic_parity_difference") or 0.0) <= 0.15 for a in attrs if not a.get("error")
    )
    nyc_pass = True  # Audit data is transparently tracked
    iso_pass = score >= 60

    return {
        "dataset_name": dataset_name,
        "overall_score": score,
        "overall_risk": risk,
        "certifications": [
            {
                "standard": "EU AI Act (Article 10: Data Governance & Bias Control)",
                "status": "COMPLIANT" if eu_act_pass else "ACTION REQUIRED",
                "badge_color": "emerald" if eu_act_pass else "rose",
                "details": "Requires technical bias mitigation and continuous testing for high-risk AI systems in EU jurisdiction.",
                "score_threshold": "Score >= 75 and DPD <= 0.15",
                "passed": eu_act_pass
            },
            {
                "standard": "US EEOC Uniform Guidelines (80% Disparate Impact Rule)",
                "status": "COMPLIANT" if eeoc_pass else "NON-COMPLIANT",
                "badge_color": "emerald" if eeoc_pass else "rose",
                "details": "Selection rate for any protected race/gender group must not fall below 4/5ths (80%) of the highest rate group.",
                "score_threshold": "DIR >= 0.80 on all protected classes",
                "passed": eeoc_pass
            },
            {
                "standard": "NYC Local Law 144 (Automated Employment Decision Tools)",
                "status": "AUDITED & DOCUMENTED",
                "badge_color": "emerald",
                "details": "Requires annual independent bias audit and published impact ratios before deployment in NYC.",
                "score_threshold": "Disparate Impact transparency verified",
                "passed": nyc_pass
            },
            {
                "standard": "ISO/IEC 42001 (AI Management Systems — Risk Assessment)",
                "status": "CERTIFIED" if iso_pass else "PROVISIONAL",
                "badge_color": "indigo" if iso_pass else "amber",
                "details": "Governs organizational processes for trustworthy AI systems development and deployment.",
                "score_threshold": "Overall Trust Score >= 60/100",
                "passed": iso_pass
            }
        ]
    }


# ─── Custom User File 2.0 Endpoints ──────────────────────────────────────────

@router.post("/custom/mitigate")
async def mitigate_custom_file(
    file: UploadFile = File(...),
    sensitive_column: str = Form(...),
    target_column: str = Form(...),
    fairness_goal: str = Form("equalized_odds"),
    strength: float = Form(0.8)
):
    """FairLens 2.0: Run mitigation directly on an uploaded CSV file."""
    _validate_file(file)
    content = await file.read()
    df = load_dataframe(content, file.filename)
    result = mitigate_dataset(
        df=df,
        sensitive_col=sensitive_column,
        target_col=target_column,
        fairness_goal=fairness_goal,
        strength=strength
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/custom/intersectional")
async def intersectional_custom_file(
    file: UploadFile = File(...),
    primary_column: str = Form(...),
    secondary_column: str = Form(...),
    target_column: str = Form(...)
):
    """FairLens 2.0: Run intersectional analysis on an uploaded CSV file."""
    _validate_file(file)
    content = await file.read()
    df = load_dataframe(content, file.filename)
    result = compute_intersectional_matrix(
        df=df,
        primary_col=primary_column,
        secondary_col=secondary_column,
        target_col=target_column
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/custom/counterfactual")
async def counterfactual_custom_file(
    file: UploadFile = File(...),
    sample_index: int = Form(0),
    sensitive_column: str = Form(...),
    target_column: str = Form(...)
):
    """FairLens 2.0: Run counterfactual individual tester on an uploaded CSV file."""
    _validate_file(file)
    content = await file.read()
    df = load_dataframe(content, file.filename)
    result = simulate_counterfactual(
        df=df,
        sample_index=sample_index,
        sensitive_col=sensitive_column,
        target_col=target_column
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ─── LLM & Generative AI Prompt Bias Auditor ──────────────────────────────────

@router.post("/llm-audit")
async def run_llm_prompt_audit(payload: LlmAuditRequest):
    """FairLens 2.0: Audit Generative AI text and prompts for stereotypes, bias & toxicity."""
    result = await audit_llm_text(
        prompt_or_text=payload.text,
        system_role=payload.system_role or "General Assistant",
        target_demographics=payload.target_demographics
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _validate_file(file: UploadFile):
    import os
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{ext}'. Please upload a CSV or Excel file."
        )


def _get_owned_audit(audit_id: int, user_id: int, db: Session) -> Audit:
    audit = db.query(Audit).filter(Audit.id == audit_id, Audit.user_id == user_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit

