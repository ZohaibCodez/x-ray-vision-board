# 🩻 XRayVision AI — Complete Project Context

> **For:** Developers, contributors, supervisors, and anyone who wants to deeply understand this project.
> **Project Type:** Final Year Project (FYP) — BSSE 8th Semester, Minhaj University Lahore (May 2026)
> **Team:** Muhammad Ali Raza & Hamza Afzal | **Supervisor:** Maam Misbah

---

## 1. What Is This Project?

**XRayVision AI** is a full-stack, AI-powered **medical diagnostic web application**. It allows medical students, radiologists, and healthcare professionals to:

1. **Upload** a medical image (chest X-ray, bone X-ray, or wound photo)
2. **Receive** an AI-generated diagnostic report in seconds
3. **View** findings with bounding boxes, ICD-10 codes, and clinical urgency ratings
4. **Chat** with a bilingual (English + Urdu) AI health assistant
5. **Generate** a personalized 7-day diet plan
6. **Find** nearby clinics using GPS
7. **Download** PDF or JSON reports of any scan

> WARNING: Educational Platform Only. This is NOT a certified medical device. It must NOT be used for real clinical diagnosis.

---

## 2. High-Level Architecture

```
+------------------------------------------------------+
|               FRONTEND (React 19)                    |
|  TanStack Start + Router + Query  |  TailwindCSS     |
|  Shadcn/Radix UI  |  TypeScript   |  Vite            |
|        Deployed → Cloudflare Workers                  |
+----------------------+-------------------------------+
                       |  HTTPS + JWT Bearer Token
+----------------------v-------------------------------+
|               BACKEND (FastAPI, Python 3.13)         |
|  POST /analyze  |  POST /chat  |  POST /diet         |
|  GET /scans     |  GET /stats  |  GET /clinics        |
|        Deployed → Hugging Face Spaces (Docker)        |
+------+----------+------------+----------+------------+
       |          |            |          |
  +----v----+ +---v----+ +----v---+ +-----v-----------+
  |DenseNet | |YOLOv8  | |  ViT   | | OpenRouter      |
  |   121   | |Fracture| | Wound  | | GLM 4.5 Air     |
  |18 chest | | bbox   | |6 class | | (LLM Synthesis) |
  | labels  | | detect | | wound  | |                 |
  +---------+ +--------+ +--------+ +-----------------+
       |                                    |
  +----v------------------------------------v----------+
  |                   SUPABASE                         |
  |  PostgreSQL (scans, profiles, chat_sessions,       |
  |  chat_messages)  |  Storage (X-ray images, avatars)|
  +----------------------------------------------------+
```

---

## 3. What Problem Does It Solve?

Traditional medical imaging analysis requires:
- A trained radiologist (expensive, rare in rural areas)
- Slow turnaround times
- High cost for the patient

XRayVision AI provides **instant, AI-assisted preliminary analysis** to:
- Help **medical students** learn pattern recognition
- Give **healthcare professionals** a second-opinion tool
- Support **rural healthcare** where specialist access is limited

---

## 4. Full Tech Stack

