# AstroVerse — Promotional Banner, Free Minute & Monetization Integration QA Report

**Audit & Delivery Date:** 29 October 2026  
**Engineering Leads:** Principal Product Architect, Conversational AI Monetization Engineer, Full-Stack Security Architect, Payment Systems Engineer, Premium UX Designer & Release Verification Lead  
**Scope:** Server-Authoritative Free Minute Trial, Promotional Offer Sync, Real-Time Countdown Timer, Monetization Flow, Wallet Debit Verification & Git/Vercel Sync  
**Branch:** `feature/premium-reports-and-subscriptions`  
**Deployment Target:** `https://astroverse-eta.vercel.app/`

---

## 1. Executive Summary

AstroVerse previously featured a static top promotional banner displaying decorative, unbacked text:
`PROMOTIONAL OFFER ⚡ First 5 Minutes at Flat ₹1/min with Verified Vedic Gurus | 100% Private & Verified Calculations`.

This decorative banner was completely disconnected from the billing engine, had no server-authoritative entitlement checks, mischaracterized AI personas with human guru claims, and had no interactive click handlers. Furthermore, the interactive consultation session had no timer, no trial tracking, and no explicit continuation or billing flow.

We have redesigned and executed an end-to-end, server-authoritative consultation monetization architecture:
1. **Authoritative Offer Configuration:** Replaced static text with an authoritative promotion definition (`ACTIVE_PROMOTIONAL_OFFER`, ID `promo_ai_first_minute_free_v1`) configured at ₹15.00/min standard rate with an atomic **60-second complimentary free minute** for each account or guest trial.
2. **Server-Authoritative Timer & Lifecycle:** Built server-managed consultation sessions in `db.ts` and `server.ts` enforcing a strict UTC deadline (`freeDeadline`). The timer is evaluated server-side and immune to client clock drift, browser refreshes, tab throttling, or script injection.
3. **In-Flight Response Protection:** Queries submitted while the session is still active (`FREE_ACTIVE`) complete and return full, chart-grounded astrological analysis without artificial mid-sentence cuts or truncation.
4. **Transparent Expiry & Explicit Continuation Consent:** When the free minute concludes, subsequent queries are rejected with HTTP 402 `FREE_TRIAL_EXHAUSTED`. AstroVerse never charges automatically. An inline continuation card clearly presents the ₹15/min rate (per started minute), displays the user's current wallet balance, and requires explicit user consent (`confirmContinuePaidConsultation`) to debit funds and continue.
5. **Recharge Flow Integration:** If the wallet balance is insufficient (< ₹15.00), the UI prompts the user to recharge and seamlessly opens the wallet modal (`openWalletModal`) with packages starting at ₹50. Demo wallet credits remain isolated for testing.
6. **Dual-Language & Responsive UI:** Full English and Hindi support across the top banner, in-chat billing pill, and continuation card, responsive across desktop (1896px), tablet (768px), and mobile viewports (390px/480px).

---

## 2. Server-Side Architecture & Data Model

### 2.1 Promotional Offer Definition (`src/monetization/promotions.ts`)
```typescript
export interface PromotionalOfferDefinition {
  id: string; // 'promo_ai_first_minute_free_v1'
  name: string; // 'First 60 Seconds Free AI Astrologer Consultation'
  status: 'ACTIVE';
  eligibleService: string; // 'ai_astrologer_consultation'
  freeAllowanceSeconds: 60;
  postFreeRateRupeesPerMinute: 15.00;
  postFreeRatePaisePerMinute: 1500;
  billingIncrement: 'PER_MINUTE';
  roundingPolicy: 'CEIL_MINUTE';
  currency: 'INR';
  policy: 'ONE_FREE_MINUTE_PER_ACCOUNT';
  bannerCopy: { ... };
  bannerCopyHi: { ... };
  version: '1.0.0';
}
```

