# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.1.x (current) | ✅ Active |
| 2.0.x | ⚠️ Critical fixes only |
| < 2.0 | ❌ No longer supported |

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub Issues.**

Security vulnerabilities in a medical educational platform are especially sensitive because they could:
- Expose user scan history and medical images
- Allow unauthorized access to health-related data
- Compromise JWT authentication and enable impersonation

### How to Report

1. **Email**: Contact the maintainers directly through GitHub's private security advisory feature
2. **GitHub Security Advisories**: Go to the [Security tab](https://github.com/ZohaibCodez/x-ray-vision-board/security/advisories) → "Report a vulnerability"

### What to Include

Please provide as much of the following information as possible:

```
- Type of vulnerability (e.g., SQL injection, XSS, auth bypass, SSRF)
- Full path of the affected file(s) with source code
- Step-by-step reproduction instructions
- Proof-of-concept or exploit code (if possible)
- Potential impact / what data could be accessed
- Suggested fix (if you have one)
```

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 business days |
| Fix development | Within 14 days (critical), 30 days (high) |
| Public disclosure | After fix is deployed and verified |

---

## Security Architecture

### Authentication
- Users authenticate via **Supabase Auth** (email/password with bcrypt hashing)
- A **HS256 JWT token** is issued on login with a 24-hour expiry
- The server **refuses to start** if `JWT_SECRET` is still the insecure default value
- All protected API endpoints verify the JWT on every request via `get_current_user_id()` dependency

### Data Isolation
- All database queries include `.eq("user_id", user_id)` — users cannot access other users' data
- **Supabase Row Level Security (RLS)** is enabled on all tables as a second layer of protection
- Supabase Storage image paths are namespaced under `{user_id}/` to prevent cross-user access

### Rate Limiting
- `POST /analyze` — 10 requests per minute per IP (expensive AI operation)
- `POST /chat` — 20 requests per minute per IP
- `POST /diet` — 10 requests per minute per IP
- Global limit: 200 requests per minute per IP

### CORS
- CORS is locked to the configured `FRONTEND_URL` in production
- Unknown origins are rejected — no wildcard `*` allowed in production

### Input Validation
- All request bodies are validated by **Pydantic schemas** before reaching business logic
- `scan_type` is strictly validated to `chest | fracture | wound` — no arbitrary values accepted
- File uploads are validated for non-empty content before processing
- Image format is determined by content (OpenCV decode), not by claimed MIME type

### Secret Management
- No secrets are ever logged or returned in API responses
- Environment variables are loaded via `pydantic-settings` with explicit validation
- `JWT_SECRET` is validated at startup — weak/default values cause a fatal startup error

---

## Known Security Considerations

### Medical Data Privacy
- This is an **educational platform** — users should not upload real patient X-rays with identifiable information
- All uploaded images are stored in Supabase Storage, accessible via the user's account
- There is currently **no automatic PII detection** on uploaded images — users are responsible for de-identifying data

### AI Output Trust
- AI model outputs should **never** be treated as clinical diagnoses
- The system includes mandatory disclaimers, but users must understand this is educational-only
- Prompt injection via the `notes` field is possible — OpenRouter API is rate-limited and the system prompt enforces JSON output format

### Third-Party Services
- **OpenRouter** (GLM 4.5 Air) — user-provided clinical notes are sent to OpenRouter's API. Do not include personally identifiable patient information in the notes field.
- **Supabase** — all data is stored on Supabase's cloud infrastructure. Review Supabase's privacy policy and DPA for compliance requirements.
- **Hugging Face** — AI model weights are downloaded from Hugging Face Hub. Verify model licenses before production use.

---

## Out of Scope

The following are **not** considered security vulnerabilities for this project:

- Social engineering attacks
- Denial of service attacks that require large volumes of traffic
- AI model inaccuracy or hallucination (these are educational limitations, not security issues)
- Rate limit bypass using distributed IPs
- Issues in third-party dependencies (report those upstream)

---

## Security Hall of Fame

We appreciate responsible disclosure. Researchers who report valid security vulnerabilities will be acknowledged here (with their permission).

*No reports yet — be the first!*
