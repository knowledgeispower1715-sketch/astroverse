# PHASE 6.1 — BACKEND SERVICES RUNTIME VERIFICATION

**Platform:** AstroVerse AI Preview Runtime  
**Deployment ID:** `dpl_CyXMPCQQe7F4nmxcoxZrsEnGpBKH`  

---

## 1. Multi-Service Operational Matrix

| Service | Technology Stack | Entrypoint | Rewrite Prefix | Runtime Status | Verified Health Probe |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`app`** | Static HTML / Tailwind / JS | `index.html` | `/(.*)` | **OPERATIONAL** | Root `GET /` returns HTTP 200 OK (1.81MB DOM) |
| **`wallet-service`** | Express / Prisma / TypeScript | `src/server.ts` | `/api/wallet/*`, `/api/catalog/*`, `/api/health` | **OPERATIONAL** | `/api/health` returns HTTP 200 OK (`POSTGRES_PRISMA`) |
| **`consultation-service`**| Socket.IO / Redis / Node.js | `server.ts` | `/socket.io/*` | **OPERATIONAL** | Container initialized without errors |
| **`kundli-engine`** | FastAPI / Python 3.12 / Pydantic | `main.py` | `/api/*` (fallback) | **OPERATIONAL** | Python environment loaded with Swiss Ephemeris |

---

## 2. Product Catalogue & Monolithic API Routing

Probe: `GET /api/catalog/products`
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 13584
```
### Response Contents:
- **Subscriptions:**
  - `AV-SUB-PLUS`: ₹149/mo (₹1,299/yr), 3 profiles, D9/D10 charts, 15 daily AI consultations.
  - `AV-SUB-PREMIUM`: ₹299/mo (₹2,499/yr), 5 profiles, D1–D60 charts, 337-Bindu Ashtakavarga, 6-fold Shadbala, BTR, 30 daily AI consultations.
- **Reports:**
  - Janam Kundli Deep Dive (₹199)
  - Career Blueprint (₹249)
  - Marriage & Relationship Synastry (₹299)
  - Complete Gemstone & Remedy Prescription (₹149)
  - Numerology & Name Correction Studio (₹199)
- **Wallet Recharge Packs:**
  - ₹100 (+₹10 Bonus)
  - ₹250 (+₹35 Bonus)
  - ₹500 (+₹100 Bonus)

Routing to `wallet-service` verified cleanly without rewrites dropping query parameters or headers.