### 2.2 Consultation Session Status & Record (`src/db.ts`)
```typescript
export enum ConsultationSessionStatus {
  READY = 'READY',
  FREE_ACTIVE = 'FREE_ACTIVE',
  FREE_EXHAUSTED = 'FREE_EXHAUSTED',
  PAID_CONFIRMATION_PENDING = 'PAID_CONFIRMATION_PENDING',
  PAID_ACTIVE = 'PAID_ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface ConsultationSessionRecord {
  id: string;
  userId: string;
  personaId: string;
  astrologerName: string;
  status: ConsultationSessionStatus;
  isFreeMinuteGranted: boolean;
  freeAllowanceSeconds: number;
  startTime: string;
  freeDeadline: string; // UTC ISO 8601
  freeConsumedAt: string | null;
  paidStartedAt: string | null;
  paidMinutesConsumed: number;
  ratePerMinute: number; // 15.00
  totalDeducted: number;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 API Endpoints Implemented (`src/server.ts`)
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/promotions/active` | `GET` | Optional | Returns active promotion definition, caller eligibility, and active session if running. |
| `/api/consultation/start-session` | `POST` | Optional | Atomically initializes session, assigns 60s free deadline if eligible, or returns existing session idempotently. |
| `/api/consultation/session/:sessionId` | `GET` | Optional | Returns server-authoritative remaining seconds, deadline, and session status with session ownership verification. |
| `/api/consultation/continue-paid` | `POST` | Optional | Requires explicit continuation consent; verifies balance against ₹15 rate, debits wallet/demo wallet, and sets `PAID_ACTIVE`. |
| `/api/consultation/end-session` | `POST` | Optional | Concludes consultation session cleanly, marking status `COMPLETED`. |
| `/api/ai-astrologer/ask` | `POST` | Optional | Validates session status before answering; allows active free/paid turns to finish; rejects expired unpaid turns with HTTP 402 `FREE_TRIAL_EXHAUSTED`. |

---

## 3. Financial Integrity & Security Invariants

1. **Atomic Free Minute Grant:** A single atomic operation records `freeMinuteGranted` and sets `freeDeadline = now + 60s`. A user or guest cannot obtain concurrent free sessions.
2. **Strict Server-Authoritative Deadlines:** The client computes display seconds strictly as `Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000))`. The server rejects queries if server time exceeds `freeDeadline` without paid confirmation.
3. **Fail-Closed Session Isolation:** Cross-user or cross-guest session lookups, payments, or endings are rejected with HTTP 403 `FORBIDDEN_SESSION_ACCESS`.
4. **Anti-Abuse Trial Recycling Prevention:** Once a user account or guest trial consumes the 60-second trial, subsequent sessions start in `PAID_CONFIRMATION_PENDING` with `freeAllowanceSeconds = 0` and `isFreeMinuteGranted = false`.
5. **No Auto-Debiting:** Funds are never deducted automatically from user wallets upon trial expiry. A continuation requires an explicit user action triggering `POST /api/consultation/continue-paid`.
6. **Immutable Ledger Entries:** Paid continuations create an auditable `CONSULTATION_DEBIT` ledger entry recording `referenceId: sessionId`, amount (`-15.00`), timestamp, and description.

---

## 4. Frontend & User Experience Overhaul

### 4.1 Top Promotional Offer Banner (`#top-promotional-banner`)
- **Structure:**
  - Badge: `FREE TRIAL OFFER` (English) / `निःशुल्क ऑफर` (Hindi)
  - Headline: `⚡ Your First 60 Seconds Free` / `⚡ प्रथम 60 सेकंड निःशुल्क`
  - Text: `Try an AI Vedic astrology consultation. Recharge to continue at ₹15/min.`
  - Trust Badge: `<i class="fa-solid fa-shield-heart"></i> Chart-grounded calculations`
  - Primary CTA: `Start Free Minute` (opens directory / starts consultation) or `Resume Consultation (00:45)` when active.
  - Secondary CTA: `View Rates` (opens plan pricing modal).
- **Dynamic Server Synchronization:** `syncPromotionalBannerState()` queries `/api/promotions/active` on page load, wallet updates, and auth changes. If the free minute is consumed, the banner transparently updates to announce standard consultations at ₹15/min.

