# Project: 3D Vedic Calendar Repair

## Architecture

- Client (React): `src/` (includes `DoshaGrid3D.tsx`, `AstroCalendarContext.js`, `ApiClient.js`)
- Server (Node/TS): `services/wallet-service/src/server.ts`

## Feature Inventory

| #   | Feature                 | Description                                             | Milestone | Source |
| --- | ----------------------- | ------------------------------------------------------- | --------- | ------ |
| F1  | Backend Stabilization   | CORS/CSP configuration (server.ts)                      | M1        | Task 3 |
| F2  | API Client Finalization | Integrate `ApiClient.js` with `AstroCalendarContext.js` | M2        | Task 4 |
| F3  | 3D Grid Sync            | Loading state in `DoshaGrid3D.tsx`                      | M3        | Task 5 |
| F4  | Verification            | Verify & Push                                           | M4        | Task 6 |

## Milestones

| #   | Name            | Scope                                                          | Dependencies | Status  |
| --- | --------------- | -------------------------------------------------------------- | ------------ | ------- |
| 1   | Backend Cleanup | CORS/CSP refinement in `services/wallet-service/src/server.ts` | none         | PLANNED |
| 2   | API Integration | Finalize `ApiClient` integration                               | M1           | PLANNED |
| 3   | 3D Grid Sync    | Fix loading state in `DoshaGrid3D.tsx`                         | M2           | PLANNED |
| 4   | Verification    | Verify & Push                                                  | M3           | PLANNED |

## Interface Contracts

- API Client uses `process.env.API_BASE_URL` or `http://localhost:5000`
- Server uses `process.env.PORT` or `5000`
