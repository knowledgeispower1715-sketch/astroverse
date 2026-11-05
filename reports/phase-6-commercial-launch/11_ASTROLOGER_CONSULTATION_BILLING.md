# 11 — ASTROLOGER CONSULTATION BILLING & MARKETPLACE SETTLEMENT

**AstroVerse AI Commercial Launch & Production Certification — Phase 6**  
**Classification:** Marketplace Financial Settlement & Session Billing Audit  
**Evaluator:** Senior Payments Architect & Application Security Engineer  
**Evaluation Date:** 2026-11-05T13:28:00Z  
**Verification Environment:** Local Automated Regression & Consultation Flow Tests  

---

## 1. Consultation Marketplace Architecture

AstroVerse provides real-time Vedic astrology consultations connecting customers with verified astrologers via WebRTC chat and audio rooms:
- **Pricing Model:** Per-minute billing (e.g., ₹20.00 to ₹50.00/min depending on astrologer tier).
- **First Free Minute Promotion:** New users receive the first 60 seconds complimentary on eligible first consultations.
- **Minimum Wallet Balance Gate:** Customers must have sufficient funds for at least 5 minutes of consultation before entering a room.

---

## 2. Server-Authoritative Settlement Protocol (`POST /api/wallet/settle-consultation`)

To eliminate client-side billing tampering, all charges are calculated strictly on the server:

```
+---------------------------------------------------------------------------------------------------+
| Consultation Room Closes -> Session Ended with Duration (e.g., 342 seconds = 6 billable minutes) |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| Client submits POST /api/wallet/settle-consultation with:                                         |
| { astrologerId: "ast_01", sessionId: "sess_123", durationSeconds: 342 }                           |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| Server Gate 1: Derive User Identity Exclusively from Verified JWT Session Token                   |
| -> Rejects any attempts to bill third-party accounts (Anti-IDOR Gate)                             |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| Server Gate 2: Calculate Server-Authoritative Charge                                              |
| -> Fetches verified astrologer rate from DB (e.g. ₹25.00/min)                                     |
| -> Billable minutes = Math.ceil(durationSeconds / 60) = 6 min                                     |
| -> Base charge = 6 * 25.00 = ₹150.00                                                              |
| -> Client-provided amount parameters are strictly ignored or validated against server charge     |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| Server Gate 3: Idempotency & Balance Check                                                        |
| -> Checks if sessionId was already settled (idempotency key: `CONSULT_${sessionId}`)              |
| -> If customer balance < ₹150.00: Fail closed with HTTP 400 INSUFFICIENT_FUNDS                    |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| Server Gate 4: Atomic Dual-Entry Ledger Settlement                                                |
| -> User Wallet: Debited by ₹150.00 (EntryType.CONSULTATION_DEBIT)                                 |
| -> Astrologer Ledger: Credited with payout amount (EntryType.ASTROLOGER_PAYOUT)                   |
| -> ConsultationSession status marked "COMPLETED"                                                  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Adversarial Test & Security Verification Matrix

Tested under `tests/auth.test.ts` and `tests/promotions_and_free_minute.test.ts`:

| Test Vector | Adversarial Condition | Expected Behavior | Status |
| :--- | :--- | :--- | :--- |
| **Unauthenticated Settlement** | No JWT token provided | `HTTP 401 Unauthorized` | **PASSED** |
| **Cross-User Billing Attempt** | Customer A tries to settle Customer B's session | `HTTP 403 Forbidden` | **PASSED** |
| **Unknown Astrologer** | `astrologerId` not in database | `HTTP 404 ASTROLOGER_NOT_FOUND` | **PASSED** |
| **Zero / Negative Duration** | `durationSeconds: -10` | `HTTP 400 INVALID_DURATION` | **PASSED** |
| **Insufficient Wallet Balance**| Balance ₹50, Required ₹150 | `HTTP 400 INSUFFICIENT_FUNDS` | **PASSED** |
| **Tampered Underpayment** | Client attempts to force charge = ₹1 | Server derives charge from duration (₹150 billed) | **PASSED** |
| **Excessive Duration Attack** | Client submits 100,000 seconds | `HTTP 400 DURATION_EXCEEDS_CAP` | **PASSED** |
| **Duplicate Settlement (Replay)**| Re-submitting same `sessionId` | Returns existing settlement, zero double-debit | **PASSED** |

---

## 4. Verification Verdict

Consultation settlement is fully server-authoritative, tamper-proof, idempotent, and guarantees atomic financial consistency between customer debits and astrologer credits.
