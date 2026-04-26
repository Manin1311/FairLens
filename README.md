<h1 align="center">🔍 FairLens — AI Bias Auditing Platform</h1>

<p align="center">
  <strong>Making AI Fair for Everyone</strong><br/>
  Detect, measure, and fix hidden bias in AI systems — powered by Google Gemini
</p>

<p align="center">
  <a href="https://fairlens-unbiasedai.onrender.com"><strong>🌐 Live Demo</strong></a> ·
  <a href="https://fairlens-unbiasedai.onrender.com/demo"><strong>⚡ Try Without Login</strong></a> 
</p>

---

## 🎯 The Problem

AI systems used in **hiring, lending, criminal justice, and healthcare** are making biased decisions that discriminate against real people — and most organizations don't even know it.

| Real-World Case | What Happened |
|---|---|
| **COMPAS (US Courts)** | Black defendants rated HIGH risk at 2× the rate of white defendants |
| **Amazon Hiring AI** | Algorithm penalized resumes containing "women's" — 57% score penalty |
| **Healthcare AI** | Black patients 41% less likely to be correctly identified as high-need |

**83% of HR AI tools show gender bias.** These aren't hypothetical — these are documented cases.

---

## 💡 Our Solution

FairLens is a **full-stack AI-powered platform** that makes bias auditing accessible to everyone — **no ML expertise required**.

```
Upload CSV → 4 Fairness Metrics in 60s → Gemini AI Explains in Plain English → PDF Report
```

### ✨ Key Features

| Feature | Description |
|---|---|
| 🔍 **One-Click Bias Audit** | Upload any CSV → get DPD, EOD, DIR, Cramér's V metrics instantly |
| 🤖 **Gemini AI Explanations** | Plain-English verdict, key findings, who's affected, fix suggestions |
| ⚖️ **Legal Compliance** | Auto-checks against EU AI Act, EEOC 4/5 Rule, ISO 42001 |
| 📄 **PDF Audit Reports** | Professional downloadable reports for compliance teams |
| 🌐 **10 Language Support** | Re-generate analysis in Hindi, Spanish, Arabic, French & more |
| 💬 **Ask Gemini Q&A** | Interactive chat — ask questions about your audit results |
| 🎯 **What-If Simulator** | Remove attributes & see fairness score change in real-time |
| 🔗 **Shareable Audit Links** | Make any audit public with one click — no login needed to view |
| ⚡ **No-Login Live Demo** | Try 3 real datasets instantly — COMPAS, Adult Income, German Credit |
| 🔐 **Google Sign-In** | One-click OAuth 2.0 authentication |
| 🌗 **Dark/Light Theme** | Full theme support across the dashboard |
| 📱 **Mobile Responsive** | Works seamlessly on desktop, tablet, and mobile |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                     │
│  Landing · Dashboard · Audit Results · Demo · Auth Pages     │
│  Tailwind CSS · Framer Motion · Recharts                     │
│                    Deployed on Render                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (Axios)
┌──────────────────────▼──────────────────────────────────────┐
│                   BACKEND (FastAPI Python)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │Auth      │  │Audit     │  │Report    │  │Gemini       │ │
│  │Router    │  │Router    │  │Router    │  │Service      │ │
│  │JWT+OAuth │  │Bias Eng. │  │PDF Gen.  │  │Multi-Key    │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
│                    Deployed on Render                         │
└───────┬─────────────────────────────────┬───────────────────┘
        │                                 │
┌───────▼───────────┐          ┌──────────▼──────────────────┐
│  Neon PostgreSQL  │          │  Google Gemini 2.5 Flash    │
│  (Cloud Database) │          │  (AI Analysis + Multi-Key)  │
└───────────────────┘          └─────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 + TypeScript + Tailwind CSS |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Backend** | FastAPI (Python 3.11) |
| **AI Service** | Google Gemini 2.5 Flash (multi-key rotation) |
| **Bias Analysis** | fairlearn + pandas + scikit-learn + scipy |
| **Auth** | JWT (python-jose + bcrypt) + Google OAuth 2.0 |
| **Database** | Neon PostgreSQL (Cloud) / SQLite (local) |
| **PDF Reports** | ReportLab |
| **Deployment** | Render (Singapore region) |