### 4.1 Frontend Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.x | Core UI framework |
| TypeScript | 5.x | Type safety across all frontend code |
| TanStack Start | 1.167.x | Full-stack React framework (SSR + file-based routing) |
| TanStack Router | 1.168.x | File-based routing (routes/*.tsx = pages) |
| TanStack Query | 5.83.x | Server state management (data fetching, caching, mutations) |
| TailwindCSS | 4.x | Utility-first CSS styling |
| Shadcn/ui | Latest | Pre-built accessible components (buttons, dialogs, cards, etc.) |
| Radix UI | Various | Headless, accessible primitives behind Shadcn |
| Lucide React | 0.575.x | Icon library |
| Recharts | 2.15.x | Dashboard charts and graphs |
| React Hook Form | 7.71.x | Form state management |
| Zod | 3.24.x | Runtime form validation schemas |
| Three.js + R3F | 0.171.x | 3D rendering (used in landing page animations) |
| Sonner | 2.x | Toast notification system |
| Vite | 7.x | Build tool and dev server |
| @cloudflare/vite-plugin | 1.25.x | Cloudflare Workers integration |

### 4.2 Backend Stack

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.13 | Backend language |
| FastAPI | 0.115.6 | Async REST API framework with auto Swagger docs |
| Uvicorn | 0.32.1 | ASGI server to run FastAPI |
| Pydantic v2 | 2.10.3 | Data validation, request/response schemas |
| Pydantic Settings | 2.7.0 | Environment variable management via .env |
| slowapi | 0.1.9 | Rate limiting (10/min for AI, 200/min global) |

### 4.3 AI / Machine Learning Stack

| Technology | Version | Purpose |
|---|---|---|
| PyTorch | >= 2.6.0 | Deep learning framework for DenseNet + ViT |
| TorchXRayVision | >= 1.3.0 | Pre-trained DenseNet121 model on 700K+ clinical X-rays |
| Ultralytics YOLOv8 | >= 8.3.0 | Real-time object detection for fracture localization |
| HuggingFace Transformers | >= 4.45.0 | ViT wound classifier (AutoModelForImageClassification) |
| OpenRouter (GLM 4.5 Air) | API | LLM for clinical report synthesis and chatbot |
| OpenCV | >= 4.10.0 | Image loading, CLAHE preprocessing, DICOM support |
| Pillow (PIL) | >= 11.0.0 | Python image manipulation library |
| PyDICOM | >= 3.0.1 | Standard medical DICOM file format support |
| NumPy | >= 1.26.0 | Numerical arrays for image processing |
| scikit-image | >= 0.24.0 | Additional image processing utilities |

### 4.4 Database & Storage Stack

| Technology | Purpose |
|---|---|
| Supabase (PostgreSQL) | Relational database for users, scans, chat history |
| Supabase Storage | Cloud object storage for uploaded X-ray images and avatars |
| Supabase Row Level Security (RLS) | Users can only see their own data |
| supabase-py | Python client library for all DB/storage operations |

### 4.5 Auth Stack

| Technology | Purpose |
|---|---|
| Supabase Auth | User registration, login, password reset (email-based) |
| python-jose | JWT token creation and verification (HS256, 24-hour expiry) |
| passlib + bcrypt | Password hashing |

### 4.6 Reporting & Export Stack

| Technology | Purpose |
|---|---|
| ReportLab | Python PDF generation for scan reports |
| JSON export | Raw findings export as structured JSON |

### 4.7 Deployment Stack

| Component | Platform | Notes |
|---|---|---|
| Frontend | Cloudflare Workers | Edge-deployed React SPA |
| Backend API | Hugging Face Spaces | Dockerized FastAPI on free GPU/CPU tier |
| Database | Supabase (managed) | Free tier PostgreSQL |
| Image Storage | Supabase Storage | CDN-served image buckets |
| AI Models | HuggingFace Hub | Downloaded at container start |

---

## 5. Project Structure Explained

```
x-ray-vision-board/
|
+-- src/                          <- FRONTEND (React 19 + TypeScript)
|   +-- routes/                   <- Each file = one page (file-based routing)
|   |   +-- __root.tsx            <- Root layout wrapper (auth check, AppShell)
|   |   +-- index.tsx             <- Redirects to /dashboard or /auth/login
|   |   +-- auth.login.tsx        <- Login page
|   |   +-- auth.register.tsx     <- Register page
|   |   +-- dashboard.tsx         <- Analytics dashboard (charts, stats)
|   |   +-- analyze.tsx           <- IMAGE UPLOAD PAGE (core feature)
|   |   +-- results.$scanId.tsx   <- Scan results with bounding box overlays
|   |   +-- history.tsx           <- Full scan history list
|   |   +-- chat.tsx              <- AI health chatbot (EN + UR)
|   |   +-- diet.tsx              <- 7-day diet plan generator
|   |   +-- clinics.tsx           <- GPS clinic locator
|   |   +-- profile.tsx           <- User profile management
|   |   +-- settings.tsx          <- App settings
|   |
|   +-- components/
|   |   +-- app/                  <- AppShell layout (sidebar + header)
|   |   +-- landing/              <- Landing page sections
|   |   +-- ui/                   <- 50+ Shadcn/Radix UI components
|   |
|   +-- hooks/
|   |   +-- use-analyze.ts        <- TanStack Query mutation for POST /analyze
|   |   +-- use-scans.ts          <- Query hooks for scan list + stats
|   |   +-- use-chat.ts           <- Query hooks for chatbot sessions
|   |
|   +-- lib/
|       +-- api.ts                <- Central HTTP client (ALL API calls go here)
|       +-- auth-context.tsx      <- Global auth state (useAuth hook)
|       +-- types.ts              <- All TypeScript interfaces matching backend schemas
|
+-- backend/                      <- BACKEND (Python 3.13 + FastAPI)
    +-- app/
    |   +-- main.py               <- App bootstrap: CORS, rate limiting, model preloading
    |   +-- config.py             <- Pydantic Settings (reads .env file)
    |   |
    |   +-- models/
    |   |   +-- schemas.py        <- All Pydantic request/response models
    |   |
    |   +-- routers/              <- API endpoint handlers
    |   |   +-- analyze.py        <- POST /analyze (CORE AI PIPELINE)
    |   |   +-- auth.py           <- Authentication endpoints
    |   |   +-- scans.py          <- Scan CRUD + PDF/JSON export
    |   |   +-- chat.py           <- Chatbot endpoints
    |   |   +-- diet.py           <- Diet plan endpoint
    |   |   +-- stats.py          <- Dashboard metrics
    |   |   +-- clinics.py        <- GPS clinic search
    |   |
    |   +-- services/             <- Business logic and AI model wrappers
    |   |   +-- image_preprocess.py  <- CLAHE, resize, DICOM decode, validation
    |   |   +-- chest_model.py       <- DenseNet121 inference wrapper
    |   |   +-- fracture_model.py    <- YOLOv8 inference wrapper
    |   |   +-- wound_model.py       <- ViT HuggingFace inference wrapper
    |   |   +-- openrouter_agent.py  <- LLM synthesis engine
    |   |   +-- openrouter_client.py <- HTTP client for OpenRouter API
    |   |   +-- chatbot_service.py   <- Health chatbot prompt + response parsing
    |   |   +-- diet_service.py      <- Diet plan prompt + guardrails + parsing
    |   |   +-- auth_service.py      <- JWT creation + verification
    |   |
    |   +-- utils/
    |       +-- supabase_client.py   <- All Supabase DB + Storage operations
    |
    +-- models/                   <- AI model weight files (not in git)
    |   +-- fracture_yolov8.pt    <- Custom-trained YOLOv8 fracture weights
    |
    +-- supabase_schema.sql       <- Database schema
    +-- requirements.txt          <- Python dependencies
    +-- Dockerfile                <- Docker build for Hugging Face Spaces
```

---

## 6. How the Core Analysis Pipeline Works (Step-by-Step)

### Step 1 — Frontend Upload (analyze.tsx)
```
User selects image + scan type (chest/fracture/wound)
React Hook Form validates input
analyzeApi.submit() in api.ts sends multipart/form-data POST to /analyze
JWT token attached in Authorization header
```

### Step 2 — Backend Receives (routers/analyze.py)
```
FastAPI validates JWT → extracts user_id
File bytes read → validate_image_file() checks:
  - Size: 100 KB minimum, 20 MB maximum
  - Format: JPEG/PNG/DICOM decodable
  - Resolution: at least 200x200 px
```

### Step 3 — Image Preprocessing (services/image_preprocess.py)
```
For CHEST:
  1. BGR → Grayscale
  2. CLAHE (contrast enhancement for X-ray detail)
  3. Resize to 224x224
  4. Normalize to [-1024, 1024] range (TorchXRayVision standard)
  5. Shape: (1, 1, 224, 224) numpy array

For FRACTURE:
  1. BGR → LAB color space
  2. CLAHE on L (luminance) channel only
  3. Merge back to BGR
  4. Full-size image (YOLO resizes internally to 960px)

For WOUND:
  1. PIL Image → RGB conversion
  2. ViT processor handles normalization internally
```

### Step 4 — Routed AI Model Inference (_run_routed_ensemble())
```
scan_type = "chest"    → DenseNet121 only
scan_type = "fracture" → YOLOv8 only (+ optional HF fracture classifier)
scan_type = "wound"    → ViT WoundClassifier only

All models run asynchronously via asyncio.to_thread()
```

### Step 5 — Model Inference Details

#### DenseNet121 (Chest)
```
model = torchxrayvision.models.DenseNet(weights="densenet121-res224-all")
18 independent sigmoid outputs (NOT softmax — multi-label!)
Each output = probability of one pathology
Threshold: 60% (raised from global 40% to reduce noise)
Top 6 findings returned (sorted by confidence)
Each finding gets: name, confidence%, severity, ICD-10 code, region
```

#### YOLOv8 (Fracture Detection)
```
model = YOLO("models/fracture_yolov8.pt")  (custom-trained weights)
Detects bounding boxes around fractures
bbox stored as % of image dimensions (for frontend overlay)
Classes: Fracture Detected, Bone Anomaly, Foreign Body, etc.
If no boxes found: returns "No fracture box localized" (not proof of no fracture)
```

#### ViT Wound Classifier (Wound)
```
model = AutoModelForImageClassification.from_pretrained(
    "PayamFard123/dermaintel-wound-classifier"
)
7-class softmax: pressure ulcer, venous ulcer, arterial ulcer,
  diabetic ulcer, surgical wound, traumatic wound, normal_skin
Top-1 prediction always shown (softmax guarantees most-likely class)
Secondary classes shown if > 15% confidence
```

### Step 6 — LLM Synthesis (services/openrouter_agent.py)
```
synthesize_report(findings, scan_type, patient_notes)
→ Builds a structured clinical prompt
→ Calls OpenRouter API: GLM 4.5 Air (z-ai/glm-4.5-air:free)
   - temperature=0.1 (very deterministic — consistent medical output)
   - max_tokens=1400
→ Parses JSON response: urgency, synthesis_text, recommended_actions[], specialist
→ Safety checks:
   - If LLM says "clear" but findings have >70% confidence → escalate to "medium"
   - Cardiologist specialist only valid if cardiac finding >70% confidence
→ Fallback: if OpenRouter fails → deterministic rule-based synthesis
```

### Step 7 — Storage & Database
```
Image → uploaded to Supabase Storage (bucket: xray-images/{user_id}/{scan_id})
Scan record → inserted into Supabase PostgreSQL scans table
```

### Step 8 — Response to Frontend
```
ScanResult JSON returned with findings, urgency, synthesis, image_url
Frontend redirects to /results/{scanId}
Bounding boxes rendered as SVG overlays on the image
```

---

## 7. How the LLM (GLM 4.5 Air) Works in This Project

The LLM is the "brain" that reads raw model outputs and turns them into human-readable clinical reports. It is used in **3 places**:

### 7.1 Clinical Report Synthesis (openrouter_agent.py)

**Role:** Expert radiologist AI that reads structured model findings and writes a clinical paragraph.

**Input prompt includes:**
- Scan type (CHEST / FRACTURE / WOUND)
- All model findings with confidence%, severity, model name, region, ICD-10 codes
- Patient clinical notes (if provided)
- Strict rules: urgency classification, specialist selection, clinical disclaimers

**Output format (JSON):**
```json
{
  "urgency": "high",
  "synthesis_text": "The imaging reveals bilateral lung opacity consistent with pneumonia...",
  "recommended_actions": ["Urgent Pulmonologist consultation", "Order CBC and CRP", ...],
  "specialist": "Pulmonologist"
}
```

**Settings:** temperature=0.1 (deterministic), max_tokens=1400

### 7.2 Health Chatbot (chatbot_service.py)

**Role:** Bilingual (English + Urdu) virtual health assistant.

**How it works:**
- System prompt defines it as "XRayVision AI Health Assistant"
- Last 10 messages of conversation history passed as context
- User message appended
- Model responds with health guidance
- Response parsed to extract DOCTOR_TYPE: and HOME_REMEDIES: tags
- temperature=0.35 (slightly more creative than report synthesis)
- Supports two system prompts: English and Urdu

### 7.3 Diet Plan Generator (diet_service.py)

**Role:** Nutrition assistant that generates 7-day meal plans.

**How it works:**
- Takes patient condition (diabetes, hypertension, etc.), dietary preferences, restrictions, and goals
- Applies medical safety guardrails (no high-sodium for hypertension, no high-sugar for diabetes)
- Prompts LLM for a JSON-structured 7-day meal plan
- Validates completeness before returning to frontend

---

## 8. Database Schema

### Tables

| Table | Purpose | Key Columns |
|---|---|---|
| profiles | User accounts | id (UUID), full_name, role, avatar_url, settings (JSONB) |
| scans | Diagnostic records | id, user_id, scan_type, findings (JSONB), urgency, agent_synthesis |
| chat_sessions | Chatbot conversations | id, user_id, title |
| chat_messages | Individual messages | id, session_id, role (user/assistant), content |

### Key Design Decisions
- Row Level Security (RLS) on ALL tables — users can only query their own rows
- `findings` stored as JSONB — flexible for different scan types without schema changes
- `agent_actions` stored as JSONB array — list of recommended actions
- `model_results` as JSONB — stores which models ran, processing time, errors
- PostgreSQL trigger auto-creates a `profiles` row on Supabase auth.users insert

---

## 9. Security Architecture

| Layer | Implementation |
|---|---|
| Authentication | JWT HS256 tokens, 24-hour expiry |
| Authorization | Server verifies JWT on every protected endpoint via get_current_user_id dependency |
| Database | Supabase RLS — every query filtered by user_id = auth.uid() |
| Rate Limiting | slowapi: 200/min global, 10/min for /analyze, 20/min for /chat |
| CORS | Production: only configured frontend domain; Dev: localhost origins |
| Input Validation | Pydantic validates all request bodies; image validation before ML inference |
| Password Security | bcrypt hashing via passlib |

---

## 10. API Endpoints Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/register | No | Create account |
| POST | /auth/login | No | Login, returns JWT |
| POST | /auth/forgot-password | No | Password reset email |
| GET | /auth/me | Yes | Get current user |
| PATCH | /auth/profile | Yes | Update profile |
| POST | /auth/avatar | Yes | Upload avatar image |
| POST | /analyze | Yes | Core AI analysis (10/min limit) |
| GET | /scans | Yes | List scan history |
| GET | /scans/{id} | Yes | Get one scan |
| DELETE | /scans/{id} | Yes | Delete a scan |
| GET | /scans/{id}/report.pdf | Yes | Download PDF report |
| GET | /scans/{id}/export.json | Yes | Export raw JSON |
| POST | /chat | Yes | Send chatbot message (20/min limit) |
| GET | /chat/sessions | Yes | List chat sessions |
| POST | /diet | Yes | Generate diet plan |
| GET | /clinics | Yes | Find nearby clinics via GPS |
| GET | /stats | Yes | Dashboard statistics |
| GET | /health | No | Health check |

---

## 11. AI Models Summary

| Model | Source | Task | Input | Threshold |
|---|---|---|---|---|
| DenseNet121 | TorchXRayVision | 18 chest pathologies (multi-label sigmoid) | 224x224 grayscale, [-1024,1024] | 60% |
| YOLOv8 | Ultralytics (custom-trained) | Fracture bounding boxes + localization | BGR, 960px resize | 15% |
| ViT | PayamFard123/dermaintel-wound-classifier (HuggingFace) | 6 wound types classification | RGB PIL Image | Top-1 always shown |
| GLM 4.5 Air | OpenRouter (z-ai/glm-4.5-air:free) | Report synthesis, chatbot, diet plans | Structured text prompt | N/A |

### Chest Pathologies (DenseNet121 — 18 Labels)
Atelectasis, Cardiomegaly, Consolidation, Edema, Effusion, Emphysema, Fibrosis,
Hernia, Infiltration, Mass, Nodule, Pleural Thickening, Pneumonia, Pneumothorax,
Enlarged Cardiomediastinum, Lung Opacity, Lung Lesion, Fracture

### Wound Types (ViT — 6 Classes + 1 Normal)
Pressure Ulcer, Venous Ulcer, Arterial Ulcer, Diabetic Foot Ulcer,
Surgical Wound, Traumatic Wound, Normal Skin

---

## 12. Key Design Decisions & Why

| Decision | Reasoning |
|---|---|
| Routed ensemble (not combined) | DenseNet121 on an extremity X-ray gives nonsensical chest findings. YOLOv8 on a chest X-ray finds no meaningful fracture boxes. Route each scan type to its correct model. |
| DenseNet threshold raised to 60% | DenseNet uses independent sigmoids (multi-label). Near-threshold labels cluster together for diffuse pathologies. Raising to 60% removes low-signal noise. |
| YOLOv8 threshold lowered to 15% | Fracture detection favors sensitivity. We'd rather show a low-confidence fracture box for review than miss a subtle one. |
| LLM temperature = 0.1 for reports | Medical reports need consistency and accuracy, not creativity. Low temperature keeps the LLM deterministic and on-task. |
| Fallback synthesis | If OpenRouter API fails, a deterministic rule-based synthesis is used so the UI never breaks. |
| asyncio.to_thread() | PyTorch models are synchronous (CPU/GPU ops). Running them in a thread pool prevents blocking FastAPI's async event loop. |
| JWT over Supabase sessions | Gives full control over token validation on the backend without depending on Supabase's auth flow for every request. |
| JSONB for findings | Findings differ between scan types (chest has ICD codes, fracture has bboxes, wound has different labels). JSONB avoids complex table joins. |
| Model preloading in background thread | Loading PyTorch models can take 10-30 seconds. Background thread loading means the server accepts requests immediately while models load. |

---

## 13. How to Run Locally

### Prerequisites
- Node.js >= 18.x
- Python >= 3.11
- Supabase project (free tier works)
- OpenRouter API key (free tier — GLM 4.5 Air is free)
- HuggingFace token (for ViT model download)
- Custom fracture YOLOv8 weights at backend/models/fracture_yolov8.pt

### Frontend
```bash
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
# Opens at http://localhost:5173
```

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # Fill in your API keys
uvicorn app.main:app --reload --port 8000
# Swagger docs at http://localhost:8000/docs
```

### Database
```sql
-- In Supabase SQL Editor, run: backend/supabase_schema.sql
-- Then create storage buckets: xray-images (public), avatars (public)
```

---

## 14. Environment Variables

### Backend (backend/.env)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=z-ai/glm-4.5-air:free
JWT_SECRET=your-minimum-32-char-random-secret
HF_TOKEN=hf_...
YOLO_WEIGHTS_PATH=models/fracture_yolov8.pt
CONFIDENCE_THRESHOLD=0.40
FRONTEND_URL=http://localhost:5173
DISABLE_PRELOAD=false
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000
```

---

## 15. Academic Context

| Detail | Info |
|---|---|
| Project Name | XRayVision AI |
| Type | Final Year Project (FYP) |
| Institution | Minhaj University Lahore |
| Programme | BSSE (Bachelor of Software Engineering) — 8th Semester |
| Completion | May 2026 |
| Team | Muhammad Ali Raza (2022F-MUL-BSSWE-017) & Hamza Afzal (2022F-MUL-BSSWE-027) |
| Supervisor | Maam Misbah (Lecturer, School of Software Engineering) |
| License | MIT |
| Live Demo | https://x-ray-vision-board.vercel.app |
| GitHub | https://github.com/ZohaibCodez/x-ray-vision-board |

---

## 16. Acknowledgements & References

- TorchXRayVision (https://github.com/mlmed/torchxrayvision) — DenseNet121 pretrained on CheXpert, NIH ChestX-ray14, MIMIC-CXR, and PadChest datasets (700K+ images)
- Ultralytics YOLOv8 (https://github.com/ultralytics/ultralytics) — Object detection framework
- PayamFard123/dermaintel-wound-classifier (https://huggingface.co/PayamFard123/dermaintel-wound-classifier) — ViT wound classifier
- OpenRouter (https://openrouter.ai) — Free LLM API gateway (GLM 4.5 Air is free)
- Supabase (https://supabase.com) — Open-source Firebase alternative
- TanStack (https://tanstack.com) — React Start, Router, and Query
- Shadcn/ui (https://ui.shadcn.com) — Beautiful, accessible React components

---

*This context file was generated on 2026-09-05 and reflects the state of the codebase at that time.*
