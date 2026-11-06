# PHASE 6.2 — STAGE J: ASTROLOGER CONSULTATION & LIVE PER-MINUTE BILLING

**Evaluator:** Senior Financial Systems Architect & Real-Time Communications Specialist  
**Evaluation Date:** 2026-11-06T01:51:30+05:30  
**Target Services:** `services/consultation-service` & `services/wallet-service`  

---

## 1. Consultation Lifecycle Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Gateway as Wallet Gateway
    participant Redis as Redis Locker
    participant Socket as Consultation Engine
    actor Astrologer

    Customer->>Gateway: POST /api/consultation/start-session (astrologerId, rate)
    Gateway->>Redis: Check customer wallet & place atomic reservation
    Gateway-->>Customer: Session Token & WebSocket Channel
    Customer->>Socket: Connect to session room
    Astrologer->>Socket: Join session room
    loop Every 60 Seconds
        Socket->>Gateway: Tick per-minute billing debit
        Gateway->>Gateway: Debit customer wallet & credit astrologer pending payout
        Gateway-->>Socket: Billing ACK (remaining balance)
    end
    Note over Gateway,Socket: Balance hits zero threshold
    Gateway-->>Socket: EMIT "TERMINATED_INSUFFICIENT_FUNDS"
    Socket-->>Customer: Halt chat & show recharge modal
    Socket-->>Astrologer: Halt session & show session summary
```

---

## 2. Server-Enforced Billing Controls

1. **Server-Authoritative Clock:**
   - Frontend countdown timers are display-only.
   - Per-minute billing intervals are triggered strictly by backend server timers (`billing.lua` in Redis / Node.js billing workers).
2. **Zero-Balance Forced Termination:**
   - When customer wallet balance exhausts all available funds, billable activity ceases immediately.
   - The WebSocket room is locked, transitioning state to `TERMINATED_INSUFFICIENT_FUNDS`.
   - No negative balances or uncontrolled overdrafts can occur.
3. **Free-Minute Promotional Shielding:**
   - New customers receive an introductory 60-second trial window.
   - Database tracking (`User.hasConsumedFreeMinute`) prevents recycling or abuse across repeated sessions.
   - Once expired, turns are rejected with HTTP 402 Payment Required until a wallet deduction is committed.

---

## 3. Stage J Verification Verdict
**PASS:** Consultation session setup, atomic wallet reservations, per-minute billing ticks, zero-balance termination, and ledger reconciliations are verified without defects.
