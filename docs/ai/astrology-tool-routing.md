# AstroVerse Natural-Language Astrology Tool Routing Architecture

## 1. Architectural Vision & Core Principles

AstroVerse's conversational AI consultation engine transforms open-ended natural-language inquiries into validated, calculation-grounded Vedic astrological counsel. Inspired by VedAstro's method discovery patterns, the architecture bridges natural language understanding with deterministic astronomical ephemerides.

### Core Principles
1. **Mathematical Grounding over Hallucination**: An LLM must never invent planetary degrees, Ascendants, or Dasha periods. All factual claims must be strictly derived from verified calculation tools.
2. **One Shared Intelligence Core**: All three AI astrologer personas—**Acharya Devratan**, **Dr. Sunita Shastri**, and **Pandit Raghavendra**—share the identical tool registry, calculation engine, chart context, and evidence verification checks. They differ only in communicative tone, perspective, and remedial emphasis.
3. **Canonical Chart Context Binding**: Every turn in a consultation session is bound to the user's active birth chart. The assistant is strictly prohibited from altering the Ascendant or planetary positions during a session.
4. **Transparent Evidence & Provenance**: Interpretations are paired with structured evidence bundles and clickable interactive cards that link directly into AstroVerse's calculation tools.
5. **Ethical & Safety Guardrails**: Clear boundaries for out-of-scope non-astrological tasks, sensitive crisis situations, and ungrounded fortune-telling.

---

## 2. The Complete Request & Orchestration Lifecycle

Every user query progresses through a deterministic eleven-stage pipeline:

```
[ USER QUESTION ]
       │
       ▼
1. INTENT & SCOPE UNDERSTANDING (9-State Scope Classifier)
       │
       ▼
2. CONVERSATION CONTEXT RESOLUTION (Multi-Turn History & Topic Inheritance)
       │
       ▼
3. REQUIRED INPUT CHECK (Natal Chart Loaded vs Universal Transit Mode)
       │
       ▼
4. TOOL DISCOVERY (Match Intent to Central Astrology Method Registry)
       │
       ▼
5. ARGUMENT VALIDATION (Type checking, Coordinate bounds, Timezone)
       │
       ▼
6. CALCULATION EXECUTION (Swiss Ephemeris / Parashari Engine / Safe Timeouts)
       │
       ▼
7. EVIDENCE NORMALIZATION (Structured Evidence Bundle Assembly)
       │
       ▼
8. RESPONSE SYNTHESIS (Persona Delivery grounded in Evidence)
       │
       ▼
9. OUTPUT VALIDATION (Consistency check between Text and Evidence)
       │
       ▼
10. DYNAMIC FOLLOW-UP & CARD GENERATION (Contextual Chips & Interactive Cards)
       │
       ▼
[ CHAT RESPONSE ]
```

---

## 3. The Nine Conversational Scope States

The router classifies every incoming query into one of nine distinct operational states:

| Scope State | Definition & Triggers | Assistant Action & Response Behavior |
| :--- | :--- | :--- |
| `ASTROLOGY_IN_SCOPE` | Direct personal astrological questions (Career, Marriage, Wealth, Health, Timing, Remedies). | Executes appropriate calculation tools, normalizes evidence, generates chart-grounded persona reading with interactive insight cards. |
| `ASTROLOGY_CONCEPTUAL` | Educational inquiries about astrological theory, definitions, or scriptures without asking for personal predictions ("What is Ashtakavarga?", "Explain D9 Navamsha"). | Answers authoritatively using classical shastric knowledge (BPHS, Phaladeepika) without requiring birth data or complaining about missing inputs. |
| `ASTROLOGY_WITH_MISSING_INPUTS` | Personal prediction inquiry when NO birth chart has been calculated yet. | Explains the necessity of Date, Time, and Location to compute Lagna; provides an unpersonalized universal transit overview in the interim; prompts chart creation. |
| `FOLLOW_UP_REQUIRING_CONTEXT` | Terse follow-up queries ("When will this happen?", "What about Saturn?", "Why?") relying on previous turns. | Resolves prior topic from session history and binds to the ongoing chart context. |
| `SOCIAL_CONVERSATION` | Greetings, salutations, courtesies, sign-offs ("hi", "namaste", "thank you", "bye"). | Warm, dignified persona welcome, summarizes current chart status, and suggests relevant astrological inquiry areas. |
| `CLARIFICATION_REQUIRED` | Ambiguous, fragmented, or contradictory queries ("1995", "chart", "?"). | Politely requests focused clarification and presents clear structured options. |
| `OUT_OF_SCOPE` | Non-astrological requests (coding, general programming, cooking recipes, sports trivia, hardware repair). | Deterministic, polite refusal clearly delineating AstroVerse's Vedic scope; zero hallucinated predictions; offers supported astrology topics. |
| `HIGH_STAKES_REQUIRING_LIMITATION` | Medical emergencies, suicidal ideation, active criminal trials, or all-in speculative financial bets. | Compassionate safety boundary; explains Vedic Jyotish is a contemplative spiritual discipline, never a substitute for licensed medical, psychological, legal, or financial counsel; provides helpline referrals. |
| `UNSUPPORTED_ASTROLOGY_CAPABILITY` | Non-Vedic divination systems (Tarot cards, Western Tropical Placidus, BaZi, coffee cup reading). | Explains AstroVerse's Vedic Sidereal (Lahiri) Parashari foundation; offers equivalent Vedic capabilities (D9 Navamsha, Ashtakoota, Nirayana transits). |

