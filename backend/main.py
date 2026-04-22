from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.database import Base, engine
from routers import auth, audit, report
import os
from dotenv import load_dotenv

load_dotenv()

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FairLens API",
    description="AI Bias Detection & Auditing Platform — Making AI Fair for Everyone",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS — allow Next.js frontend
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
allowed_origins = [o.strip() for o in allowed_origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,   prefix="/api/auth",   tags=["Authentication"])
app.include_router(audit.router,  prefix="/api/audit",  tags=["Audit"])
app.include_router(report.router, prefix="/api/report", tags=["Report"])


@app.get("/", tags=["Health"])
def root():
    return {
        "app": "FairLens",
        "tagline": "Making AI Fair for Everyone",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
