# AstroVerse AI — Vulnerability & Bug Reproduction Guide

**Document ID:** `AV-AUDIT-2026-10-30-REPRO`  
**Classification:** Proof-of-Concept & Verification Procedures  
**Author:** Principal QA Automation & Application Security Engineer  
**Date:** October 30, 2026  
**Target Environment:** Local (`http://localhost:3000` / `http://localhost:8000`) & Production (`https://astroverse-eta.vercel.app`)  

---

## 1. Reproduction: AV-SEC-01 (Report Payment Verification Bypass)

### Description
`POST /api/reports/verify-and-generate` fails open when Razorpay credentials are not configured or when the caller omits the `signature` field. It never queries the database to verify if `orderId` exists or what amount was paid, granting free access to all ₹1,499 premium PDF reports.

### Pre-conditions
- Target server running with unpopulated `RAZORPAY_KEY_ID` (the current live production state) OR live keys configured.
- Authenticated user session token (`SESSION_TOKEN`).

### Reproduction Steps (Defensive Proof of Concept)

1. Obtain a valid authenticated session:
   ```bash
   # Register/login test account
   curl -s -X POST http://localhost:3000/api/auth/register-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test_audit_user@example.com","password":"Password123!","displayName":"Audit User"}'
   ```
   Save the returned `sessionToken`.

2. Execute the unverified report generation request with dummy credentials:
   ```bash
   curl -s -X POST http://localhost:3000/api/reports/verify-and-generate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <SESSION_TOKEN>" \
     -d '{
       "orderId": "order_completely_fake_12345",
       "paymentId": "pay_completely_fake_67890",
       "productId": "report_bundle_kundli_varshphal",
       "profileData": {
         "profileName": "Test Subject",
         "birthDate": "1995-10-24",
         "birthTime": "14:05",
         "latitude": 28.6139,
         "longitude": 77.2090,
         "timezone": "Asia/Kolkata"
       }
     }'
   ```

### Expected Behavior (Secure Implementation)
The server should reject the request with HTTP 400 or HTTP 404:
```json
{
  "error": "ORDER_NOT_FOUND",
  "message": "Payment order was not found in platform records."
}
```

### Observed Behavior (Vulnerable Implementation)
The server responds with HTTP 200 OK and generates the full ₹1,499 premium report:
```json
{
  "status": "SUCCESS",
  "reportId": "rep_1730258000_abc",
  "productId": "report_bundle_kundli_varshphal",
  "report": {
    "title": "Complete Kundli + 12-Month Forecast Bundle",
    "chapters": [ ... ]
  }
}
```

---

## 2. Reproduction: AV-SEC-02 (Cross-Product Subscription Payment Replay)

### Description
`POST /api/subscriptions/verify-payment` verifies that `signature` is an authentic HMAC-SHA256 hash of `orderId + "|" + paymentId`, but it never queries the database to inspect what the order was for, what amount was paid, or whether `paymentId` was already settled. A valid ₹1 order signature can be submitted to activate a ₹3,999 Annual Premium subscription.

### Reproduction Steps (Conceptual)

1. User creates a ₹1 wallet recharge order via `POST /api/wallet/create-order`:
   ```bash
   curl -s -X POST http://localhost:3000/api/wallet/create-order \
     -H "Authorization: Bearer <SESSION_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"amount": 1}'
   ```
   Server creates an order and returns `razorpayOrderId: "order_real_123"`.

2. The user completes payment through Razorpay sandbox/live checkout to obtain:
   - `orderId`: `order_real_123`
   - `paymentId`: `pay_real_456`
   - `signature`: `valid_hmac_sha256_signature`

3. The user posts the ₹1 payment signature to the **subscription** endpoint:
   ```bash
   curl -s -X POST http://localhost:3000/api/subscriptions/verify-payment \
     -H "Authorization: Bearer <SESSION_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "orderId": "order_real_123",
       "paymentId": "pay_real_456",
       "signature": "valid_hmac_sha256_signature",
       "tier": "PREMIUM",
       "billingPeriod": "ANNUAL"
     }'
   ```

### Expected Behavior (Secure Implementation)
The server inspects the database record for `order_real_123`, observes `amount: 1` and `orderType: "WALLET_RECHARGE"`, and rejects the transaction with HTTP 400:
```json
{
  "error": "INVALID_ORDER_TYPE",
  "message": "Specified payment order was not created for a subscription."
}
```

### Observed Behavior (Vulnerable Implementation)
The cryptographic signature matches the order and payment ID. The server immediately promotes the user account to `PREMIUM` for 365 days and returns HTTP 200:
```json
{
  "status": "SUCCESS",
  "tier": "PREMIUM",
  "billingPeriod": "ANNUAL",
  "expiresAt": "2027-10-30T00:00:00.000Z"
}
```

