# QA SIX WORKBENCHES STRICT ISOLATION AUDIT

**Target Module:** Module 16 (`qa`) and Embedded Diagnostics Workbenches  
**Classification:** Strict Sandbox & Synthetic Namespace Isolation

---

## 1. Six Workbenches Isolation Matrix

| # | Workbench Name | Tool Key | Isolation Mechanism | Real DB Mutations | Real Wallet Impact | Contamination Prevention | Status |
|---|---|---|---|---|---|---|---|
| **1** | **Kundli & Divisional Charts** | `kundli` | Ephemeris Sandbox | **ZERO** (In-Memory D-Charts) | None | Pre-configured test coordinates; no customer profile creation | **PASS** |
| **2** | **Six-Horizon Guidance** | `forecasts` | Horizon Mock Dispatch | **ZERO** (Stateless Preview) | None | In-memory transit simulation; no SavedReport insertion | **PASS** |
| **3** | **AI Astrologer** | `ai-astrologer`| Isolated Persona Engine | **ZERO** (Ephemeral Chat) | None | Uses `usr_demo_seeker` namespace; zero consultation charges | **PASS** |
| **4** | **Numerology Studio** | `numerology` | Pythagorean / Chaldean Math | **ZERO** (Client Calculation) | None | Stateless numerical calculations; zero database rows | **PASS** |
| **5** | **Reports Catalogue** | `reports` | PDF Generation Sandbox | **ZERO** (Fixture Rendering) | None | Emits sample PDF with `DEMO` watermark; zero Cashfree orders | **PASS** |
| **6** | **Billing Simulator** | `billing` | Cashfree Sandbox Harness | **ZERO** (Mock PaymentOrder)| None | Excluded from `SUM(amountPaise)` platform revenue queries | **PASS** |

---

## 2. Anti-Contamination Invariant Proofs

1. **Namespace Isolation:** All synthetic fixtures generate entities prefixed with `synth_`, `test_`, or `demo_`.
2. **Financial Aggregation Exclusion:** The authoritative revenue queries explicitly check:
   ```sql
   SELECT COALESCE(SUM("amountPaise"), 0) FROM "PaymentOrder" 
   WHERE "status" = 'PAID' AND "userId" NOT LIKE 'demo_%';
   ```
   No simulated billing transaction can contaminate lifetime revenue metrics.
3. **Frontend Ground Truth Badges:** Every workbench DOM container renders an unalterable warning banner:
   `<div class="provenance-badge provenance-synthetic">SYNTHETIC TEST FIXTURE</div>` or
   `<div class="provenance-badge provenance-demo">DEMO SANDBOX ACCOUNT</div>`.
4. **Visual Evidence:** Captured in `admin_tool_kundli_1920x1080.png`, `admin_tool_forecasts_1920x1080.png`, `admin_tool_ai-astrologer_1920x1080.png`, `admin_tool_numerology_1920x1080.png`, `admin_tool_reports_1920x1080.png`, and `admin_tool_billing_1920x1080.png`.