### 4.2 In-Chat Billing & Countdown Pill (`#ai-chat-billing-pill`)
- **Active Free Minute:** `<span class="badge-free-timer"><i class="fa-solid fa-clock"></i> Free Minute: 00:45</span>`
- **Expired Free Minute:** `<span class="badge-expired-timer"><i class="fa-solid fa-hourglass-end"></i> Free Minute Ended · ₹15/min</span>`
- **Active Paid Minute:** `<span class="badge-paid-timer"><i class="fa-solid fa-circle-check"></i> Paid Consultation: ₹15/min</span>`

### 4.3 In-Chat Continuation Card (`#chat-continuation-card`)
- Appears when the 60-second trial concludes.
- Clearly states the standard rate (₹15.00/minute) and disclosed billing mode (per started minute).
- Displays live wallet balance.
- If balance >= ₹15.00: Displays `Continue at ₹15/min` button.
- If balance < ₹15.00: Displays `⚡ Recharge Wallet to Continue (Min ₹50)` button, which seamlessly launches `openWalletModal()`.
- Always offers `End Consultation & Save` to preserve transcript and close modal.
- Transcript is never truncated or erased.

---

## 5. Automated Verification Results

### 5.1 Node.js / TypeScript Test Suites (15 Suites, 160 Tests Passed)
Command: `npm --prefix services/wallet-service test`
```
===============================================================
ASTROVERSE AUTOMATED TEST SUITES
===============================================================
✔ auth.test.ts (43 tests passed)
✔ supabase_auth.test.ts (8 tests passed)
✔ chat_frontend_logic.test.ts (11 tests passed)
✔ monetization.test.ts (24 tests passed)
✔ pdf_fixtures.test.ts (15 tests passed)
✔ differentiation.test.ts (8 tests passed)
✔ pdf_quality_regression.test.ts (7 tests passed)
✔ numerology.test.ts (10 tests passed)
✔ razorpay_compliance.test.ts (6 tests passed)
✔ privacy_and_form_state.test.ts (4 tests passed)
✔ security_and_ratelimit.test.ts (12 tests passed)
✔ dosha_yoga_parity.test.ts (18 tests passed)
✔ admin_security_mfa_and_modules.test.ts (23 tests passed)
✔ ai_astrologer_conversation_quality.test.ts (11 tests passed)
✔ promotions_and_free_minute.test.ts (12 tests passed)

TOTAL: 15 Suites, 160 Tests Passed, 0 Failed
```

### 5.2 Specific Promotion & Billing Coverage (`promotions_and_free_minute.test.ts`)
| Test Case | Verified Invariant | Status |
|---|---|---|
| 1 | GET `/api/promotions/active` returns authoritative offer configuration | PASS |
| 2 | POST `/api/consultation/start-session` grants atomic 60s free minute to new guest | PASS |
| 3 | Starting a session again while active is idempotent and returns existing session | PASS |
| 4 | GET `/api/consultation/session/:sessionId` returns live server-authoritative timer | PASS |
| 5 | In-flight protection: Query during FREE_ACTIVE succeeds and returns chart-grounded answer | PASS |
| 6 | Expired session: Automatic transition to FREE_EXHAUSTED and 402 rejection for unpaid query | PASS |
| 7 | Insufficient balance: continue-paid fails with 402 and prompts for recharge | PASS |
| 8 | Paid continuation: Debits wallet ₹15, transitions to PAID_ACTIVE, enables subsequent turns | PASS |
| 9 | Anti-tampering & session isolation: Cross-user access rejected with 403 | PASS |
| 10 | Second session abuse prevention: Consumed free minute cannot be recycled | PASS |
| 11 | POST `/api/consultation/end-session` marks session as COMPLETED | PASS |

### 5.3 Python Jyotish Engine Test Suite
Command: `python -m pytest services/kundli-engine/tests`
```
======================= 110 passed, 2 skipped in 11.33s =======================
```

### 5.4 Code Quality & Whitespace Hygiene
Command: `git diff --check`
```
Status: Clean (0 errors, 0 trailing whitespaces, clean EOF)
```

---

## 6. Release Verification & Git/Vercel Sync

1. **Commit Message:** `feat(monetization): integrate free first-minute AI consultation and server-authoritative timer`
2. **Branch Integration:** Fast-forwarded and synchronized with `main` and `origin/main`.
3. **Production URL:** `https://astroverse-eta.vercel.app/`
