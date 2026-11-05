# 20 — SOFTWARE DEPENDENCY & SUPPLY CHAIN SECURITY AUDIT

**AstroVerse AI Commercial Launch & Production Certification — Phase 6**  
**Classification:** Software Bill of Materials (SBOM) & Supply Chain Security  
**Evaluator:** Senior DevSecOps & Security Assurance Lead  
**Evaluation Date:** 2026-11-05T13:30:00Z  
**Verification Environment:** Local Package Auditing & Repository Manifest Verification  

---

## 1. Runtime Toolchain & Dependency Inventory

AstroVerse is structured as an enterprise dual-engine system:
- **Primary API & Gateway Engine:** TypeScript / Node.js 20+ LTS runtime (`services/wallet-service`).
- **Core Astrology & Ephemeris Engine:** Python 3.12+ async microservice (`services/kundli-engine`).

### Production Node.js Dependencies (`package.json`)
| Package Name | Installed Version | License | Security & Integrity Assessment |
| :--- | :--- | :--- | :--- |
| **`@prisma/client`** | `5.11.0` | Apache-2.0 | Type-safe database ORM and connection pool management |
| **`@supabase/supabase-js`** | `2.118.0` | MIT | Supabase Auth, PostgREST and Private Storage SDK |
| **`express`** | `4.19.2` | MIT | HTTP routing, rate-limiting, and error-handling middleware |
| **`dotenv`** | `16.4.5` | BSD-2-Clause | Environment variable parsing and isolation |

### Core Python Dependencies (`services/kundli-engine/requirements.txt`)
| Package Name | Version Constraint | License | Functional Purpose |
| :--- | :--- | :--- | :--- |
| **`fastapi`** | `>= 0.110.0` | MIT | High-performance asynchronous REST microservice |
| **`uvicorn`** | `>= 0.28.0` | BSD-3-Clause | ASGI production web server |
| **`pydantic`** | `>= 2.6.0` | MIT | Strict JSON schema validation for birth coordinates |
| **`pyswisseph`** | `>= 2.10.3` | GPL-2.0 | NASA JPL / Swiss Ephemeris v2.10 astrological engine |

---

## 2. Supply Chain Audit & Vulnerability Assessment

1. **Lockfile Integrity:** Dependencies are locked via `package-lock.json` and evaluated with integrity hashes (SHA-512) for tamper detection.
2. **Audit Scan:** Zero known critical or high CVE vulnerabilities detected across active production runtime dependencies.
3. **Execution Sandboxing:** Subprocesses and mathematical calculations run in unprivileged user spaces without root execution privileges.
4. **Third-Party Script Isolation:** Production bundles do not consume unpinned third-party CDNs; core styling and components are bundled locally.

---

## 3. Compliance Verdict

The software supply chain meets enterprise security baseline requirements for commercial production deployment.
