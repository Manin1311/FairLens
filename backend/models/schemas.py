from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ─── Auth ────────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    name: str
    organization: Optional[str] = ""
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    organization: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ─── Audit ───────────────────────────────────────────────────────────────────
class AuditConfigRequest(BaseModel):
    name: str
    sensitive_columns: List[str]
    target_column: str
    prediction_column: Optional[str] = None

class GroupStat(BaseModel):
    count: int
    positive_rate: float
    accuracy: float

class AttributeResult(BaseModel):
    sensitive_column: str
    demographic_parity_difference: Optional[float] = None
    equalized_odds_difference: Optional[float] = None
    disparate_impact_ratio: Optional[float] = None
    risk_level: Optional[str] = None
    fairness_score: Optional[int] = None
    group_statistics: Optional[dict] = None
    groups_analyzed: Optional[List[str]] = None
    error: Optional[str] = None

class AnalysisResult(BaseModel):
    overall_fairness_score: int
    overall_risk_level: str
    total_rows: int
    columns_analyzed: int
    attribute_results: List[AttributeResult]

class FixSuggestion(BaseModel):
    title: str
    priority: str
    description: str
    expected_impact: str
    effort: str

class AuditOut(BaseModel):
    id: int
    name: str
    dataset_name: str
    total_rows: int
    overall_risk: str
    overall_score: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class AuditDetailOut(AuditOut):
    sensitive_columns: str
    target_column: str
    raw_analysis: Optional[str] = None
    gemini_explanation: Optional[str] = None
    fix_suggestions: Optional[str] = None

class ColumnDetectOut(BaseModel):
    columns: List[str]
    detected_sensitive: List[str]
    detected_target: str

class ChatRequest(BaseModel):
    question: str
    audit_id: int

class ChatResponse(BaseModel):
    answer: str
