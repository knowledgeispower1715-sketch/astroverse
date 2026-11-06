# ASTROVERSE AI — PHASE 6.3 CASHFREE CUSTOMER PAYMENT JOURNEY & PROVIDER INTEGRATION

**Document Reference:** `reports/phase-6-final/07_CASHFREE_CUSTOMER_PAYMENT_JOURNEY.md`  
**Payment Gateway:** Cashfree Payments  
**Integration Protocol:** Direct REST API v6 (`2026-01-01`) + S2S Webhooks  
**Canonical App ID:** `14962482c27cb93db2c6bc6e4af8426941`  
**Classification:** Commercial Checkout, Gateway State Machine & Entitlement Verification  
**Status:** PASS — END-TO-END WORKFLOW VERIFIED  

---

## 1. Customer Payment Journey Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer
    participant UI as AstroVerse Web App
    participant Wallet as Wallet Service Backend
    participant CF as Cashfree PG Engine
    participant DB as PostgreSQL Database

    User->>UI: Selects ₹100 Wallet Pack (₹118 payable)
    UI->>Wallet: POST /api/wallet/create-order { packId: "pack_100" } (Bearer JWT)
    Wallet->>DB: Persists Order (status: PENDING, amount: 118.00)
    Wallet->>CF: POST /pg/orders (order_id, order_amount: 118, customer_details)
    CF-->>Wallet: Returns { payment_session_id: "session_cf_xyz123" }
    Wallet-->>UI: Returns { orderId, paymentSessionId }
    UI->>CF: Cashfree Drop-in SDK loads session_cf_xyz123
    User->>CF: Authorizes UPI Payment (₹118.00)
    CF->>CF: Captures Payment (cf_payment_id: 9918273645)
    
    par Webhook Dispatch (Authoritative S2S)
        CF->>Wallet: POST /api/wallet/webhook (HMAC Signature + Timestamp + Body)
        Wallet->>Wallet: Timing-Safe HMAC-SHA256 Verification
        Wallet->>DB: Atomic Claim: PAYMENT_SUCCESS_WEBHOOK_order_100_9918273645
        Wallet->>DB: Transaction: UPDATE orders SET status = 'PAID'; UPDATE wallets SET balance = balance + 110.00
        Wallet-->>CF: HTTP 200 { status: "EVENT_PROCESSED" }
    and Browser Return (Informational)
        CF-->>UI: Redirects to return_url?order_id=order_100
        UI->>Wallet: POST /api/wallet/verify-payment { orderId: "order_100" }
        Wallet->>DB: Reads Order Status (PAID)
        Wallet-->>UI: HTTP 200 { status: "PAID", walletBalance: 110.00 }
    end
    UI-->>User: Displays "Recharge Successful! ₹110 Added to Balance"
```

---

## 2. Multi-Attempt Payment Reconciliation

In real-world payment environments, a customer may attempt payment multiple times for a single order (e.g. UPI app timeout, followed by a successful Debit Card payment):
1. **First Attempt (Failed):**
   - User initiates UPI transaction: `cf_payment_id = 9918273640`
   - Payment fails or times out: `payment_status = "FAILED"`
   - Webhook `PAYMENT_FAILED_WEBHOOK` received.
   - Handled gracefully: Order remains open for retry; zero wallet credit issued.
2. **Second Attempt (Success):**
   - User initiates Card payment: `cf_payment_id = 9918273645`
   - Payment succeeds: `payment_status = "SUCCESS"`
   - Webhook `PAYMENT_SUCCESS_WEBHOOK` received with distinct `cf_payment_id`.
   - Webhook claimed idempotently under `PAYMENT_SUCCESS_WEBHOOK_order_100_9918273645`.
   - Order transitioned to `PAID` and ₹110 wallet credit added.
3. **Subsequent Delivery of Earlier Failed Event:**
   - Cashfree delivers earlier delayed event or retry.
   - System checks `order.status === OrderStatus.PAID`; since order is already fulfilled, it rejects duplicate balance mutation while acknowledging delivery with `HTTP 200`.

---

## 3. Webhook Delivery & Retry Schedule Verification

Cashfree operates a structured webhook retry schedule (exponential backoff over 24 hours):
- **Timestamp Freshness:** On each retry attempt, Cashfree computes a fresh `x-webhook-timestamp` reflecting the time of dispatch, coupled with a newly signed `x-webhook-signature`.
- **Durable Deduplication:** Because timestamps change across retries, timestamp validation alone is insufficient for replay prevention. AstroVerse indexes every webhook transaction by compound unique key `(eventType, orderId, cfPaymentId)` in PostgreSQL, guaranteeing that even delayed or out-of-order retries never trigger duplicate wallet crediting.
