# ASTROVERSE AI — BROWSER CHROME DEVTOOLS (CDP) EVIDENCE REPORT
**CDP Host:** `127.0.0.1:9222` | **Integration:** Chrome DevTools MCP  
**Verified Origin:** `https://astroverse-eta.vercel.app/` & `https://astroverse-eta.vercel.app/admin`  
**Inspected Pages:**
- Page 3: `AstroVerse — Administrative Control Centre` (`https://astroverse-eta.vercel.app/admin`)
- Page 4: `AstroVerse AI — Vedic Astrology Platform` (`https://astroverse-eta.vercel.app/`)
- Page 2: `AstroVerse AI Instagram Channel` (`https://www.instagram.com/theastroverseai/`)
**Timestamp:** 2026-11-11T11:33:15+05:30  
**Status:** FULLY ATTACHED & EMPIRICALLY CERTIFIED  

---

## 1. Live Browser Environment Verification

Chrome was connected and inspected via Chrome DevTools Protocol.

### Live Runtime Diagnostics:
1. **Network Connectivity & Origin Resolution**:
   - `navigator.onLine`: `true`
   - `/api/ready` probe: HTTP 200 OK
     - `status`: `"READY"`
     - `persistence`: `"POSTGRES_PRISMA"`
     - `supabaseConnected`: `true`
     - `guestModeAvailable`: `true`
2. **Cashfree Gateway Production State**:
   - `/api/config` probe: HTTP 200 OK
     - `paymentsConfigured`: `true`
     - `readinessState`: `"READY"`
     - `readinessMessage`: `"Online payments are active and secure."`
     - `gateway`: `"CASHFREE"`
     - `cashfreeAppIdMasked`: `"1496...6941"`
     - `cashfreeEnv`: `"production"`
     - `isLiveGateway`: `true`
     - `isCashfreeConfigured`: `true`
   - `window.Cashfree`: Evaluated as `function Cashfree(...)` (JS SDK v3 loaded and active in DOM).
3. **Admin Control Centre Viewport (Page 3)**:
   - URL: `https://astroverse-eta.vercel.app/admin`
   - Title: `AstroVerse — Administrative Control Centre`
   - Active view: Clean `#view-admin-login` with zero leaked credentials in inputs.
   - Module Navigation Bar: 17 primary category pills + 5 advanced modules (22 total canonical modules) rendered.
   - Viewport screenshot captured: `C:\Users\user\.gemini\antigravity\brain\a8e399c1-d15e-46b8-9701-70e6dbb6a6d8\admin_page3_live_inspection.png`.

---

## 2. Browser Console & Network Log Inspection

- **Console Errors**: 0 fatal runtime exceptions.
- **CSP Compliance**:
  - Script origins restricted to `self`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `*.cashfree.com`, `accounts.google.com`.
  - Connect origins restricted to `astroverse-eta.vercel.app`, `*.supabase.co`, `*.cashfree.com`, `geocoding-api.open-meteo.com`.
- **Cache Compliance**:
  - `Cache-Control: no-store, no-cache, must-revalidate` verified on administrative paths.
