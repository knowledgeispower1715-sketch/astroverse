# Multi-Service Deployment & Infrastructure Requirements

**Project**: Astroverse  
**Topology**: Polyglot Microservices with Unified Edge Routing  
**Platforms**: Vercel (Edge Services) / Docker Compose / Kubernetes  
**Status**: DEPLOYMENT READY  

---

## 1. Multi-Service Architecture Overview

Astroverse deploys as an integrated multi-service architecture sharing a unified domain namespace via top-level edge rewrites:

```mermaid
flowchart TD
    Client[Client Traffic: https://astroverse.app] --> Edge[Edge Gateway / Vercel Ingress]
    
    Edge -->|GET / | StaticApp[Frontend Static App: VitePress & index.html]
    Edge -->|/api/auth/*, /api/wallet/*, /api/profiles/*| WalletSvc[Wallet & Auth Service: Node.js :5000]
    Edge -->|/api/complete-kundli, /api/hourly-*, /api/ai-*| KundliSvc[Kundli Ephemeris Engine: Python/FastAPI :8000]
    Edge -->|/api/consultation/*| ConsultSvc[Consultation WebSockets: Node.js :4000]
    
    WalletSvc --> DB[(PostgreSQL Database)]
    KundliSvc --> SweLib[Swiss Ephemeris Shared Library]
    KundliSvc --> ExtAPI[FreeAstrologyAPI]
    WalletSvc --> Razorpay[Razorpay Payment Gateway]
```

---

## 2. Environment Variables & Secret Configuration

Create `.env` in the root and in the respective service directories:

### 2.1 Database & Financial Credentials
```ini
# PostgreSQL Connection (Supabase, Neon, AWS RDS, or Local Docker)
DATABASE_URL="postgresql://postgres:password@localhost:5432/astroverse?schema=public"

# Razorpay Production / Test Credentials
RAZORPAY_KEY_ID="rzp_test_YourTestKeyHere"
RAZORPAY_KEY_SECRET="YourSecretKeyHere"
```

### 2.2 Ephemeris & AI Credentials
```ini
# FreeAstrologyAPI Key (Configured for external chart rendering)
FREE_ASTROLOGY_API_KEY="TlI51pEPIW3hTnSI8ogDTR66j48B5D278ZH7Gbkh"

# AI Astrologer Guru Model Provider
OPENAI_API_KEY="sk-proj-YourOpenAiKey"
GEMINI_API_KEY="AIzaSyYourGeminiApiKey"
```

---

## 3. Vercel Multi-Service Configuration (`vercel.json`)

To deploy on Vercel as a single project with multiple runtime services:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "app": {
      "root": ".",
      "framework": "vitepress"
    },
    "kundli-engine": {
      "root": "services/kundli-engine",
      "framework": "fastapi"
    },
    "wallet-service": {
      "root": "services/wallet-service",
      "runtime": "node",
      "entrypoint": "src/server.ts"
    },
    "consultation-service": {
      "root": "services/consultation-service",
      "runtime": "node",
      "entrypoint": "src/index.ts"
    }
  },
  "rewrites": [
    {
      "source": "/api/complete-kundli",
      "destination": { "service": "kundli-engine" }
    },
    {
      "source": "/api/hourly-predictions",
      "destination": { "service": "kundli-engine" }
    },
    {
      "source": "/api/ai-astrologer/:match*",
      "destination": { "service": "kundli-engine" }
    },
    {
      "source": "/api/matchmaking",
      "destination": { "service": "kundli-engine" }
    },
    {
      "source": "/api/geocode",
      "destination": { "service": "kundli-engine" }
    },
    {
      "source": "/api/auth/:match*",
      "destination": { "service": "wallet-service" }
    },
    {
      "source": "/api/profiles/:match*",
      "destination": { "service": "wallet-service" }
    },
    {
      "source": "/api/wallet/:match*",
      "destination": { "service": "wallet-service" }
    },
    {
      "source": "/api/puja/:match*",
      "destination": { "service": "wallet-service" }
    },
    {
      "source": "/(.*)",
      "destination": { "service": "app" }
    }
  ]
}
```

---

## 4. Docker Compose Self-Hosted Topology

For containerized cloud VM deployment (AWS EC2, GCP Compute Engine, DigitalOcean Droplet):

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: astroverse-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: astro_secure_password
      POSTGRES_DB: astroverse
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  kundli-engine:
    build:
      context: ./services/kundli-engine
      dockerfile: Dockerfile
    container_name: astroverse-kundli
    ports:
      - "8000:8000"
    environment:
      - FREE_ASTROLOGY_API_KEY=TlI51pEPIW3hTnSI8ogDTR66j48B5D278ZH7Gbkh

  wallet-service:
    build:
      context: ./services/wallet-service
      dockerfile: Dockerfile
    container_name: astroverse-wallet
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:astro_secure_password@postgres:5432/astroverse?schema=public
    depends_on:
      - postgres

volumes:
  pgdata:
```

---

## 5. Health Checks & Diagnostic Monitoring

1. **Service Liveness**: `GET /api/health` returns status of FastAPI and Swiss Ephemeris (`pyswisseph 2.10.3.2`).
2. **Operational Diagnostic Intelligence**: `GET /api/admin/health` audits Swiss Ephemeris, FreeAstrologyAPI connection status, and Geocoding provider rate-limits.
3. **Database Migration**: Run `npx prisma migrate deploy` in `services/wallet-service` during CI/CD rollout.
