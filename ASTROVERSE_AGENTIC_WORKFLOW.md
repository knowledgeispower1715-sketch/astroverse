# ASTROVERSE AI — PROMPT-DRIVEN AGENTIC WORKFLOW GUIDE

> **A standardized guide for engineering AstroVerse AI using AI coding agents through text prompts.**
> Powered by the curated AstroVerse skill stack from [`sickn33/agentic-awesome-skills`](https://github.com/sickn33/agentic-awesome-skills).

---

## 1. CORE PHILOSOPHY: PROMPT-DRIVEN RIGOR

In a prompt-driven environment, you do not rely on IDE plugins or black-box auto-installers. Instead, you guide the coding agent through explicit, structured prompts that enforce:
1. **Reconnaissance First**: Inspect existing code, tests, and database schemas before writing a single line of code.
2. **Explicit Skill Invocations**: Tell the agent exactly which `SKILL.md` file to load.
3. **Bounded Implementation**: Ensure changes strictly modify the agreed target without breaking sibling features.
4. **Deterministic Verification**: Gate completion on executable test suites and visual screenshots rather than verbal claims.

---

## 2. THE 5-PHASE EXECUTION WORKFLOW

Every prompt-driven engineering turn should follow this 5-phase loop:

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: RECONNAISSANCE & SCOPE DEFINITION            │
│  - Inspect target files, schemas, and existing tests   │
│  - Identify constraints, environment variables, secrets│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 2: SKILL DISCOVERY & LOADING                     │
│  - Consult .agents/skills/SKILL_ROUTER.md              │
│  - Instruct agent to read designated SKILL.md file(s)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 3: ARCHITECTURAL PLAN & VALIDATION GATES         │
│  - Produce a structured plan with measurable milestones│
│  - Define exact passing criteria (tests, contrast, etc)│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 4: SCOPED IMPLEMENTATION                         │
│  - Edit code conforming strictly to loaded skill rules │
│  - Maintain backward compatibility and design tokens   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 5: EVIDENCE-BASED VERIFICATION                   │
│  - Run automated test scripts (Playwright, Jest, Pytest│
│  - Validate zero regressions and verify output diffs   │
└────────────────────────────────────────────────────────┘
```

---

## 3. INSTALLED ASTROVERSE SKILLS REGISTRY

All installed skills reside locally in `.agents/skills/`:

### A. Frontend & UI/UX Design System
- `.agents/skills/tailwind-design-system/SKILL.md`: Design tokens, luxury color palette, responsive container queries, typography hierarchy.
- `.agents/skills/tailwind-patterns/SKILL.md`: CSS variables, Tailwind utility composition, dark mode standards.
- `.agents/skills/react-best-practices/SKILL.md`: React performance patterns, re-render minimization, state encapsulation.
- `.agents/skills/nextjs-best-practices/SKILL.md`: App router design, server-side data fetching, static vs dynamic caching.
- `.agents/skills/cc-skill-frontend-patterns/SKILL.md`: Universal frontend architecture and state management standards.

### B. Database, Supabase & PostgreSQL
- `.agents/skills/supabase/SKILL.md`: Supabase JavaScript client, table operations, auth hooks, edge functions.
- `.agents/skills/nextjs-supabase-auth/SKILL.md`: Secure SSR auth cookies, token exchange, session persistence.
- `.agents/skills/supabase-postgres-best-practices/SKILL.md`: Index selection, query optimization, connection pool safety.
- `.agents/skills/postgresql/SKILL.md`: PostgreSQL relational schema modeling, constraints, foreign keys, cascading deletes.

### C. Application Security & Throttling
- `.agents/skills/007/SKILL.md`: Comprehensive security audit, threat modeling (STRIDE), OWASP Top 10 mitigation.
- `.agents/skills/api-security-best-practices/SKILL.md`: REST API defense, CORS configuration, header hardening, JWT validation.
- `.agents/skills/backend-security-coder/SKILL.md`: SQL injection prevention, input sanitization, parameterization.
- `.agents/skills/api-rate-limit-handler/SKILL.md`: Throttling policies, sliding-window algorithms, standard 429 Retry-After headers.
- `.agents/skills/upstash-ratelimit/SKILL.md`: Distributed rate limiting patterns for edge and serverless environments.

### D. Astrology Engine & Python Microservices
- `.agents/skills/fastapi-pro/SKILL.md`: Enterprise async FastAPI, Pydantic V2 schemas, dependency injection.
- `.agents/skills/python-fastapi-development/SKILL.md`: Production Python backend patterns, error middleware, background jobs.
- `.agents/skills/async-python-patterns/SKILL.md`: Non-blocking async/await execution for high-throughput calculation endpoints.
- `.agents/skills/cc-skill-backend-patterns/SKILL.md`: Microservice resilience, structured logging, centralized error handling.
- `.agents/skills/astropy/SKILL.md`: Astronomical calculation standards, celestial coordinates, ephemeris integration.

### E. Quality Assurance, Accessibility & Debugging
- `.agents/skills/playwright-skill/SKILL.md`: Multi-viewport browser automation, screenshot diffs, end-to-end user journeys.
- `.agents/skills/accessibility-compliance-accessibility-audit/SKILL.md`: WCAG 2.1 AA audit methodology, ARIA semantics, color contrast.
- `.agents/skills/fixing-accessibility/SKILL.md`: Step-by-step remediation of contrast defects, focus indicators, keyboard traps.
- `.agents/skills/systematic-debugging/SKILL.md`: Four-phase scientific debugging: reproduce, hypothesize, isolate, verify.

---

## 4. EXAMPLE PROMPTS FOR COMMON WORKFLOWS

When starting a session with an AI coding agent, prepend one of these instructions:

### Scenario 1: Refactoring a Frontend Component
```text
Task: Standardize the Birth Chart Input form in index.html to match the AstroVerse luxury theme.
Instructions:
1. Load and adhere to `.agents/skills/tailwind-design-system/SKILL.md`.
2. Inspect the existing input elements, labels, and error messages.
3. Replace hardcoded inline colors with our theme CSS variables: --av-gold, --av-bg-card, --av-text-primary.
4. Ensure all labels have >= 4.5:1 contrast and form inputs have clear focus rings.
5. Verify across 375px mobile and 1280px desktop viewports.
```

### Scenario 2: Hardening an API Endpoint
```text
Task: Add rate limiting and input validation to the /api/kundli/calculate endpoint in services/kundli-engine/main.py.
Instructions:
1. Load `.agents/skills/fastapi-pro/SKILL.md` and `.agents/skills/api-rate-limit-handler/SKILL.md`.
2. Create a Pydantic V2 request model validating date (1900-2100), time (HH:MM), latitude (-90 to 90), and longitude (-180 to 180).
3. Apply sliding-window rate limiting (10 requests per minute per IP) returning standard RateLimit-* and Retry-After headers.
4. Run `pytest services/kundli-engine/tests/test_calculations.py` to confirm zero regressions.
```

---

## 5. REPOSITORY POLICIES FOR AI SESSIONS

1. **Never Commit Secrets**: All API keys (Razorpay, Google OAuth, Firebase, OpenAI) must be passed via `.env` or secret stores.
2. **Never Fabricate Test Results**: Always execute real test scripts (`node scripts/verify_*.mjs`, `pytest`) and report actual output.
3. **Maintain Visual Evidence**: For UI modifications, capture multi-viewport screenshots and inspect them before declaring completion.
