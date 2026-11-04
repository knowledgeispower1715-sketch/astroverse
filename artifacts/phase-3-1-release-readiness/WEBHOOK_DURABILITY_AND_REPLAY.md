# ASTROVERSE WEBHOOK DURABILITY, IDEMPOTENCY & REPLAY DEFENSE AUDIT

**Document Status:** Enterprise Payment Gateway Integration Certification  
**Author:** Principal Distributed Systems & Payment Security Specialist  
**Branch:** `fix/enterprise-security-and-hardening`  
**Primary Target:** Webhook Pipeline & `WebhookEvent` Model  

---

## 1. Vulnerability Diagnosis

### 1.1 In-Memory Ephemeral Sets
Prior to Phase 3.1, webhook replay protection relied on in-memory JavaScript `Set`:
```typescript
// VULNERABLE IN-MEMORY SET
const processedWebhooks = new Set<string>();
```
Whenever the server restarted, deployed a new version, scaled horizontally, or handled container churn, the `Set` was completely wiped. Any delayed webhook retry from Cashfree (which retries for up to 24 hours on HTTP 5xx or transient timeouts) would be treated as completely new, re-executing wallet credits or order fulfillments!

---

## 2. Hardened Architecture & Implementation

### 2.1 Durable PostgreSQL `WebhookEvent` Table
Added to `services/wallet-service/prisma/schema.prisma` and runtime DDL in `services/wallet-service/src/schemaBootstrap.ts`:

```prisma
model WebhookEvent {
  id                  String    @id @default(uuid())
  provider            String    @default("CASHFREE")
  providerEventId     String    @unique
  providerOrderId     String?
  providerPaymentId   String?
  eventType           String
  payloadHash         String
  processingStatus    String    @default("PENDING") // PENDING, PROCESSING, PROCESSED, FAILED, RETRYABLE_FAILURE
  receivedAt          DateTime  @default(now())
  processingStartedAt DateTime?
  completedAt         DateTime?
  attemptCount        Int       @default(0)
  lastError           String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([providerOrderId])
  @@index([processingStatus])
  @@index([createdAt])
}
```

### 2.2 Atomic Claim Pattern with Lease Timeout
In `services/wallet-service/src/db.ts`:
```typescript
export async function claimWebhookEvent(params: {
  provider: string;
  providerEventId: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  eventType: string;
  payloadHash: string;
}): Promise<{ claimed: boolean; status: string; existing?: boolean }> {
  // 1. Check existing record
  // If PROCESSED -> Return { claimed: false, status: 'PROCESSED', existing: true } (Ignore replay)
  // If PROCESSING within 60s lease -> Return { claimed: false, status: 'PROCESSING', existing: true } (In-flight concurrent claim denied)
  // If new or RETRYABLE_FAILURE / lease expired -> Atomically claim status = 'PROCESSING', processingStartedAt = now()
}

export async function completeWebhookEvent(providerEventId: string): Promise<void> {
  // Transitions status = 'PROCESSED', completedAt = now()
}

export async function failWebhookEvent(providerEventId: string, error: string): Promise<void> {
  // Transitions status = 'RETRYABLE_FAILURE', lastError = error, attemptCount += 1
}
```

### 2.3 Webhook Handler Integration
In `services/wallet-service/src/server.ts` (lines 7600-7680):
```typescript
app.post('/api/webhooks/cashfree', async (req, res) => {
  // 1. Signature verification
  // 2. Claim event atomically
  const claimResult = await claimWebhookEvent({
    provider: 'CASHFREE',
    providerEventId: eventId,
    providerOrderId: orderId,
    providerPaymentId: paymentId,
    eventType: type,
    payloadHash
  });

  if (!claimResult.claimed) {
    // Acknowledge Cashfree with HTTP 200 so they do not hammer retries, but DO NOT re-process!
    return res.status(200).json({
      status: 'OK',
      duplicate: true,
      action: 'ignored',
      message: `Event ${eventId} is already ${claimResult.status}`
    });
  }

  try {
    // 3. Process business logic (fulfill order / credit wallet)
    // ...
    await completeWebhookEvent(eventId);
    return res.status(200).json({ status: 'OK', processed: true });
  } catch (err: any) {
    await failWebhookEvent(eventId, err?.message || 'Processing failed');
    return res.status(500).json({ status: 'ERROR', error: 'PROCESSING_FAILED' });
  }
});
```

---

## 3. Adversarial Validation Evidence

Tested in `services/wallet-service/tests/phase_3_1_enterprise_adversarial.test.ts`:
- **Test 5.1:** Worker 1 claims event `evt_cf_001` -> returns `claimed: true`. Concurrent Worker 2 attempts same event -> returns `claimed: false, status: 'PROCESSING'` and rejects duplicate execution. **PASS**
- **Test 5.2:** Transient failure transitions event to `RETRYABLE_FAILURE` with `lastError` and incremented `attemptCount`. Subsequent valid attempt is permitted to retry. **PASS**

**Result:** Enterprise-grade webhook durability surviving container recycles, network retries, and high-concurrency races.
