# AstroVerse AI Specialist Skills Inventory

**Generated**: 2026-11-21  
**Project**: AstroVerse AI (`e:\rea`)  
**Workspace Skill Path**: `e:\rea\.agents\skills\`  
**Target Suite**: Universal Multi-Seeker AI Vedic Astrology Consultation Platform

---

## 1. Primary Specialist Skills Inventory (The 13 Core Capabilities)

| Skill                                       | Status                   | Installation Path                                                   | Verified Active | Notes                                                                                                         |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------- |
| `conversational-ai-engineering`             | **CREATED IN WORKSPACE** | `.agents/skills/conversational-ai-engineering/SKILL.md`             | Yes             | Human-quality tone, 12-domain intent classification, anti-repetition rules, AI identity transparency.         |
| `conversation-memory-and-rag`               | **CREATED IN WORKSPACE** | `.agents/skills/conversation-memory-and-rag/SKILL.md`               | Yes             | Sliding context window (<3500 tokens), rolling summaries, classical Jyotish RAG, PII sanitization.            |
| `multi-seeker-identity-resolution`          | **CREATED IN WORKSPACE** | `.agents/skills/multi-seeker-identity-resolution/SKILL.md`          | Yes             | Self/Spouse/Child/Parent entity resolution, event vs. birth date discrimination, zero cross-chart leakage.    |
| `mobile-chat-scroll-engineering`            | **CREATED IN WORKSPACE** | `.agents/skills/mobile-chat-scroll-engineering/SKILL.md`            | Yes             | `100dvh` sheets, `visualViewport` keyboard flush, dynamic auto-scroll, iOS zoom prevention (font $\ge 16$px). |
| `ai-response-quality-evaluation`            | **CREATED IN WORKSPACE** | `.agents/skills/ai-response-quality-evaluation/SKILL.md`            | Yes             | 8-axis rubric, automated chart grounding check, hallucination scanner, 26-point regression suite.             |
| `parashari-jyotish-reasoning`               | **CREATED IN WORKSPACE** | `.agents/skills/parashari-jyotish-reasoning/SKILL.md`               | Yes             | Brihat Parashara Hora Shastra canon, D1/D9/D10 charts, functional benefics/malefics, yogas, dasha timing.     |
| `swiss-ephemeris-integration`               | **CREATED IN WORKSPACE** | `.agents/skills/swiss-ephemeris-integration/SKILL.md`               | Yes             | Chitrapaksha Lahiri Ayanamsha, Python SWEPH authority, sidereal lagna/nakshatra/dasha math, AGPL audit.       |
| `consultation-billing-and-ledger-integrity` | **CREATED IN WORKSPACE** | `.agents/skills/consultation-billing-and-ledger-integrity/SKILL.md` | Yes             | Free tier threshold, explicit consent modal, per-minute atomic debits, idempotency keys, zero double-debit.   |
| `streaming-and-retry-reliability`           | **CREATED IN WORKSPACE** | `.agents/skills/streaming-and-retry-reliability/SKILL.md`           | Yes             | Server-Sent Events (SSE), heartbeat pings, request/message UUIDs, client batching, non-duplicating retries.   |
| `astrology-remedies-knowledge-base`         | **CREATED IN WORKSPACE** | `.agents/skills/astrology-remedies-knowledge-base/SKILL.md`         | Yes             | Sattvic Upayas (mantras, seva, charity, meditation), zero fear-based claims, no compulsory costly items.      |
| `multilingual-conversational-ai`            | **CREATED IN WORKSPACE** | `.agents/skills/multilingual-conversational-ai/SKILL.md`            | Yes             | English, Hindi (Devanagari), Hinglish (Romanized), code-switching handling, authentic Sanskrit terms.         |
| `privacy-and-pii-protection`                | **CREATED IN WORKSPACE** | `.agents/skills/privacy-and-pii-protection/SKILL.md`                | Yes             | Minimal data prompt injection, log redaction, session RLS, prompt injection defense, right to be forgotten.   |
| `playwright-webkit-qa`                      | **CREATED IN WORKSPACE** | `.agents/skills/playwright-webkit-qa/SKILL.md`                      | Yes             | Cross-engine (WebKit Safari + Chromium), iPhone 13/Pixel responsive bounds, streaming & scroll E2E tests.     |

---

## 2. Reused Workspace & Infrastructure Skills

| Existing Skill                     | Status                | Location                                           | Verified Active | Capabilities Provided                                                             |
| ---------------------------------- | --------------------- | -------------------------------------------------- | --------------- | --------------------------------------------------------------------------------- |
| `playwright-skill`                 | **ALREADY INSTALLED** | `.agents/skills/playwright-skill/`                 | Yes             | Local Node.js browser automation executor, responsive snapshot checks.            |
| `playwright-core`                  | **ALREADY INSTALLED** | `.agents/skills/playwright-core/`                  | Yes             | Battle-tested locator strategies, fixtures, trace debugging.                      |
| `playwright-frontend`              | **ALREADY INSTALLED** | `.agents/skills/playwright-frontend/`              | Yes             | Semantic markup, resilient `data-testid` conventions.                             |
| `playwright-cli`                   | **ALREADY INSTALLED** | `.agents/skills/playwright-cli/`                   | Yes             | Terminal-first Playwright command runner.                                         |
| `playwright-ci`                    | **ALREADY INSTALLED** | `.agents/skills/playwright-ci/`                    | Yes             | GitHub Actions CI/CD pipeline automation patterns.                                |
| `playwright-pom`                   | **ALREADY INSTALLED** | `.agents/skills/playwright-pom/`                   | Yes             | Page Object Model architecture.                                                   |
| `playwright-qa`                    | **ALREADY INSTALLED** | `.agents/skills/playwright-qa/`                    | Yes             | QA engineering test-case traceability.                                            |
| `playwright-migration`             | **ALREADY INSTALLED** | `.agents/skills/playwright-migration/`             | Yes             | Migration patterns from Cypress/Selenium.                                         |
| `007`                              | **ALREADY INSTALLED** | `.agents/skills/007/`                              | Yes             | STRIDE/PASTA threat modeling, OWASP checks, code auditing.                        |
| `api-security-best-practices`      | **ALREADY INSTALLED** | `.agents/skills/api-security-best-practices/`      | Yes             | API authentication, authorization, rate limiting, and input validation.           |
| `backend-security-coder`           | **ALREADY INSTALLED** | `.agents/skills/backend-security-coder/`           | Yes             | Secure backend coding, SQL injection prevention, input sanitization.              |
| `supabase`                         | **ALREADY INSTALLED** | `.agents/skills/supabase/`                         | Yes             | Supabase database, Auth, RLS, storage, and serverless functions.                  |
| `supabase-postgres-best-practices` | **ALREADY INSTALLED** | `.agents/skills/supabase-postgres-best-practices/` | Yes             | PostgreSQL schema design, indexing, connection pooling, RLS performance.          |
| `postgresql`                       | **ALREADY INSTALLED** | `.agents/skills/postgresql/`                       | Yes             | Database normalization, transaction isolation, locking semantics.                 |
| `nextjs-supabase-auth`             | **ALREADY INSTALLED** | `.agents/skills/nextjs-supabase-auth/`             | Yes             | SSR auth session management and token verification.                               |
| `fastapi-pro`                      | **ALREADY INSTALLED** | `.agents/skills/fastapi-pro/`                      | Yes             | Production async API patterns with FastAPI and Pydantic V2.                       |
| `python-fastapi-development`       | **ALREADY INSTALLED** | `.agents/skills/python-fastapi-development/`       | Yes             | Microservice routing and authentication.                                          |
| `async-python-patterns`            | **ALREADY INSTALLED** | `.agents/skills/async-python-patterns/`            | Yes             | Asyncio concurrency and non-blocking worker pools.                                |
| `astropy`                          | **ALREADY INSTALLED** | `.agents/skills/astropy/`                          | Yes             | High-precision astronomical coordinate transforms and time calculations.          |
| `upstash-ratelimit`                | **ALREADY INSTALLED** | `.agents/skills/upstash-ratelimit/`                | Yes             | Sliding-window and token-bucket API rate limiting with Redis.                     |
| `api-rate-limit-handler`           | **ALREADY INSTALLED** | `.agents/skills/api-rate-limit-handler/`           | Yes             | 429 backoff and retry handling.                                                   |
| `systematic-debugging`             | **ALREADY INSTALLED** | `.agents/skills/systematic-debugging/`             | Yes             | Root cause analysis and defensive verification.                                   |
| `tailwind-design-system`           | **ALREADY INSTALLED** | `.agents/skills/tailwind-design-system/`           | Yes             | Design tokens, responsive components, and accessibility styles.                   |
| `tailwind-patterns`                | **ALREADY INSTALLED** | `.agents/skills/tailwind-patterns/`                | Yes             | Tailwind CSS v4 layout architectures.                                             |
| `cashfree-skills` (18 modules)     | **REUSED**            | `.agent/skills/cashfree-skills/`                   | Yes             | Complete Cashfree Payment Gateway, wallet top-ups, webhook verification, refunds. |
| `seo`                              | **REUSED**            | `.agent/skills/seo/`                               | Yes             | Technical SEO audits, structured JSON-LD schema, meta optimization.               |

---

## 3. Installed Plugins & Global Tooling

| Plugin / Tooling         | Source            | Verified Status       | Features & MCP Tools Provided                                                                                                                           |
| ------------------------ | ----------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chrome-devtools-plugin` | Config Plugin     | **ALREADY INSTALLED** | Chrome DevTools MCP: `click`, `type_text`, `navigate_page`, `evaluate_script`, `take_screenshot`, `resize_page`, console messages, performance tracing. |
| `understand-anything`    | Config Plugin     | **ALREADY INSTALLED** | Architectural knowledge graphs: `understand`, `understand-chat`, `understand-dashboard`, `understand-diff`, `understand-domain`, `understand-figma`.    |
| `gravitas-native`        | Config Plugin     | **ALREADY INSTALLED** | Deterministic reliability runtime, task contract invariants, and evidence verification gates.                                                           |
| `browser`                | Built-in Subagent | **ALREADY INSTALLED** | Sandboxed visual web browser automation subagent for DOM interaction.                                                                                   |
| `permissioned-github`    | Built-in Skill    | **ALREADY INSTALLED** | GitHub synchronization and branch workflow management.                                                                                                  |

