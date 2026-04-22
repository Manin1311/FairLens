from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fairlens.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    organization = Column(String, default="")
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    audits = relationship("Audit", back_populates="owner", cascade="all, delete")


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    dataset_name = Column(String, default="")
    total_rows = Column(Integer, default=0)
    total_columns = Column(Integer, default=0)
    sensitive_columns = Column(Text, default="[]")   # JSON string
    target_column = Column(String, default="")
    prediction_column = Column(String, default="")
    overall_risk = Column(String, default="UNKNOWN")
    overall_score = Column(Integer, default=0)
    status = Column(String, default="pending")        # pending | complete | error
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="audits")
    result = relationship("AuditResult", back_populates="audit", uselist=False, cascade="all, delete")


class AuditResult(Base):
    __tablename__ = "audit_results"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    raw_analysis = Column(Text, default="{}")         # Full JSON from bias engine
    gemini_explanation = Column(Text, default="")
    fix_suggestions = Column(Text, default="[]")      # JSON array
    report_summary = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    audit = relationship("Audit", back_populates="result")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
