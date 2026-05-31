# 🩻 XRayVision AI

**AI-Powered Radiology Assistant** — A full-stack medical diagnostic platform using a Hybrid Multi-Model Ensemble for automated X-ray analysis, clinical reporting, and healthcare support.

> ⚠️ **Educational Platform** — This is an AI-assisted educational tool. Not a certified medical device or substitute for professional radiological evaluation.

---

## ✨ Features

### Core Diagnostics
- **Chest Pathology Detection** — DenseNet121 trained on CheXpert/NIH for 18 pathology labels
- **Fracture Detection** — YOLOv8 object detection with custom-trained weights + HuggingFace image-level classifier (two-stage pipeline)
- **Wound Classification** — ViT-based classifier for external wound categorization
- **AI Agent Synthesis** — OpenRouter GLM 4.5 Air generates structured clinical reports with urgency classification, recommended actions, and specialist referrals

### Platform Features
- **Dashboard** — Aggregated statistics, recent scans, finding distribution, model performance metrics
- **Scan History** — Full CRUD with filtering, PDF report export (branded A4), and JSON export
- **Health Chatbot** — AI-powered medical Q&A with session history and multi-language support (English/Urdu)
- **Diet Plan Generator** — Condition-based personalized meal plans with nutritional guidance
- **Nearby Clinic Finder** — GPS-based hospital/clinic search using OpenStreetMap Overpass API
- **User Profiles** — Role-based profiles with avatar, usage statistics, and customizable settings
- **Theme Support** — Light, dark, and system-auto modes with persistence

---

## 🏗 Architecture

```
┌─────────────────────────┐     ┌─────────────────────────────┐
│    Frontend (React)     │     │    Backend (FastAPI)         │
│  TanStack Start + Vite  │────▶│  Multi-Model AI Pipeline    │
│  Tailwind CSS + Radix   │     │  OpenRouter LLM Agent       │
│  Vercel Deployment      │     │  Supabase Integration       │
└─────────────────────────┘     │  Docker / Render / HF Spaces│
                                └──────────┬──────────────────┘
                                           │
                         ┌─────────────────┼─────────────────┐
                         │                 │                 │
                    ┌────▼────┐     ┌──────▼─────┐   ┌──────▼──────┐
                    │Supabase │     │ OpenRouter  │   │  HuggingFace│
                    │Auth + DB│     │  GLM 4.5    │   │  Models     │
                    │+ Storage│     │  (Agentic)  │   │  (ViT, etc) │
                    └─────────┘     └────────────┘   └─────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18 (or Bun)
- **Python** ≥ 3.11
- **Supabase** account (free tier works)
- **OpenRouter** API key (free models available)
- **HuggingFace** token (for model downloads)

### 1. Frontend Setup

```bash
# Install dependencies
npm install   # or: bun install

# Configure environment
# Edit .env with your Supabase URL and anon key
# VITE_API_URL should point to your backend

# Start dev server
npm run dev
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your Supabase, OpenRouter, and HuggingFace keys

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 3. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run `backend/supabase_schema.sql` in the SQL Editor
3. Create a storage bucket named `xray-images`
4. Copy the project URL and keys into your `.env` files

---

## 📡 API Documentation

Once the backend is running:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Key Endpoints

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/auth/register` | POST | Create account | — |
| `/auth/login` | POST | Sign in | — |
| `/auth/forgot-password` | POST | Password reset email | — |
| `/analyze` | POST | Upload & analyze image | 10/min |
| `/scans` | GET | List scan history | — |
| `/scans/{id}/report.pdf` | GET | Download PDF report | — |
| `/chat` | POST | Health chatbot message | 20/min |
| `/diet` | POST | Generate diet plan | 10/min |
| `/clinics` | GET | Find nearby clinics | — |
| `/stats` | GET | Dashboard statistics | — |

---

## 🤖 AI Models

| Model | Task | Input | Output |
|-------|------|-------|--------|
| TorchXRayVision DenseNet121 | Chest Pathology | 224×224 grayscale | 18 pathology probabilities |
| YOLOv8 (custom-trained) | Fracture Localization | Any size RGB | Bounding boxes with confidence |
| HF Fracture Classifier | Fracture Screening | 224×224 RGB | Image-level fracture probability |
| HF Wound Classifier | Wound Classification | 224×224 RGB | Classification labels |
| OpenRouter GLM 4.5 Air | Agentic Synthesis | Model outputs + notes | Structured diagnostic report |

---

## 🚢 Deployment

### Frontend → Vercel
```bash
npm run build
# Deploy via Vercel CLI or GitHub integration
# Set VITE_API_URL to your backend URL
```

### Backend → Docker (HuggingFace Spaces / Render)
```bash
cd backend
docker build -t xrayvision-backend .
docker run -p 7860:7860 --env-file .env xrayvision-backend
```

A `render.yaml` is included for one-click Render deployment.

---

## 📁 Project Structure

```
x-ray-vision-board/
├── src/                    # Frontend source
│   ├── components/         # React components
│   │   ├── app/           # App shell, auth shell
│   │   ├── landing/       # Landing page + 3D scene
│   │   ├── ui/            # shadcn/ui primitives
│   │   └── ui-x/          # Custom UI extensions
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # API client, auth context, types
│   ├── routes/            # TanStack file-based routes
│   └── styles.css         # Global styles + design tokens
├── backend/               # Python FastAPI backend
│   ├── app/
│   │   ├── main.py        # App entry point + CORS + rate limiting
│   │   ├── config.py      # Pydantic settings from env
│   │   ├── models/        # Pydantic schemas
│   │   ├── routers/       # API route handlers
│   │   ├── services/      # AI models, chatbot, diet, auth
│   │   └── utils/         # Supabase client helpers
│   ├── models/            # Trained model weights (.pt)
│   ├── Dockerfile         # Docker deployment
│   └── supabase_schema.sql
├── vercel.json            # Frontend deployment config
├── render.yaml            # Backend deployment config
└── package.json           # Frontend dependencies
```

---

## 🔒 Security Notes

- All API endpoints (except health checks and auth) require JWT authentication
- Rate limiting is enforced on expensive AI endpoints (`/analyze`, `/chat`, `/diet`)
- CORS is locked to the configured frontend domain in production
- Row-Level Security (RLS) is enforced on all Supabase tables
- JWT secrets are validated on startup — the server refuses to start with the default value

---

## 📄 License

Educational project — Minhaj University Lahore | BSSE 8th Semester | FYP May 2026
