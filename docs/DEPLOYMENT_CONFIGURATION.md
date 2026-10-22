# Multi-Service Cloud & Container Deployment Configuration

## 1. Multi-Service Vercel Deployment Architecture

Astroverse is deployed as a unified project using **Vercel Services** (`vercel.json`), orchestrating a static frontend Single Page Application alongside Python FastAPI and Node.js microservices under a single shared domain.

```mermaid
flowchart TD
    VercelEdge["Vercel Edge / API Gateway"]
    
    VercelEdge -->|/(.*)| AppService["app (Static Root / CDN)"]
    VercelEdge -->|/api/wallet/*, /api/auth/*, /api/profiles*, /api/pujas/*| WalletSvc["wallet-service (Express / Prisma / Node)<br/>services/wallet-service/src/server.ts"]
    VercelEdge -->|/api/(.*)| KundliEngine["kundli-engine (FastAPI / Python)<br/>services/kundli-engine/main.py"]
    VercelEdge -->|/socket.io/(.*)| ConsultSvc["consultation-service (Socket.IO / Node)<br/>services/consultation-service/server.ts"]
    
    ConsultSvc -->|Internal Binding: WALLET_SERVICE_URL| WalletSvc
```

### 1.1 `vercel.json` Specification

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "app": {
      "root": ".",
      "buildCommand": "echo 'Static app ready'",
      "installCommand": "echo 'No install needed'",
      "outputDirectory": "."
    },
    "consultation-service": {
      "root": "services/consultation-service",
      "runtime": "node",
      "entrypoint": "server.ts",
      "bindings": [
        {
          "type": "service",
          "service": "wallet-service",
          "format": "url",
          "env": "WALLET_SERVICE_URL"
        }
      ]
    },
    "kundli-engine": {
      "root": "services/kundli-engine",
      "framework": "fastapi",
      "entrypoint": "main.py"
    },
    "wallet-service": {
      "root": "services/wallet-service",
      "framework": "express",
      "entrypoint": "src/server.ts"
    }
  },
  "rewrites": [
    {
      "source": "/api/wallet/(.*)",
      "destination": {
        "service": "wallet-service"
      }
    },
    {
      "source": "/api/auth/(.*)",
      "destination": {
        "service": "wallet-service"
      }
    },
    {
      "source": "/api/profiles(.*)",
      "destination": {
        "service": "wallet-service"
      }
    },
    {
      "source": "/api/pujas/(.*)",
      "destination": {
        "service": "wallet-service"
      }
    },
    {
      "source": "/api/(.*)",
      "destination": {
        "service": "kundli-engine"
      }
    },
    {
      "source": "/socket.io/(.*)",
      "destination": {
        "service": "consultation-service"
      }
    },
    {
      "source": "/(.*)",
      "destination": {
        "service": "app"
      }
    }
  ]
}
```

### 1.2 Prevention of Recursive Turborepo Invocations
To prevent Vercel build loops where Turborepo scripts recursively trigger the root `package.json#build` command, the static app service specifies:
```json
"buildCommand": "echo 'Static app ready'",
"installCommand": "echo 'No install needed'",
"outputDirectory": "."
```
This isolates the client bundle from monorepo build loops.

---

## 2. Containerized Deployment (`docker-compose.yml`)

For dedicated cloud instances (AWS EC2, Google Cloud Compute, DigitalOcean), `docker-compose.yml` orchestrates all microservices and persistent storage layers:

```bash
# Build and launch all services in detached mode
docker compose up --build -d

# Check running status & health
docker compose ps
```

| Service Container | Internal Port | External Port | Healthcheck Command |
| :--- | :--- | :--- | :--- |
| `astro_postgres` | `5432` | `5432` | `pg_isready -U astro_admin -d astrotalk_db` |
| `astro_redis` | `6379` | `6379` | `redis-cli ping` |
| `astro_kundli_engine` | `8000` | `8000` | `GET /api/health` |
| `astro_wallet_service`| `5000` | `5000` | `GET /health` |
| `astro_consultation_service`| `4000` | `4000` | Socket ping |

---

## 3. Environment Variable Checklist

Configure the following variables in production (see `.env.example`):

1. **Kundli Engine**:
   - `FREE_ASTROLOGY_API_KEY`: `<CONFIGURED_IN_SERVER_SECRET_MANAGER>`
   - `OPENAI_API_KEY`: External LLM provider key (optional fallback enabled)
   - `PORT`: `8000`
2. **Wallet & Auth Gateway**:
   - `DATABASE_URL`: `postgresql://astro_admin:password@host:5432/astrotalk_db?schema=public`
   - `JWT_SECRET`: Cryptographic HMAC-SHA256 secret
   - `RAZORPAY_KEY_ID`: `rzp_test_...`
   - `RAZORPAY_KEY_SECRET`: `...`
3. **Consultation Gateway**:
   - `WALLET_SERVICE_URL`: Injected automatically via Vercel service binding, or `http://wallet-service:5000` in Docker.
   - `REDIS_URL`: `redis://redis:6379`

---

## 4. Diagnostics & Operational Health Endpoints

* **Public Health**: `GET /api/health`
  Returns service status, Swiss Ephemeris engine version, and active timestamp.
* **Admin & Operations Intelligence**: `GET /api/admin/health`
  Tests real-time connectivity to:
  - Swiss Ephemeris (`pyswisseph`)
  - FreeAstrologyAPI (`https://json.freeastrologyapi.com`)
  - Open-Meteo Geocoding Provider