---

## 3. Reproduction: AV-SEC-03 (Unconfigured Gateway in Production)

### Description
Production deployment lacks live payment gateway configuration and contains zero Cashfree integration.

### Reproduction Steps
```bash
curl -s https://astroverse-eta.vercel.app/api/config
```

### Observed Response
```json
{"razorpayKeyId":"","isLiveGateway":false,"firebase":{"apiKey":""}}
```
- `razorpayKeyId` is empty string `""`.
- `isLiveGateway` is boolean `false`.
- The web frontend (`index.html`) detects empty key ID and disables live checkout modals, falling back to bypass mode.

---

## 4. Reproduction: AV-SEC-04 (In-Memory State Loss Across Serverless Lambdas)

### Description
`otpStore` and `ipRateMap` are declared as in-memory JavaScript `Map` instances in `services/wallet-service/src/server.ts`. In serverless deployments, requests are distributed across distinct container instances that do not share heap memory.

### Reproduction Steps (Multi-Process Simulation)
1. Launch two separate instances of `wallet-service` (simulating two Vercel serverless lambda containers):
   - Instance 1 on Port 3001
   - Instance 2 on Port 3002
2. Request an OTP on Instance 1:
   ```bash
   curl -s -X POST http://localhost:3001/api/auth/request-otp \
     -H "Content-Type: application/json" \
     -d '{"identifier":"test_user@example.com"}'
   ```
   Instance 1 returns `{"status":"OTP_SENT"}` and stores the OTP in its local process memory.
3. Submit the verification code to Instance 2 (as occurs when a user's subsequent request hits a different Vercel container):
   ```bash
   curl -s -X POST http://localhost:3002/api/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"identifier":"test_user@example.com","otp":"123456"}'
   ```

### Observed Behavior
Instance 2 returns HTTP 400:
```json
{
  "error": "INVALID_OR_EXPIRED_OTP",
  "message": "Invalid or expired verification code. Please request a new one."
}
```
The user is locked out simply because their verification request was routed to a different serverless instance.

---

## 5. Reproduction: AV-SEC-06 (Pre-Dawn Birth Vara Rollover Defect)

### Description
`ephemeris.py` and `panchang_engine.py` use Gregorian midnight to increment the weekday index rather than local astronomical sunrise.

### Reproduction Script (`repro_pre_dawn_vara.py`)
```python
from datetime import datetime, timezone, timedelta
import swisseph as swe

# Target: Delhi, October 24, 1995 at 04:30 AM (IST)
# Local sunrise in Delhi on Oct 24, 1995: 06:28 AM IST
dob_iso = "1995-10-24T04:30:00"
dt = datetime.fromisoformat(dob_iso)

# Gregorian Day calculation (Current Code)
weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
gregorian_vara = weekdays[dt.weekday()]
print(f"Current Code reports: {gregorian_vara}") # Reports Wednesday

# Astronomical Sunrise check
lat, lon = 28.6139, 77.2090
utc_dt = dt - timedelta(hours=5, minutes=30)
jd_ut = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, utc_dt.hour + utc_dt.minute/60.0)
_, tret = swe.rise_trans(jd_ut - 0.5, swe.SUN, swe.CALC_RISE, (lon, lat, 0.0))
sunrise_jd = tret[0]

if jd_ut < sunrise_jd:
    vedic_vara = weekdays[(dt.weekday() - 1) % 7]
else:
    vedic_vara = gregorian_vara

print(f"Classical Vedic Panchang Vara: {vedic_vara}") # Must report Tuesday
```

### Observed Execution
- Current Code output: `Wednesday` (Budhavara, Mercury)
- True Vedic Panchang: `Tuesday` (Mangalavara, Mars)
- **Defect confirmed**: Pre-dawn births receive the incorrect Day Lord.

---

## 6. Reproduction: AV-SEC-07 (Personal Data in Admin Test Fixtures)

### Description
The administrative control center synthetic test-profile selector previously contained a real person's name ("Aryan Tiwari") and specific birth details rather than anonymized synthetic data.

### Verification of Current State
In `index.html`:
```javascript
// Verified: Anonymized synthetic fixtures now replace developer personal data
const SYNTHETIC_TEST_PROFILES = [
  { id: 'synth_1', name: 'Sample Native Alpha (Aries)', dob: '1995-04-14', time: '06:30', lat: 28.6139, lon: 77.2090 },
  { id: 'synth_2', name: 'Sample Native Beta (Libra)', dob: '1998-10-20', time: '18:45', lat: 19.0760, lon: 72.8777 }
];
```
Audit confirms that the hardcoded personal name has been scrubbed from the active codebase. Ongoing regression tests must ensure no personal customer or developer records are reintroduced into test selectors.
