# Astroverse External Provider Setup & Configuration Manual

**Project**: Astroverse Vedic Astrology Platform  
**Purpose**: Production Credentials, Webhook Setup, and Provider Integration  
**Scope**: SMS (Twilio/MSG91), Email (Resend/SendGrid), Payment Gateway (Razorpay), and Astrology Calculation APIs  

---

## 1. SMS Communication Providers (Phone OTP)

### 1.1 Twilio Integration
To enable global SMS dispatch for phone OTP authentication:

1. Create a Twilio account at [twilio.com](https://www.twilio.com) and navigate to the Console.
2. Obtain your **Account SID**, **Auth Token**, and an SMS-enabled **Phone Number**.
3. Add credentials to `.env`:
   ```env
   TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=+12025550199
   ```
4. Code Integration (`services/wallet-service/src/providers/twilio.ts`):
   ```typescript
   import twilio from 'twilio';
   const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

   export async function sendSmsOtp(to: string, otp: string) {
     return client.messages.create({
       body: `Your Astroverse verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
       from: process.env.TWILIO_PHONE_NUMBER,
       to
     });
   }
   ```

### 1.2 MSG91 Integration (India DLT Compliance)
For delivery within India adhering to TRAI DLT regulations:
```env
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_TEMPLATE_ID=your_dlt_registered_template_id
MSG91_SENDER_ID=ASTROV
```

---

## 2. Email Communication Providers (Email OTP & Reports)

### 2.1 Resend Integration (Recommended)
1. Register at [resend.com](https://resend.com) and verify your sending domain (e.g. `mail.astroverse.app`).
2. Configure DNS SPF, DKIM, and DMARC records with your domain registrar.
3. Generate an API Key and update `.env`:
   ```env
   RESEND_API_KEY=re_123456789_abcdefghijklmnopqrst
   FROM_EMAIL=security@astroverse.app
   ```
4. Code Integration:
   ```typescript
   import { Resend } from 'resend';
   const resend = new Resend(process.env.RESEND_API_KEY);

   export async function sendEmailOtp(to: string, otp: string) {
     return resend.emails.send({
       from: `Astroverse Security <${process.env.FROM_EMAIL}>`,
       to,
       subject: `Your Astroverse Verification Code: ${otp}`,
       html: `<p>Your one-time login code is: <strong>${otp}</strong>. Valid for 5 minutes.</p>`
     });
   }
   ```

### 2.2 SendGrid Fallback
```env
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=support@astroverse.app
```

---

## 3. Payment Gateway Integration (Razorpay)

Razorpay powers wallet recharges and direct puja bookings:

1. Register at [dashboard.razorpay.com](https://dashboard.razorpay.com).
2. Generate API Keys in **Settings > API Keys** (Test & Live modes).
3. Set Webhook URL to `https://your-domain.com/api/wallet/webhook` and enable events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
4. Add credentials to `.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_live_your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_signing_secret
   ```
5. Verification logic in `src/razorpay.ts` computes:
   ```typescript
   const expectedSignature = crypto
     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
     .update(`${orderId}|${paymentId}`)
     .digest('hex');
   ```

---

## 4. Third-Party Astrology Calculation APIs

### 4.1 FreeAstroAPI Integration
* **Base URL**: `https://api.freeastroapi.com`
* **API Key Header**: `x-api-key: <CONFIGURED_IN_SERVER_ENV>`
* Environment:
  ```env
  FREE_ASTRO_API_KEY=your_free_astro_api_key_here
  ```

### 4.2 Prokerala Astrology API
* **Base URL**: `https://api.prokerala.com/v2/astrology`
* **OAuth 2.0 Token Endpoint**: `https://api.prokerala.com/token`
* Environment:
  ```env
  PROKERALA_CLIENT_ID=your_prokerala_client_id_here
  PROKERALA_CLIENT_SECRET=your_prokerala_client_secret_here
  ```

---

## 5. Development & Testing Simulation Hook

In local development or staging environments lacking active external SMS/Email carrier credentials, the server-side gateway gracefully logs the generated cryptographic OTP to the backend stdout and returns `devPreviewOtp` in API responses:

```json
{
  "status": "OTP_SENT",
  "message": "Verification code sent to +919876543210.",
  "cooldownSeconds": 60,
  "devPreviewOtp": "543832"
}
```

This architecture ensures:
1. Complete cryptographic path traversal (generation, expiry, attempt-counting, single-use eviction).
2. Zero client-side mock code or offline hardcoded OTP bypasses.
3. Seamless developer testing and automated test suite execution without carrier billing charges.
