# ASTROVERSE AI — AGENTIC SKILLS ROUTER & EXECUTION PLAYBOOK

> **Local-first, prompt-driven engineering skills registry for AstroVerse AI.**
> Installed from [`sickn33/agentic-awesome-skills`](https://github.com/sickn33/agentic-awesome-skills) (AAS Core V20.1.0).

---

## 1. HOW SKILLS WORK IN PROMPT-DRIVEN DEVELOPMENT

In a prompt-driven environment (where developers interact with coding agents via text prompts without vendor-locked IDE extensions):
1. **Discovery Root**: All skills are stored in `.agents/skills/<skill-id>/SKILL.md`.
2. **Deterministic Invocation**: When you ask an AI coding agent to perform a task, include a directive to read the relevant skill playbook before generating or modifying code.
3. **Execution Model**:
   ```
   [Developer Prompt]
          │
          ▼
   1. Identify Task Domain (e.g. Supabase, Tailwind, Security)
          │
          ▼
   2. Instruct Agent: "Read .agents/skills/<skill-id>/SKILL.md first"
          │
          ▼
   3. Agent loads principles, constraints, and verified patterns
          │
          ▼
   4. Agent generates scoped plan -> Executes implementation -> Runs validators
   ```

---

## 2. ASTROVERSE SKILL DOMAIN MATRIX

| Domain | Task / Problem | Primary Skill | Supporting Skill | File Path |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend UI/UX** | Design tokens, Vedic color palette, spacing, typography | `tailwind-design-system` | `tailwind-patterns` | `.agents/skills/tailwind-design-system/SKILL.md` |
| **Frontend Architecture** | React component optimization, state hygiene, rendering performance | `react-best-practices` | `cc-skill-frontend-patterns` | `.agents/skills/react-best-practices/SKILL.md` |
| **App Routing & Pages** | Next.js server/client boundaries, layout rendering, SEO | `nextjs-best-practices` | `react-best-practices` | `.agents/skills/nextjs-best-practices/SKILL.md` |
| **Database & Schema** | Supabase database operations, migrations, client setup | `supabase` | `postgresql` | `.agents/skills/supabase/SKILL.md` |
| **PostgreSQL Optimization** | RLS tenant isolation, indexing, query execution plans | `supabase-postgres-best-practices` | `postgresql` | `.agents/skills/supabase-postgres-best-practices/SKILL.md` |
| **Authentication** | Supabase Auth, JWT sync, cookie sessions, OAuth providers | `nextjs-supabase-auth` | `backend-security-coder` | `.agents/skills/nextjs-supabase-auth/SKILL.md` |
| **API Security** | REST API defense, CORS, input sanitization, CSRF/XSS | `api-security-best-practices` | `backend-security-coder` | `.agents/skills/api-security-best-practices/SKILL.md` |
| **Rate Limiting & Throttling** | Bot protection, sliding-window throttling, Retry-After headers | `api-rate-limit-handler` | `upstash-ratelimit` | `.agents/skills/api-rate-limit-handler/SKILL.md` |
| **Threat Audit & OWASP** | Threat modeling (STRIDE), secrets inspection, penetration review | `007` | `api-security-best-practices` | `.agents/skills/007/SKILL.md` |
| **Calculation Engine** | FastAPI endpoints, Pydantic V2 schemas, async concurrency | `fastapi-pro` | `python-fastapi-development` | `.agents/skills/fastapi-pro/SKILL.md` |
| **Async Python Pipelines** | High-throughput astrology computation, non-blocking workers | `async-python-patterns` | `cc-skill-backend-patterns` | `.agents/skills/async-python-patterns/SKILL.md` |
| **Astronomical Math** | Swiss Ephemeris calculations, coordinate systems, ayanamsha parity | `astropy` | `fastapi-pro` | `.agents/skills/astropy/SKILL.md` |
| **E2E & Responsive Testing** | Cross-browser verification, mobile viewport sweeps, Playwright | `playwright-skill` | `accessibility-compliance-accessibility-audit` | `.agents/skills/playwright-skill/SKILL.md` |
| **Accessibility (a11y)** | WCAG 2.1/2.2 AA contrast, screen reader labels, keyboard navigation | `accessibility-compliance-accessibility-audit` | `fixing-accessibility` | `.agents/skills/accessibility-compliance-accessibility-audit/SKILL.md` |
| **Systematic Debugging** | Root-cause analysis, bug isolation, regression test creation | `systematic-debugging` | `cc-skill-backend-patterns` | `.agents/skills/systematic-debugging/SKILL.md` |

---

## 3. READY-TO-USE PROMPT TEMPLATES

Use these exact copy-paste prompts when instructing coding agents in any chat interface:

### 3.1 Frontend Design & Visual Polish Prompt
```markdown
You are acting as the Principal Frontend & Design Systems Engineer for AstroVerse.
Before writing or modifying any UI code:
1. Read `.agents/skills/tailwind-design-system/SKILL.md` and `.agents/skills/tailwind-patterns/SKILL.md`.
2. Inspect `index.html` and verify all color tokens follow the AstroVerse luxury palette (#0B0F19 background, #D4AF37 gold accents, #F3F4F6 high-contrast text).
3. Eliminate low-contrast muted grays and replace hardcoded arbitrary inline styles with centralized design tokens.
4. Verify the changes across 320px, 390px, 768px, and 1440px viewports with zero horizontal overflow.
```

### 3.2 Supabase Schema & RLS Migration Prompt
```markdown
You are acting as the Lead Database Architect and Supabase Security Specialist for AstroVerse.
Before modifying any database schema or queries:
1. Read `.agents/skills/supabase/SKILL.md` and `.agents/skills/supabase-postgres-best-practices/SKILL.md`.
2. Review `supabase/migrations/` and `services/wallet-service/prisma/schema.prisma`.
3. Ensure every table has Row Level Security (RLS) enabled with explicit SELECT, INSERT, UPDATE, and DELETE policies bound to `auth.uid() = user_id`.
4. Ensure indexes are created for foreign keys, composite tenant queries, and timestamp ranges.
5. Provide a deterministic SQL migration file with idempotent statements (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
```

### 3.3 Security Audit & Rate Limiting Prompt
```markdown
You are acting as the Principal Application Security Engineer for AstroVerse.
Before modifying any API endpoints or authentication flows:
1. Read `.agents/skills/007/SKILL.md`, `.agents/skills/api-security-best-practices/SKILL.md`, and `.agents/skills/api-rate-limit-handler/SKILL.md`.
2. Audit backend routes in `services/wallet-service/src/server.ts` and `services/kundli-engine/main.py`.
3. Verify that all secret credentials (Razorpay secrets, database URLs, Firebase service accounts) are strictly read from environment variables and never logged or exposed in client payloads.
4. Enforce sliding-window rate limiting on sensitive routes (OTP dispatch, login, order creation, AI consultation).
5. Ensure responses return standard `RateLimit-Limit`, `RateLimit-Remaining`, and `Retry-After` headers on HTTP 429.
```

### 3.4 Kundli Engine & Swiss Ephemeris Computation Prompt
```markdown
You are acting as the Senior Computational Astrologer and Python Backend Architect for AstroVerse.
Before modifying the Kundli calculation engine:
1. Read `.agents/skills/fastapi-pro/SKILL.md`, `.agents/skills/async-python-patterns/SKILL.md`, and `.agents/skills/astropy/SKILL.md`.
2. Inspect `services/kundli-engine/main.py` and `services/kundli-engine/ephemeris.py`.
3. Ensure Swiss Ephemeris calculations use Lahiri Ayanamsha (swe.SIDM_LAHIRI) with strict degree validation (0.0° to 360.0°).
4. Verify Pydantic V2 schemas for input validation (latitude [-90 to 90], longitude [-180 to 180], datetime ISO 8601).
5. Execute `pytest services/kundli-engine/tests/` and verify zero calculation regressions.
```

### 3.5 Accessibility & Responsive QA Prompt
```markdown
You are acting as the Accessibility QA Specialist for AstroVerse.
Before completing any visual or structural frontend task:
1. Read `.agents/skills/accessibility-compliance-accessibility-audit/SKILL.md` and `.agents/skills/fixing-accessibility/SKILL.md`.
2. Check WCAG 2.1 AA compliance: all text must achieve >= 4.5:1 contrast against dark card and page backgrounds.
3. Verify interactive elements have `aria-label`, visible keyboard focus states (`:focus-visible`), and touch targets >= 44x44px.
4. Execute Playwright / CDP responsive tests across mobile (360px, 390px, 412px), tablet (768px), and desktop (1280px+).
```

---

## 4. SKILL LIFECYCLE MANAGEMENT

### 4.1 Updating Skills from Upstream
To update skills or fetch newly published skills from `sickn33/agentic-awesome-skills`:
```bash
# 1. Update the local cache
git -C .cache/agentic-awesome-skills pull origin main

# 2. Re-copy the updated skill directory
node -e "
const fs = require('fs');
const id = 'supabase'; // target skill
fs.cpSync('.cache/agentic-awesome-skills/skills/' + id, '.agents/skills/' + id, { recursive: true });
console.log('Updated ' + id);
"
```

### 4.2 Adding a New Skill from the 2,872 Catalog
1. Query `.cache/agentic-awesome-skills/skills_index.json` for keywords.
2. Verify the skill directory exists in `.cache/agentic-awesome-skills/skills/<new-skill-id>/`.
3. Copy the directory into `.agents/skills/<new-skill-id>/`.
4. Add the entry to the Domain Matrix in this file (`SKILL_ROUTER.md`).

### 4.3 Pruning Obsolete Skills
If a skill is superseded or no longer relevant, delete `.agents/skills/<skill-id>` and remove its reference from `SKILL_ROUTER.md`.
