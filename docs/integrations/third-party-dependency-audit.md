# AstroVerse Third-Party Dependency, Licensing and Security Audit

**Audit Date:** October 23, 2026
**Auditor:** Acting CTO & Principal Software Architect
**Scope:** Microservices (`services/kundli-engine`, `services/wallet-service`, `services/consultation-service`), External APIs, Ephemeris Engines, and Database Infrastructure

---

## 1. External Calculation and API Integration Posture

| Dependency / Service | Purpose | Integration Mode | Security & Fallback Policy | Licensing & Cost Model |
| :--- | :--- | :--- | :--- | :--- |
| **Swiss Ephemeris (`pyswisseph`)** | High-precision astronomical ephemeris (0.001 arcsec) | **Local In-Process C Extension** | **Air-gapped execution**; zero outbound network calls. Bundled ephemeris files. | **Dual-Licensed (GNU AGPL v3 / Astrodienst Commercial License)**. Compliant under AGPL v3 in open-source distribution; commercial license mandatory if distributing closed-source. |
| **VedAstro Reference Source** | Algorithm reference & parity discovery | **Native Clean-Room Re-implementation** | Zero runtime network reliance on `api.vedastro.org`. All algorithms executed natively in Python 3.12. | **MIT License**. Full attribution maintained. |
| **FreeAstroAPI** | Secondary cross-validation & sanity checks | Server-Side HTTP Adapter (`external_api.py`) | Fail-closed timeout (5.0s); strict cache layer; graceful fallback to native ephemeris if offline. | Free tier with bounded concurrency. |
| **ProKerala API** | Regional panchang verification | Server-Side HTTP Adapter (`prokerala_api.py`) | OAuth2 client credentials flow; in-memory token caching; fail-closed fallback. | Metered commercial API; optional auxiliary verification. |
| **LLM Providers (OpenAI / Anthropic / Gemini)** | Synthesis of astrological interpretations into structured text | Server-Side AI Astrologer (`ai_astrologer.py`) | Hardened system prompts preventing fatalistic/harmful predictions; structured JSON schema response enforcement. | Token-budgeted per consultation; authenticated via environment variables. Deterministic offline fallback if keys missing. |
| **Razorpay Gateway** | User wallet recharges & consultation fees | Server-Side Express Handler (`wallet-service`) | Cryptographic HMAC-SHA256 signature verification; atomic idempotency keys preventing replay double-credits. | Transaction fee model; strict webhook validation. |
| **PostgreSQL Database** | Durable storage for users, birth profiles, wallets, reports | Connection String via `DATABASE_URL` | **Production Invariant**: Durable ACID persistence mandatory. Ephemeral/in-memory fallback fails closed with HTTP 503. | Managed cloud PostgreSQL (AWS RDS / Supabase / Neon). |

---

## 2. In-Depth Swiss Ephemeris Licensing Analysis

### 2.1 The AGPL v3 vs Commercial Dual-License Requirement
The astronomical core of `services/kundli-engine` uses `pyswisseph` (version 2.10.3.2), which binds to the Swiss Ephemeris C library developed by Astrodienst AG (Dieter Koch and Alois Treindl).

Astrodienst AG licenses Swiss Ephemeris under a dual-licensing scheme:
1. **GNU Affero General Public License (AGPL v3):**
   - Allows free usage and distribution, provided that the **entire application** (including all server-side components interacting with Swiss Ephemeris over a network) is released under the GNU AGPL v3, making full source code available to all users.
   - Because AstroVerse publishes its source code openly on GitHub, the project operates within the terms of the GNU AGPL v3.
2. **Astrodienst Commercial License:**
   - If AstroVerse or any derivative product is offered as a proprietary commercial service where source code is withheld, or where the AGPL v3 terms cannot be met, a commercial license must be purchased directly from Astrodienst AG prior to commercial distribution or public service launch.
   - See official Astrodienst documentation: [https://www.astro.com/swisseph/swephinfo_e.htm](https://www.astro.com/swisseph/swephinfo_e.htm).

### 2.2 Operational Compliance Status
- **Current Development & Open-Source Distribution:** `VERIFIED_COMPLIANT_UNDER_AGPL_V3`.
- **Proprietary Commercial Release:** `CONDITIONAL_PENDING_COMMERCIAL_LICENSE` (Must acquire Astrodienst commercial license if closed-source commercial monetization is activated).

---

## 3. Privacy, Data Governance and PII Protection

1. **Zero Client-Side Calculation Leakage**: All coordinates and calculation logic are computed on AstroVerse backend nodes; user birth parameters are never forwarded to unauthorized third parties or unvetted ad networks.
2. **Secret Redaction**: Environment credentials (`DATABASE_URL`, `JWT_SECRET`, `PROKERALA_CLIENT_SECRET`, `FREEASTROAPI_API_KEY`, `RAZORPAY_KEY_SECRET`) are loaded via process environment and strictly redacted from server logs.
3. **Double-Entry Financial Ledger**: All wallet transactions, report unlocks, and puja bookings are permanently recorded with idempotency keys, preventing balance drift or double-spending attacks.
4. **Guest Profile Privacy**: Guest profiles are stored locally in the user's browser sandbox and are only migrated to the server upon explicit, authenticated account registration via `/api/user/migrate-guest`.