---

## 4. Antigravity Marketplace Plugin Audit

The following official Marketplace plugins were evaluated for the AstroVerse platform:

| Plugin Name   | Catalog ID                                          | Description                                                           | Relevance / Status           | Recommendation                                                                                                                                                                                              |
| ------------- | --------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel**    | `antigravity-plugins-partners/plugin/vercel-plugin` | Build, deploy, and observe web apps on Vercel with MCP access.        | **NEEDS CONFIGURATION**      | Recommended for direct CLI/MCP deployment tracking from chat. Can be enabled via marketplace card if desired: `<plugin-card catalog-id="antigravity-plugins-partners/plugin/vercel-plugin"></plugin-card>`. |
| **Supabase**  | `antigravity-plugins-partners/plugin/supabase`      | Supabase MCP access for remote project management and SQL migrations. | **NEEDS CONFIGURATION**      | Optional; local workspace already has complete `supabase` and `supabase-postgres-best-practices` skills.                                                                                                    |
| **TestMu AI** | `antigravity-plugins-partners/plugin/testmu-ai`     | Cloud browser automation and AI agent testing.                        | **UNAVAILABLE / NOT NEEDED** | Local WebKit + Chromium Playwright engines already provide full coverage.                                                                                                                                   |
| **SonarQube** | `antigravity-plugins-partners/plugin/sonarqube`     | AI code quality and security verification.                            | **UNAVAILABLE / NOT NEEDED** | Local `007` and `api-security-best-practices` skills cover required static checks.                                                                                                                          |

