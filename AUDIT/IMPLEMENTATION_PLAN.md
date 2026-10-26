# AstroVerse AI — Master Implementation & Remediation Plan

**Document Date:** October 26, 2026  
**Architect:** Principal Software Architect  

---

## Sequenced Execution Roadmap

### Workstream 1: Visual Identity & Asset Generation (Phases 3 & 4)
1. Generate original, production-grade icon and splash assets for `apps/mobile/assets/`:
   - `icon.png` (1024 × 1024, celestial gold dharmachakra on cosmic midnight background)
   - `splash.png` (2048 × 2048, branded launch screen with cosmic constellation starfield)
   - `adaptive-icon.png` (1024 × 1024 Android adaptive foreground)
   - `favicon.png` (48 × 48 web & mobile browser icon)
2. Generate original SVG vector illustrations for web & mobile service features:
   - Hero Celestial Constellation & Zodiac Wheel
   - Vedic Janam Kundli geometric diagram
   - 24-Hour Solar Horas time wheel
   - 36-Guna Synastry harmony glyph
   - Vedic Numerology 3x3 Yantra grid
   - Multi-horizon transit & Dasha timeline
3. Compile `AUDIT/IMAGE_ASSET_MANIFEST.md` documenting dimensions, license, provenance, and alt text.

### Workstream 2: Mobile Application Hardening (Phases 6 & 11)
1. Add in-app account deletion flow in `apps/mobile/src/screens/ProfileScreen.tsx` with user confirmation dialog, API deletion request (`DELETE /api/user/account`), and clean state cleanup.
2. Add legal policy links (Terms, Privacy, Refund, Support) into `apps/mobile/src/screens/ProfileScreen.tsx`.
3. Create `apps/mobile/eas.json` defining standard development, preview, and production profiles.
4. Verify `npm --prefix apps/mobile run typecheck` and `npm --prefix apps/mobile test`.

### Workstream 3: Web Application & Personalization Polish (Phases 2, 5, 7, 8)
1. Verify personalized greeting, active birth-profile selector, planetary Horas countdown bounds (ensuring zero negative or NaN duration), and transit highlights.
2. Verify educational and non-deterministic astrological notices.
3. Validate responsive behavior across 320px–1920px viewports.

### Workstream 4: Release & Store Submission Readiness (Phases 10, 15, 16)
1. Create `AUDIT/STORE_SUBMISSION_CHECKLIST.md` detailing App Store and Play Store review credentials, privacy nutrition labels, store copy, and review notes.
2. Produce operational readiness checklists for error monitoring and rollback procedures.

### Workstream 5: Comprehensive Verification & Final Reports (Phases 14 & 18)
1. Run all monorepo test suites (wallet-service 8 suites, kundli-engine 86 pytest, apps/mobile 13 tests).
2. Execute TypeScript compile checks across all workspaces.
3. Generate final release deliverables:
   - `AUDIT/FINAL_VERIFICATION_REPORT.md`
   - `AUDIT/FEATURE_ACCEPTANCE_MATRIX.md`
   - `AUDIT/SECURITY_REMEDIATION_REPORT.md`
   - `AUDIT/RESPONSIVE_AND_VISUAL_QA.md`
   - `AUDIT/IMAGE_ASSET_MANIFEST.md`
   - `AUDIT/MOBILE_RELEASE_READINESS.md`
   - `AUDIT/STORE_SUBMISSION_CHECKLIST.md`
   - `AUDIT/KNOWN_ISSUES_AND_BLOCKERS.md`
4. Commit, merge, and verify live deployment on Vercel.
