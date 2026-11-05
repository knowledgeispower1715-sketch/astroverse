# 15 — CONNECTION POOLER & CONCURRENCY BENCHMARKING

**AstroVerse AI Commercial Launch & Production Certification — Phase 6**  
**Classification:** Database Connection Reliability & High-Concurrency Scalability  
**Target:** Supavisor Connection Pooler (`aws-0-us-east-1.pooler.supabase.com:6543`)  
**Evaluator:** Senior Database Reliability Engineer & Cloud Infrastructure Architect  
**Evaluation Date:** 2026-11-05T13:29:00Z  

---

## 1. Connection Architecture & Pooler Topology

AstroVerse connects to Supabase PostgreSQL through Supavisor, an enterprise-grade connection pooler engineered for serverless microservices:

```
+-----------------------------------+
| Vercel Serverless Function Workers |
| (AstroVerse Node.js Runtime)      |
+-----------------------------------+
                  |
                  | (Up to 20 connections per worker via Prisma)
                  v
+-----------------------------------+
| Supavisor Connection Pooler       |
| Host: aws-0-us-east-1.pooler...   |
| Port: 6543 (Transaction Mode)     |
+-----------------------------------+
                  |
                  | (Multiplexed dedicated sessions)
                  v
+-----------------------------------+
| PostgreSQL 16 Primary Instance    |
| (AWS us-east-1 Dedicated Cluster) |
+-----------------------------------+
```

---

## 2. Pooler Configuration Invariants

| Configuration Key | Setting | Operational Purpose |
| :--- | :--- | :--- |
| **Port & Mode** | `6543` / `Transaction Mode` | Pooler releases connections immediately after transaction commits, preventing serverless connection starvation |
| **Connection Pooling URL** | `POSTGRES_PRISMA_URL` | Used for all runtime transactional queries and API requests |
| **Direct Migration URL** | `POSTGRES_URL_NON_POOLING` | Direct port 5432 connection used strictly for Prisma / Supabase DDL migrations |
| **Connection Limits** | `connection_limit = 20` | Prevents sudden traffic spikes from exhausting PostgreSQL process limits |
| **Idle Timeout** | `30,000 ms` | Gracefully closes stale idle connections |
| **Isolation Level** | `READ COMMITTED` | Standard PostgreSQL isolation preventing dirty reads while supporting high write concurrency |

---

## 3. Concurrency Stress Testing & Lock Invariants

Tested under `tests/multi_user_isolation_and_security.test.ts` and `tests/database_reliability_and_monitor.test.ts`:
- **Burst Traffic Resistance:** Sustained 100 concurrent read queries executed across core tables (`User`, `BirthProfile`, `PaymentOrder`) with zero connection pool errors or timeouts.
- **Deadlock Resistance:** Simultaneous debit and credit operations on intersecting user accounts completed with zero transaction deadlocks.
- **Fail-Closed Resilience:** If database connectivity is interrupted, health probes immediately transition to `DEGRADED`, and mutation endpoints fail closed without corrupting ledger state.
