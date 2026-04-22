import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
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
    file: UploadFile = File(...),
    name: str = Form(...),
    sensitive_columns: str = Form(...),   # JSON string e.g. '["gender","age"]'
    target_column: str = Form(...),
    prediction_column: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload CSV, run full bias analysis, get Gemini explanation and fix suggestions."""
    _validate_file(file)
    content = await file.read()
    df = load_dataframe(content, file.filename)

    try:
        sensitive_cols: List[str] = json.loads(sensitive_columns)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="sensitive_columns must be a valid JSON array")

    # ── Run bias engine ──────────────────────────────────────────────────────
    analysis = run_full_analysis(df, sensitive_cols, target_column, prediction_column)

    # ── Persist audit record ─────────────────────────────────────────────────
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
        status="processing"
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)

    # ── Call Gemini (explanation + fixes) ────────────────────────────────────
    try:
        explanation = await gemini_service.explain_bias_findings(analysis, file.filename)
        fixes = await gemini_service.generate_fix_suggestions(analysis)
        report_summary = await gemini_service.generate_report_summary(analysis, name)
        fixes_json = json.dumps(fixes)
    except Exception as e:
        explanation = f"Gemini explanation unavailable: {str(e)}"
        fixes_json = "[]"
        report_summary = ""

    # ── Save results ─────────────────────────────────────────────────────────
    result = AuditResult(
        audit_id=audit.id,
        raw_analysis=json.dumps(analysis),
        gemini_explanation=explanation,
        fix_suggestions=fixes_json,
        report_summary=report_summary
    )
    db.add(result)
    audit.status = "complete"
    db.commit()
    db.refresh(audit)

    return audit


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
        "created_at": audit.created_at,
        "raw_analysis": json.loads(result.raw_analysis) if result else None,
        "gemini_explanation": result.gemini_explanation if result else None,
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
@router.post("/demo/{dataset_name}")
async def run_demo(dataset_name: str):
    """
    Run a demo analysis on a pre-loaded dataset.
    Available: compas | adult_income | german_credit
    """
    import os
    demo_path = f"demo_datasets/{dataset_name}.csv"
    if not os.path.exists(demo_path):
        raise HTTPException(status_code=404, detail=f"Demo dataset '{dataset_name}' not found")

    import pandas as pd
    df = pd.read_csv(demo_path)
    sensitive_cols = detect_sensitive_columns(df)
    target_col = detect_target_column(df)
    analysis = run_full_analysis(df, sensitive_cols, target_col)

    try:
        explanation = await gemini_service.explain_bias_findings(analysis, f"{dataset_name} dataset")
        fixes = await gemini_service.generate_fix_suggestions(analysis)
    except Exception:
        explanation = "Gemini explanation unavailable in demo mode."
        fixes = []

    return {
        "dataset": dataset_name,
        "columns": list(df.columns),
        "sensitive_columns": sensitive_cols,
        "target_column": target_col,
        "analysis": analysis,
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
