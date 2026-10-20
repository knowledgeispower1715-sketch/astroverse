# Third-Party Integrations & External Services — Astroverse

## 1. Authentication & SMS/Email Gateways

### 1.1 Phone OTP (Twilio / MSG91)
* **Purpose**: Passwordless mobile phone authentication and user identity verification.
* **Flow**:
  1. User submits mobile number with country code (`+919876543210`).
  2. Server generates a cryptographically random 6-digit numeric OTP and stores it in Redis with a 300-second TTL.
  3. SMS dispatch is initiated via Twilio REST API:
     ```typescript
     await twilioClient.messages.create({
       body: `Your Astroverse verification code is: ${otp}. Valid for 5 minutes.`,
       from: process.env.TWILIO_PHONE_NUMBER,
       to: phoneNumber
     });
     ```
  4. **Development / Offline Fallback**: In non-production environments without active carrier credits, `devPreviewOtp` is returned in the API response to allow end-to-end testing without blocking developers.

### 1.2 Email Magic Link & OTP (Resend / SendGrid)
* **Purpose**: Email-based authentication and consultation receipt delivery.
* **Flow**:
  1. User submits email address.
  2. Secure verification code is dispatched via Resend API (`POST https://api.resend.com/emails`).
  3. Verification confirms email ownership and mints a session JWT.

---

## 2. Payment Gateway & Financial Ledger (Razorpay)

### 2.1 Order Creation
* **Endpoint**: `POST /api/wallet/create-order`
* **Payload**: `{ "userId": "...", "amount": 500 }`
* **Implementation**:
  ```typescript
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // Converted to paise
    currency: 'INR',
    receipt: `rcpt_${userId.slice(0, 8)}_${Date.now()}`,
    notes: { userId, service: 'Astroverse Wallet Recharge' }
  });
  ```

### 2.2 Payment Verification & Signature Integrity
* **Endpoint**: `POST /api/wallet/verify-payment`
* **Verification Algorithm**:
  ```typescript
  import crypto from 'crypto';

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    throw new Error('INVALID_PAYMENT_SIGNATURE');
  }
  ```
* **Ledger Idempotency**:
  - The payment ID is recorded in `PaymentOrder`.
  - Once verified, balance credit is applied in an atomic database transaction using Prisma `$transaction`, creating an immutable `WalletLedger` entry.

---

## 3. Real-Time WebRTC & Consultation Service

### 3.1 Signaling Architecture (Socket.IO + Redis)
* **Service**: `services/consultation-service`
* **Events**:
  * `join-session`: User or astrologer connects to a consultation room.
  * `chat-message`: End-to-end encrypted messaging with message persistence.
  * `call-signal`: SDP offer, answer, and ICE candidate exchange for peer-to-peer WebRTC media.
  * `session-tick`: Broadcasts elapsed consultation seconds and remaining balance.

### 3.2 Automated Per-Minute Billing & Auto-Termination
* A 60-second billing interval timer tracks active voice/video/chat sessions.
* Every minute, `consultation-service` dispatches a billing request to `wallet-service`:
  ```typescript
  await axios.post(`${process.env.WALLET_SERVICE_URL}/api/wallet/settle-minute`, {
    userId,
    astrologerId,
    costPerMinute
  });
  ```
* If the user's wallet balance drops below 1 billable minute, the service sends a `balance-exhausted` event and gracefully terminates the WebRTC session.

### 3.3 Media Streaming (Agora / LiveKit)
* For low-latency mobile and desktop video calls, the platform supports Agora RTC SDK with token generation handled via server-side HMAC credentials (`AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`).

---

## 4. Grounded AI Astrologer Guru & Speech Synthesis

### 4.1 LLM Astrological Synthesis
* **Service**: `services/kundli-engine/ai_astrologer.py`
* **Grounded Context Injection**:
  - Exact planetary placements, signs, degrees, and house lords.
  - Active Vimshottari Mahadasha and Antardasha.
  - Manglik, Kaal Sarp, and Shani Sade Sati transit status.
* **Prompt Contract**:
  - Responses must ground predictions strictly in classical Parashari principles.
  - Output is categorized into Career, Love & Marriage, Finance, and Remedies.
  - Multi-horizon forecasts (Hourly, Daily, Weekly, Monthly, Yearly) provide granular guidance.
* **Deterministic Fallback**: When external LLM APIs are unreachable, a deterministic Parashari synthesis engine generates structured, chart-derived counsel without throwing runtime errors.

### 4.2 Text-to-Speech (TTS) Voice Readout
* **Client Implementation**:
  - Leverages standard Web Speech API (`window.speechSynthesis`).
  - Configured with localized speech synthesis (Indian English or Hindi voice accents when available).
  - Includes real-time Audio Visualizer animation and Play/Pause speech controls in the Astroverse interface.