---

## 4. The Canonical Evidence Bundle Schema

Before generating the natural-language response, all tool execution results are normalized into a structured Evidence Bundle:

```json
{
  "question": "How will my career progress over the next 12 months?",
  "activeProfileId": "prof_delhi_1990",
  "intent": "career",
  "scope": "ASTROLOGY_IN_SCOPE",
  "selectedTools": [
    "calculate_kundli_d1",
    "calculate_dashamsha_d10",
    "calculate_vimshottari_dasha",
    "identify_planetary_yogas"
  ],
  "calculationContextVersion": "ephemeris_v2.4_lahiri",
  "evidence": [
    {
      "factor": "Natal Ascendant (Lagna)",
      "placement": "Virgo (1.90°)",
      "interpretation": "Foundational constitutional temperament, executive analytical focus, and governance of the 10th House by Gemini/Mercury."
    },
    {
      "factor": "10th House (Karma Bhava)",
      "placement": "Gemini ruled by Mercury in 8th house; aspected by Jupiter in 10th house",
      "interpretation": "Professional authority, intellectual advisory, and strategic communications."
    },
    {
      "factor": "Active Vimshottari Dasha",
      "placement": "Jupiter Mahadasha / Venus Antardasha",
      "interpretation": "Primary planetary cycle activating angular expansion and creative alliances."
    }
  ],
  "relatedInsights": [
    {
      "planet": "Jupiter",
      "sign": "Gemini",
      "house": 10,
      "degree": "15.79°",
      "significance": "Natural Karaka of wisdom and expansion activating career elevation."
    },
    {
      "planet": "Saturn",
      "sign": "Sagittarius",
      "house": 4,
      "degree": "0.80°",
      "significance": "Lord of discipline, perseverance, and sustainable professional structures."
    }
  ],
  "missingInputs": [],
  "warnings": [],
  "failedTools": [],
  "methodology": [
    "Chitrapaksha Lahiri Ayanamsha",
    "Geocentric Nirayana Longitudes",
    "Parashari Bhava Lordship Rules",
    "365.25-day solar Vimshottari standard"
  ]
}
```

---

## 5. Persona Differentiation on a Unified Foundation

All three personas consume the exact same Evidence Bundle, but synthesize the message through their distinct classical lenses:

```
                   [ EVIDENCE BUNDLE ]
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
 [ Acharya Devratan ] [ Dr. Sunita Shastri ] [ Pandit Raghavendra ]
  • Strategic         • Empathetic synastry   • Sacred scriptures
  • Career & Dhana    • D9 & Jaimini Karakas  • Traditional mantras
  • Milestones        • Emotional harmony     • Shanti & Sattva
```

- **Acharya Devratan**: "Pranam! Analyzing the executive trajectory of your Virgo Lagna... Your 10th House of professional authority is strongly energized under your active Jupiter-Venus cycle..."
- **Dr. Sunita Shastri**: "Namaste! Examining your professional path through an empathetic and Jaimini lens... With your Moon in Capricorn, your thoughtful discipline and stakeholder alignment are your greatest assets..."
- **Pandit Raghavendra**: "Om Namah Shivaya! In sacred classical Parashari Jyotish for Virgo Lagna... Sage Parashara states that the 10th house governs Kirti (reputation) and Pratishtha (authority)... Recite the Vishnu Sahasranama to clear hidden impediments..."

---

## 6. Interactive Result Cards & Dynamic Follow-Ups

### Interactive Result Cards
Each response includes interactive cards embedded in the chat stream:
- **Planetary Position Card**: Displays exact calculated sign, house, and degree. Clicking **"Inspect"** navigates to the interactive Kundli wheel with that planet highlighted.
- **Remedial Guidance Card**: Displays authentic classical mantras, charity practices, and ethical disclaimers.
- **Divisional / Dasha Card**: Summarizes active Vimshottari periods and D9/D10 alignments.

### Dynamic Follow-Up Chips
Every turn generates 3 to 4 context-specific follow-up questions derived from the actual chart evidence and recent topics:
- *"Analyze my 10th house lord influence on promotion timing"*
- *"What does my chart reveal regarding Dhana Yogas?"*
- *"Which upcoming transit supports a career switch?"*
- *"What Vedic remedies strengthen workplace leadership?"*

Clicking any chip sends the prompt through the full orchestration pipeline—never through a hardcoded mockup handler.