_Note: Per Antigravity policy, plugins are never force-installed without user initiative; users may add them via their marketplace cards._

---

## 5. Security, Credentials & Implementation Prerequisites

### A. Credentials Handling

- **No Mock or Fake API Keys**: Zero fabricated keys were created.
- **Runtime Keys (Configured on demand during implementation)**:
  - `GEMINI_API_KEY`: For Google Gemini 2.5/3.0 model integration.
  - `OPENROUTER_API_KEY`: For open-source DeepSeek / Llama model fallbacks.
  - `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY`: For live payment gateway transactions.
  - `SUPABASE_SERVICE_ROLE_KEY`: For server-side database administration.

### B. Optional Dependencies for Future Implementation Tasks

The following dependencies are documented in the skills and will be utilized during subsequent implementation phases:

1. `pyswisseph`: Already integrated in the Python Kundli engine backend (`services/kundli-engine/`).
2. `@playwright/test`: For running headless WebKit and Chromium E2E verification suites.
3. `pgvector`: For storing embedded Jyotish scripture chunks if vector search is enabled.

---

## 6. Verification Summary & Next Steps

1. **Folder & File Integrity**: All 13 specialist skills exist under `e:\rea\.agents\skills\` with valid, complete `SKILL.md` files conforming to the 14-point quality specification.
2. **Coordination Topology**: Documented in `ASTROVERSE_AI_SKILL_ARCHITECTURE.md`.
3. **Application Boundary Maintained**: 0 application source files, API routes, or databases were mutated.
4. **Readiness**: The AstroVerse AI workspace is fully equipped and ready for the separate **Universal AI Astrologer Master Implementation Prompt**.
