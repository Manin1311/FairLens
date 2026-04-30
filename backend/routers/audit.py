import json
import asyncio
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from sqlalchemy.orm import Session
from models.database import get_db, User, Audit, AuditResult
from models.schemas import (
    AuditOut, AuditDetailOut, ColumnDetectOut, ChatRequest, ChatResponse
)
from services.bias_engine import (
    load_dataframe, detect_sensitive_columns,
    detect_target_column, run_full_analysis
)
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

    # Save bias results immediately so the page can render
    result = AuditResult(
        audit_id=audit.id,
        raw_analysis=json.dumps(analysis),
        gemini_explanation="{}",
        fix_suggestions="[]",
        report_summary=""
    )
    db.add(result)
    db.commit()

    # ── Phase 2: Gemini in background (user already gets the page) ───────────
    background_tasks.add_task(
        _enrich_with_gemini, audit.id, analysis, file.filename, language
    )

    return audit


async def _enrich_with_gemini(audit_id: int, analysis: dict, dataset_name: str, language: str):
    """Background task: runs Gemini calls and updates the audit result in DB."""
    from models.database import SessionLocal
    db = SessionLocal()
    try:
        explanation_dict, fixes, report_summary = await asyncio.gather(
            gemini_service.explain_bias_findings(analysis, dataset_name, language),
            gemini_service.generate_fix_suggestions(analysis),
            gemini_service.generate_report_summary(analysis, dataset_name, language),
        )
        result = db.query(AuditResult).filter(AuditResult.audit_id == audit_id).first()
        audit  = db.query(Audit).filter(Audit.id == audit_id).first()
        if result and audit:
            result.gemini_explanation = json.dumps(explanation_dict)
            result.fix_suggestions    = json.dumps(fixes)
            result.report_summary     = report_summary
            audit.status              = "complete"
            db.commit()
    except Exception as e:
        import traceback; traceback.print_exc()
        print(f"[BG Gemini error for audit {audit_id}]: {e}")
        # Still mark complete so UI doesn't poll forever
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
