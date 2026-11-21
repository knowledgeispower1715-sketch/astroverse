# AstroVerse AI Specialist Skill Architecture & Coordination Matrix

This document defines the coordination topology, domain pairings, and invocation rules for the 13 specialist engineering skills configured in the AstroVerse workspace.

---

## 1. Architectural Overview & Domain Layers

The AstroVerse AI Astrologer platform operates across four primary engineering layers. Each layer is served by dedicated, specialized skills to maintain modularity, testability, and operational rigor.

```mermaid
flowchart TD
    subgraph UI & Client Experience Layer
        S4[mobile-chat-scroll-engineering]
        S9[streaming-and-retry-reliability]
        S11[multilingual-conversational-ai]
        S13[playwright-webkit-qa]
    end

    subgraph Conversation & Identity Layer
        S1[conversational-ai-engineering]
        S2[conversation-memory-and-rag]
        S3[multi-seeker-identity-resolution]
        S12[privacy-and-pii-protection]
    end

    subgraph Classical Jyotish & Ephemeris Core
        S6[parashari-jyotish-reasoning]
        S7[swiss-ephemeris-integration]
        S10[astrology-remedies-knowledge-base]
    end

    subgraph Financial Ledger & Quality Assurance
        S8[consultation-billing-and-ledger-integrity]
        S5[ai-response-quality-evaluation]
    end

    UI & Client Experience Layer <--> Conversation & Identity Layer
    Conversation & Identity Layer <--> Classical Jyotish & Ephemeris Core
    UI & Client Experience Layer <--> Financial Ledger & Quality Assurance
    Classical Jyotish & Ephemeris Core <--> Financial Ledger & Quality Assurance
```

---

## 2. Task-Based Skill Invocation Matrix

Do **NOT** invoke every skill on every task. Invoke only the specific cluster of skills required for the target operational workflow:

| Operational Task / Workflow                      | Primary Skills to Invoke Together                                                                                                                                                                            | Supporting Skills                | Objective                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Marriage / Relationship Analysis**             | `conversational-ai-engineering`<br>`conversation-memory-and-rag`<br>`multi-seeker-identity-resolution`<br>`parashari-jyotish-reasoning`<br>`swiss-ephemeris-integration`<br>`ai-response-quality-evaluation` | `multilingual-conversational-ai` | Synthesize 7th house, Venus/Jupiter, Navamsha D9, and active dasha with zero chart hallucination or cross-person confusion.        |
| **Career / Wealth / Education Query**            | `parashari-jyotish-reasoning`<br>`swiss-ephemeris-integration`<br>`conversational-ai-engineering`<br>`ai-response-quality-evaluation`                                                                        | `conversation-memory-and-rag`    | Evaluate 10th/2nd/11th/5th houses, D10 Dashamsha, and current Mahadasha/Antardasha with grounded practical counsel.                |
| **Mobile Chat UI / Viewport Fixes**              | `mobile-chat-scroll-engineering`<br>`streaming-and-retry-reliability`<br>`playwright-webkit-qa`                                                                                                              | —                                | Fix virtual keyboard clipping, auto-scroll tracking, `100dvh` sheets, and touch targets across iOS WebKit & Android.               |
| **Paid Consultation & Billing Transition**       | `consultation-billing-and-ledger-integrity`<br>`streaming-and-retry-reliability`<br>`privacy-and-pii-protection`                                                                                             | `playwright-webkit-qa`           | Protect wallet ledgers, enforce explicit user consent before charging, and ensure atomic idempotency across retries.               |
| **Astrological Remedies & Guidance**             | `astrology-remedies-knowledge-base`<br>`parashari-jyotish-reasoning`<br>`ai-response-quality-evaluation`                                                                                                     | `conversational-ai-engineering`  | Prescribe authentic, non-fearful, cost-effective sattvic remedies (mantras, seva, charity, meditation) with classical attribution. |
| **Multilingual Consultation (Hindi / Hinglish)** | `multilingual-conversational-ai`<br>`conversational-ai-engineering`<br>`parashari-jyotish-reasoning`                                                                                                         | `conversation-memory-and-rag`    | Deliver natural Devanagari Hindi or conversational Hinglish responses with accurate Sanskrit astronomical terminology.             |
| **Customer Data, Memory & Privacy**              | `multi-seeker-identity-resolution`<br>`conversation-memory-and-rag`<br>`privacy-and-pii-protection`                                                                                                          | `ai-response-quality-evaluation` | Resolve multi-person profiles (self vs. spouse/child), protect PII, prevent cross-seeker leakage, and support data erasure.        |
| **End-to-End Release & Quality Audit**           | `ai-response-quality-evaluation`<br>`playwright-webkit-qa`<br>`swiss-ephemeris-integration`<br>`consultation-billing-and-ledger-integrity`                                                                   | All active skills                | Run complete 26-test acceptance suite, verify cross-browser layout, and confirm zero ungrounded chart fabrications.                |

---

## 3. Skill Execution Guardrails

1. **No Application Mutations During Tooling Phase**: Installing or loading skills does not authorize ad-hoc modifications to application code. Code changes must be planned and executed within the specific task contracts.
2. **Authoritative Astrological Authority**: All planetary coordinates must originate from `swiss-ephemeris-integration` (Python backend) in Chitrapaksha Lahiri Ayanamsha. Node.js or client-side approximation code is forbidden.
3. **No Unauthenticated Third-Party Profiling**: Questions about relations must be tracked cleanly as linked sub-profiles via `multi-seeker-identity-resolution` without altering the primary seeker's natal identity.
4. **Zero-Tolerance Financial Invariants**: Ledger integrity and explicit user consent (`consultation-billing-and-ledger-integrity`) gate any paid chat interaction. No silent billing is ever permitted.
