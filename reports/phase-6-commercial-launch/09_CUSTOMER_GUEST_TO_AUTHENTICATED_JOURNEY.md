# 09 — CUSTOMER GUEST-TO-AUTHENTICATED JOURNEY & DATA MIGRATION

**AstroVerse AI Commercial Launch & Production Certification — Phase 6**  
**Classification:** Customer Experience & State Migration Security  
**Evaluator:** Senior Full-Stack & UX Architecture Engineer  
**Evaluation Date:** 2026-11-05T13:27:00Z  
**Verification Environment:** Local Automated Regression & Frontend Journey Tests  

---

## 1. Guest Journey Architecture

To minimize friction and drop-off during user onboarding, AstroVerse provides an unauthenticated guest mode:
1. **Frictionless Entry:** First-time visitors can enter birth details (name, date, time, birthplace coordinates) and immediately view their Lagna chart and initial astrological overview without creating an account.
2. **Local Storage Sandboxing:** Guest birth details and temporary calculation caches are kept in browser-isolated ephemeral storage (localStorage / sessionStorage).
3. **Monetization & Persistence Gate:** When the guest attempts to unlock premium Mahadasha predictions, save reports, recharge wallet, or book consultations, an authentication modal is presented.

---

## 2. Seamless Guest Migration Protocol

Upon successful registration or login (via Password, OTP, or Supabase OAuth), the client seamlessly migrates local guest profiles to durable cloud storage via:
`POST /api/user/migrate-guest`

### Request Contract
```json
{
  "profiles": [
    {
      "profileName": "Aarav Sharma",
      "dateOfBirth": "1994-08-15",
      "timeOfBirth": "14:30",
      "birthplaceName": "New Delhi, India",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "resolvedTimezone": "Asia/Kolkata"
    }
  ]
}
```

### Security & Integrity Controls
- **Authentication Required:** Requests without a valid session token return `HTTP 401 Unauthorized`.
- **Payload Validation:** Rejects empty profile arrays or malformed coordinates (`HTTP 400`).
- **Owner Re-binding:** Every migrated profile has its `userId` derived server-authoritatively from the verified session token.
- **Idempotency Guarantee:** Duplicate migrations check for existing profiles with identical name, DOB, and coordinates under that user, preventing profile duplication.

---

## 3. Test Verification Matrix

Verified under `tests/auth.test.ts` and `tests/privacy_and_form_state.test.ts`:

| Scenario | Payload & Conditions | Expected Outcome | Measured Status |
| :--- | :--- | :--- | :--- |
| **Unauthenticated Migration** | Valid profile payload, no `Authorization` header | `HTTP 401 Unauthorized` | **PASSED** |
| **Empty Migration Array** | Authenticated user, `{ profiles: [] }` | `HTTP 400 PROFILES_REQUIRED` | **PASSED** |
| **Invalid Coordinates** | Authenticated user, `latitude: 120.0` | `HTTP 400 INVALID_COORDINATES` | **PASSED** |
| **Valid Profile Migration** | Authenticated user, valid birth profile | `HTTP 200 { success: true, count: 1 }` | **PASSED** |
| **Idempotent Re-migration** | Re-sending identical profile payload | `HTTP 200 { success: true, count: 1, created: 0 }` | **PASSED** |
| **Cross-User Injection** | Attacker includes `userId` in profile payload | Server discards client `userId`, derives from token | **PASSED** |

---

## 4. Conclusion

The guest-to-authenticated customer transition is frictionless, safe against IDOR and spoofing, and prevents data loss across all supported devices and browsers.