### Google Technologies Used
- ✅ **Google Gemini 2.5 Flash** — AI-powered bias explanations, fix suggestions, Q&A chat, multi-language support
- ✅ **Google Sign-In (OAuth 2.0)** — One-click authentication
- ✅ **Cloud Deployment** — Fully deployed and live on Render

---

## 📊 Fairness Metrics Explained

| Metric | Fair Threshold | What It Measures |
|---|---|---|
| **Demographic Parity Diff. (DPD)** | < 0.10 | Gap in positive decision rates between groups |
| **Equalized Odds Diff. (EOD)** | < 0.10 | Gap in error rates (false positives/negatives) between groups |
| **Disparate Impact Ratio (DIR)** | > 0.80 | 80% rule — EEOC 4/5 Rule from US employment law |
| **Cramér's V (Bias Attribution)** | — | How strongly each attribute drives unequal outcomes |

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### 1. Clone & Setup Backend

```bash
git clone https://github.com/Manin1311/Exceptional_Duo.git
cd Exceptional_Duo/backend
pip install -r requirements.txt
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux
```

### 2. Configure API Keys

Edit `backend/.env`:

```env
GEMINI_API_KEY=your_primary_key_here
GEMINI_API_KEY_1=your_second_key_here   # optional, for rotation
SECRET_KEY=any-long-random-string
DATABASE_URL=sqlite:///./fairlens.db
ALLOWED_ORIGINS=http://localhost:3000
```

> 💡 Multiple API keys enable automatic rotation when one hits rate limits.

### 3. Start Backend

```bash
uvicorn main:app --reload --port 8000
```

### 4. Start Frontend

```bash
cd ../frontend
npm install
npm run dev
```

### 5. Open in Browser

| URL | Page |
|---|---|
| http://localhost:3000 | Landing page |
| http://localhost:3000/demo | Live demo (no login needed) |
| http://localhost:3000/register | Create account |
| http://localhost:3000/dashboard | Audit dashboard |


---



---

## 📁 Project Structure

```
Exceptional_Duo/
├── frontend/                  # Next.js 16 + TypeScript
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── dashboard/         # Audit dashboard
│   │   ├── demo/              # No-login demo page
│   │   └── audit/
│   │       ├── new/           # New audit wizard
│   │       ├── [id]/          # Audit results (authenticated)
│   │       └── public/[id]/   # Shared public audit view
│   └── lib/
│       ├── api.ts             # Axios API client
│       ├── auth-context.tsx   # Auth provider
│       └── wake-up.tsx        # Backend wake-up ping
├── backend/                   # FastAPI Python
│   ├── main.py                # App entry point
│   ├── Dockerfile             # Docker build
│   ├── requirements.txt       # Python dependencies
│   ├── routers/
│   │   ├── auth.py            # JWT + Google OAuth
│   │   ├── audit.py           # Bias analysis + demo + share
│   │   └── report.py          # PDF report generation
│   ├── services/
│   │   ├── gemini_service.py  # Gemini AI (multi-key rotation)
│   │   └── bias_engine.py     # Fairness metrics engine
│   ├── models/
│   │   ├── database.py        # SQLAlchemy models
│   │   └── schemas.py         # Pydantic schemas
│   └── demo_datasets/         # Pre-loaded CSV datasets
│       ├── compas.csv
│       ├── adult_income.csv
│       └── german_credit.csv
└── render.yaml                # Render deployment blueprint
```

---

## 🔮 Future Roadmap

- 🔄 **Auto-Mitigation** — Automatically rebalance datasets to reduce bias
- 📊 **CI/CD API** — REST API for pipeline integration (audit before deploy)
- 👥 **Team Workspaces** — Multi-user organizations with role-based access
- 📈 **Bias Monitoring** — Track fairness scores over time
- 🧠 **NLP & Image Bias** — Extend beyond tabular data
- 🏛️ **More Regulations** — India DPDP Act, Canada AIDA

---

