# Contributing to XRayVision AI

Thank you for your interest in contributing to **XRayVision AI**! 🎉  
This is an academic Final Year Project (FYP) at Minhaj University Lahore, and we welcome contributions that improve the educational value, code quality, and overall platform.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [AI & Medical Ethics Guidelines](#ai--medical-ethics-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18.0 | Frontend runtime |
| Python | ≥ 3.11 | Backend runtime |
| Git | Latest | Version control |
| Supabase CLI | Latest (optional) | Local DB development |

### Fork & Clone

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/x-ray-vision-board.git
cd x-ray-vision-board

# 3. Add upstream remote
git remote add upstream https://github.com/ZohaibCodez/x-ray-vision-board.git
```

---

## How to Contribute

We welcome the following types of contributions:

| Type | Examples |
|------|---------|
| 🐛 **Bug fixes** | Fix incorrect ICD-10 codes, broken API calls, UI glitches |
| ✨ **Features** | New scan types, additional AI models, UI improvements |
| 📖 **Documentation** | README improvements, code comments, docstrings |
| 🧪 **Tests** | Unit tests for services, API endpoint tests |
| 🌍 **Translations** | Urdu chatbot improvements, other language support |
| ♿ **Accessibility** | ARIA labels, keyboard navigation, contrast improvements |
| ⚡ **Performance** | Model inference optimization, caching improvements |

---

## Development Setup

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux

# Install all dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Fill in your Supabase, OpenRouter, and HuggingFace keys

# Start development server with auto-reload
uvicorn app.main:app --reload --port 8000

# API docs at: http://localhost:8000/docs
```

### Frontend Setup

```bash
# From project root
npm install          # or: bun install

# Create environment file
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev

# App at: http://localhost:5173
```

### Running Both Together

Open two terminals:
- **Terminal 1**: Backend → `cd backend && uvicorn app.main:app --reload`
- **Terminal 2**: Frontend → `npm run dev`

---

## Project Structure

```
x-ray-vision-board/
├── src/                        # Frontend (React 19 + TanStack)
│   ├── routes/                 # File-based routes (one file = one page)
│   ├── components/             # React components
│   ├── hooks/                  # Custom hooks (use-analyze, use-scans, etc.)
│   └── lib/                    # API client, auth context, TypeScript types
│
├── backend/                    # Backend (Python + FastAPI)
│   └── app/
│       ├── routers/            # API route handlers (analyze, auth, chat...)
│       ├── services/           # AI models, LLM, preprocessing
│       ├── models/             # Pydantic schemas
│       └── utils/              # Supabase client
```

---

## Submitting Changes

### Branch Naming Convention

```
feature/add-mri-scan-support
fix/fracture-bbox-coordinates
docs/update-api-documentation
refactor/chest-model-service
test/analyze-endpoint-tests
```

### Step-by-Step

```bash
# 1. Sync your fork with upstream
git fetch upstream
git checkout main
git merge upstream/main

# 2. Create a new branch
git checkout -b feature/your-feature-name

# 3. Make your changes
# ... edit files ...

# 4. Stage and commit
git add .
git commit -m "feat: add support for DICOM batch upload"

# 5. Push to your fork
git push origin feature/your-feature-name

# 6. Open a Pull Request on GitHub
```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `style` — formatting (no logic change)
- `refactor` — code restructure (no bug fix or feature)
- `perf` — performance improvement
- `test` — adding tests
- `chore` — build process or dependency updates

**Examples:**
```
feat(analyze): add support for DICOM batch upload
fix(chatbot): correct Urdu language detection logic
docs(readme): add deployment troubleshooting section
perf(chest-model): cache model weights in GPU memory
```

---

## Coding Standards

### Python (Backend)

```python
# ✅ DO: Use type hints on all functions
def predict_chest_pathologies(
    preprocessed_image: np.ndarray,
    confidence_threshold: float = 0.40,
) -> list[dict]:
    ...

# ✅ DO: Write descriptive docstrings
"""Run chest pathology inference using DenseNet121.

Args:
    preprocessed_image: numpy array of shape (1, 1, 224, 224)
    confidence_threshold: minimum confidence to include in results

Returns:
    List of findings sorted by confidence descending
"""

# ✅ DO: Handle errors gracefully with fallbacks
try:
    result = synthesize_report(findings, scan_type)
except Exception as e:
    logger.error(f"Synthesis failed: {e}")
    result = _fallback_synthesis(findings, scan_type)  # always return something

# ❌ DON'T: Use bare except
try:
    something()
except:  # too broad
    pass
```

### TypeScript (Frontend)

```typescript
// ✅ DO: Type all API responses
const result = await analyzeApi.submit(file, scanType) as ScanResult;

// ✅ DO: Handle loading and error states
const { data, isLoading, error } = useQuery({
  queryKey: ['scan', scanId],
  queryFn: () => scansApi.get(scanId),
});

// ✅ DO: Use descriptive component names
export function FindingCard({ finding }: { finding: Finding }) { ... }

// ❌ DON'T: Use `any` type
const result: any = await fetch(...);  // avoid this
```

### General Rules

- **No secrets in code** — never commit API keys, JWT secrets, or passwords
- **Log meaningful messages** — include context (user_id, scan_id) in backend logs
- **Keep functions small** — one function, one responsibility
- **Add JSDoc / docstrings** for all public functions
- **Format before committing** — run `npm run lint` (frontend) and ensure Python code follows PEP 8

---

## AI & Medical Ethics Guidelines

Because this project involves **medical imaging AI**, contributors must follow these rules:

### ✅ Required

- Always include the disclaimer: *"For educational use only — not a clinical diagnostic tool"* in any user-facing AI outputs
- Use only publicly licensed, de-identified medical image datasets for training/testing
- Document any changes to model thresholds or confidence cutoffs with clinical justification
- Test changes against edge cases (low-quality images, DICOM files, unusual pathologies)

### ❌ Prohibited

- Do not train models on real patient data without explicit IRB/ethics approval
- Do not remove or weaken the educational disclaimers from the UI or API responses
- Do not add features that could lead users to believe outputs are clinically validated
- Do not integrate third-party AI models without reviewing their training data provenance

---

## Reporting Bugs

Use the [GitHub Issues](https://github.com/ZohaibCodez/x-ray-vision-board/issues) page with the **`bug`** label.

Please include:

```markdown
## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Upload '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: Windows 11 / macOS 14 / Ubuntu 22.04
- Browser: Chrome 120 / Firefox 121
- Frontend version: (check package.json)
- Backend version: (check app/main.py version string)

## Screenshots / Logs
(Attach if relevant — do NOT include real patient images)
```

---

## Feature Requests

Use GitHub Issues with the **`enhancement`** label. Please describe:
- **The problem** — what are you trying to solve?
- **Proposed solution** — what should the feature do?
- **Alternatives considered** — other approaches you thought of
- **Clinical relevance** — how does this improve educational value?

---

## Pull Request Checklist

Before opening a PR, verify:

- [ ] My branch is up to date with `main`
- [ ] I have tested my changes locally (both frontend and backend if applicable)
- [ ] My commit messages follow the conventional commits format
- [ ] I have added/updated docstrings for any new functions
- [ ] I have not committed any `.env` files or secrets
- [ ] I have not removed the educational disclaimer from AI outputs
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] No Python syntax errors (`python -m py_compile app/**/*.py`)

---

## Questions?

Open a [GitHub Discussion](https://github.com/ZohaibCodez/x-ray-vision-board/discussions) or reach out through the university channels.

Thank you for helping make XRayVision AI better! 🩻
