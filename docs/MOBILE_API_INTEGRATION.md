# AstroVerse Mobile API Integration Specification

**API Gateway Base URLs**:
* **Production Unified Vercel Route**: `https://astroverse-eta.vercel.app`
* **Local Development Wallet Service**: `http://localhost:5000` (Node.js/Express)
* **Local Development Kundli Engine**: `http://localhost:8000` (Python FastAPI)

---

## 1. Authentication & User Endpoints (`wallet-service`)

### 1.1 Request One-Time Password (OTP)
* **Endpoint**: `POST /api/auth/request-otp`
* **Headers**: `Content-Type: application/json`
* **Request Payload**:
  ```json
  {
    "identifier": "user@example.com",
    "channel": "email"
  }
  ```
* **Response**:
  ```json
  {
    "status": "OTP_DISPATCHED",
    "identifier": "user@example.com",
    "cooldownSeconds": 60,
    "previewOtp": "123456"
  }
  ```

### 1.2 Verify OTP & Issue Session
* **Endpoint**: `POST /api/auth/verify-otp`
* **Request Payload**:
  ```json
  {
    "identifier": "user@example.com",
    "otp": "123456"
  }
  ```
* **Response**:
  ```json
  {
    "status": "AUTHENTICATED",
    "token": "256-bit-session-token",
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "role": "USER",
      "walletBalance": 0.0
    }
  }
  ```

### 1.3 Password Login & Registration
* **Endpoints**: 
  - `POST /api/auth/register-password`
  - `POST /api/auth/login-password`
* **Request Payload**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }
  ```

### 1.4 Birth Profile Management
* **Create Profile**: `POST /api/profiles`
* **List User Profiles**: `GET /api/profiles/:userId` (requires `Authorization: Bearer <token>`)
* **Delete Profile**: `DELETE /api/profiles/:id` (requires `Authorization: Bearer <token>`)
* **Profile Schema**:
  ```json
  {
    "id": "prof_101",
    "userId": "usr_abc123",
    "name": "Aryan Tiwari",
    "gender": "Male",
    "dateOfBirth": "2005-08-20",
    "timeOfBirth": "14:05",
    "birthPlace": "Jabalpur, Madhya Pradesh, India",
    "latitude": 23.1815,
    "longitude": 79.9864,
    "timezone": "Asia/Kolkata",
    "isDefault": true
  }
  ```

### 1.5 Prediction Report Persistence
* **Save Report**: `POST /api/reports/save`
* **Fetch User Reports**: `GET /api/reports/:userId`
* **Payload**:
  ```json
  {
    "title": "HOURLY Personal Guidance: Sun Window",
    "reportType": "PREDICTION_HOURLY",
    "payload": { ... }
  }
  ```

---

## 2. Astronomical & Prediction Endpoints (`kundli-engine`)

### 2.1 Calculate Kundli & Divisional Charts
* **Endpoint**: `POST /api/kundli/calculate`
* **Payload**:
  ```json
  {
    "dob": "2005-08-20T14:05:00",
    "lat": 23.1815,
    "lon": 79.9864,
    "timezone": "Asia/Kolkata",
    "unknown_time": false
  }
  ```
* **Output**: D1 Rashi, D9 Navamsha, D10 Dashamsha, Moon Chart, Chalit Chart, Planetary Longitudes, Nakshatras, Padas, Vimshottari Dasha, and Doshas.

### 2.2 24-Hour Planetary Horas & Muhurta
* **Endpoint**: `POST /api/horas/24h`
* **Payload**:
  ```json
  {
    "date": "2026-10-21",
    "lat": 23.1815,
    "lon": 79.9864,
    "timezone": "Asia/Kolkata"
  }
  ```
* **Output**: Sunrise, sunset, next sunrise, 12 daytime and 12 nighttime unequal Horas with millisecond boundaries (`start_epoch_ms` and `end_epoch_ms`), Rahu Kaal, Yamaganda, Gulika Kaal.

### 2.3 Multi-Horizon Predictions
* **Endpoint**: `POST /api/predictions/generate`
* **Payload**:
  ```json
  {
    "horizon": "hourly | daily | weekly | monthly | yearly | mahadasha",
    "target_date": "2026-10-21",
    "dob": "2005-08-20T14:05:00",
    "lat": 23.1815,
    "lon": 79.9864,
    "timezone": "Asia/Kolkata",
    "active_hora_planet": "Sun",
    "hora_window": "05:36 PM - 06:39 PM"
  }
  ```
* **Output**: Standardized 7-section report (A. Outlook, B. Supportive, C. Challenges, D. Time Windows, E. Grounding, F. Reflection, G. Limitations).

### 2.4 AI Astrologer Consultation
* **Endpoint**: `POST /api/ai-astrologer/ask`
* **Payload**:
  ```json
  {
    "category": "career | marriage | wealth | health",
    "question": "When will I get promoted in my job?",
    "astrologer_name": "Acharya Devratan | Dr. Sunita Shastri | Pandit Raghavendra",
    "dob": "2005-08-20T14:05:00",
    "lat": 23.1815,
    "lon": 79.9864
  }
  ```
