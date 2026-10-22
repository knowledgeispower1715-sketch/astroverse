# AstroVerse Third-Party Dependency and Security Audit

**Audit Date**: 2026-10-22  
**Scope**: Microservices (`services/kundli-engine`, `services/wallet-service`, `services/consultation-service`), External APIs, Ephemeris Engines, and Database Infrastructure

---

## 1. External Calculation and API Integration Posture

| Dependency / Service | Purpose | Integration Mode | Security & Fallback Policy | Cost & Rate Limits |
| :--- | :--- | :--- | :--- | :--- |
| **Swiss Ephemeris (`pyswisseph`)** | High-precision astronomical ephemeris (0.001 arcsec) | **Local In-Process C Extension** | **Air-gapped execution**; zero outbound network calls. Bundled ephemeris files. | Open-source (GPL/LGPL/Astrodienst license). Unlimited queries. |
| **FreeAstroAPI** | Secondary verification & multi-provider cross-validation | Server-Side HTTP Adapter (`external_api.py`) | Fail-closed timeout (5.0s); strict cache layer; graceful fallback to native ephemeris if offline. | Free tier with bounded concurrency. |
| **ProKerala API** | Regional panchang verification | Server-Side HTTP Adapter (`prokerala_api.py`) | OAuth2 client credentials flow; in-memory token caching; fail-closed fallback. | Metered commercial API; used selectively. |
| **VedAstro Hosted API** | N/A (Excluded from runtime) | **None (Native Re-implementation)** | **Zero runtime network reliance**. All algorithms translated and executed natively in `services/kundli-engine/`. | $0 recurring cost; zero rate limit vulnerability. |
| **LLM Providers (OpenAI / Anthropic / Gemini)** | Synthesis of astrological interpretations into structured text | Server-Side AI Astrologer (`ai_astrologer.py`) | Hardened system prompts preventing fatalistic/harmful predictions; structured JSON schema response enforcement. | Token-budgeted per consultation; authenticated via environment variables. |
| **Razorpay / Payment Gateway** | User wallet recharges & consultation fees | Server-Side Express Handler (`wallet-service`) | Cryptographic HMAC-SHA256 signature verification; atomic idempotency keys preventing replay double-credits. | Transaction fee model; strict webhook validation. |
| **PostgreSQL Database** | Durable storage for users, birth profiles, wallets, reports | Connection String via `DATABASE_URL` | **Production Invariant**: Durable ACID persistence mandatory. Ephemeral/in-memory fallback fails closed with HTTP 503. | Cloud-hosted managed PostgreSQL. |

---

## 2. Privacy and PII Protection

1. **Zero Client-Side Calculation Leakage**: All coordinates and calculation logic are computed on AstroVerse backend nodes; user birth parameters are never forwarded to unauthorized third parties or unvetted ad networks.
2. **Secret Redaction**: Environment credentials (`DATABASE_URL`, `JWT_SECRET`, `PROKERALA_CLIENT_SECRET`, `FREEASTROAPI_API_KEY`) are loaded via process environment and strictly redacted from server logs.
