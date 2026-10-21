# AstroVerse 1-on-1 Consultation Lifecycle & Real-Time Billing Specification

## 1. Consultation Lifecycle State Machine

AstroVerse provides private, real-time consultations with verified Vedic astrologers via text chat, audio, and video streams. Every active consultation is governed by a strict state machine with server-authoritative timekeeping and per-minute billing.

```mermaid
stateDiagram-v2
    [*] --> INITIATED: User selects Astrologer
    INITIATED --> CONNECTING: Pre-flight Balance Verified (≥ 1 Min Rate)
    INITIATED --> INSUFFICIENT_FUNDS: Balance < 1 Min Rate
    INSUFFICIENT_FUNDS --> [*]: Prompt Wallet Recharge

    CONNECTING --> ACTIVE: Astrologer & User Handshake Established
    CONNECTING --> TIMEOUT: Astrologer No-Show (60s Limit)
    TIMEOUT --> [*]: Auto-Refund & Notify

    ACTIVE --> ACTIVE: 60-Second Minute Tick & Atomic Ledger Debit
    ACTIVE --> LOW_BALANCE_WARN: Balance < 2 Minutes Remaining
    LOW_BALANCE_WARN --> ACTIVE: User In-Session Quick Top-Up
    LOW_BALANCE_WARN --> TERMINATING: Balance Exhausted (0.00 Remaining)
    ACTIVE --> TERMINATING: User or Astrologer Ends Session

    TERMINATING --> COMPLETED: Final Ledger Reconciliation & Session Summary
    COMPLETED --> [*]
```

---

## 2. Pre-Flight Balance Validation & Duration Projection

Prior to initiating any consultation channel (WebRTC audio/video or WebSocket chat):

1. **Pre-Flight Invariant**:
   $$\text{WalletBalance} \ge \text{AstrologerRate} \times 1$$
   * If balance is insufficient, connection is aborted immediately and the Wallet Recharge Modal is surfaced.
2. **Session Duration Projection**:
   $$\text{AvailableDurationMinutes} = \left\lfloor \frac{\text{WalletBalance}}{\text{AstrologerRate}} \right\rfloor$$
   * For an astrologer charging ₹25/min:
     * Balance ₹10.00 $\implies$ Disallowed (Shortfall ₹15.00).
     * Balance ₹110.00 $\implies$ Allowed ($\lfloor 110 / 25 \rfloor = 4 \text{ minutes available}$).
     * Balance ₹500.00 $\implies$ Allowed ($\lfloor 500 / 25 \rfloor = 20 \text{ minutes available}$).

---

## 3. Real-Time Per-Minute Billing Engine

```mermaid
sequenceDiagram
    autonumber
    actor User as User Client
    participant Server as Consultation Service
    participant Ledger as Wallet Ledger
    actor Astro as Astrologer Client

    User->>Server: Start Consultation { astrologerId: "devratan", rate: 25 }
    Server->>Ledger: Verify Balance ≥ 25.00
    Server->>Astro: Ring Astrologer Device
    Astro-->>Server: Accept Call
    Server-->>User: Call Connected (T = 0s)
    
    loop Every 60 Seconds
        Server->>Server: Minute Timer Fires (T = 60s, 120s, ...)
        Server->>Ledger: POST /api/wallet/debit { amount: 25.00, type: "CONSULTATION_DEBIT" }
        Ledger-->>Server: Debited. Remaining: ₹85.00
        Server-->>User: Sync Balance Event { remaining: 85.00, remaining_mins: 3 }
        Server-->>Astro: Sync Earning Event { accrued: 25.00 }
    end

    Note over User,Server: At T = 240s, Balance = ₹0.00
    Server-->>User: Display 30s Grace / Low Balance Banner
    Server-->>User: Terminate Session (Balance Zero)
    Server->>Astro: Disconnect Call
    Server->>Ledger: Commit Final Session Summary
```

---

## 4. Edge Case Handling & Fault Tolerance

### 4.1 Temporary Network Disconnections
* If either participant's connection drops during an active session, a **60-second reconnection grace period** begins.
* If reconnected within 60 seconds, the session resumes seamlessly without double-charging the interruption window.
* If reconnection fails, the session transitions to `TERMINATING` and only elapsed completed minutes are debited.

### 4.2 Graceful Zero-Balance Termination
* Under no circumstances can a consultation continue into negative balance territory.
* When less than 120 seconds of balance remain, an inline non-intrusive alert prompts the user for single-click in-session top-up.
* At $T = \text{Balance} - \text{Rate} < 0$, the server terminates the media stream cleanly, plays a polite wrap-up tone, and presents the rating and session summary dialog.
