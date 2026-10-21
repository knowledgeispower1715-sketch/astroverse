# AstroVerse Prediction Report Schema Specification

## 1. Overview

This document specifies the authoritative JSON schemas for structured multi-horizon prediction reports, API payloads, and database persistence in the AstroVerse platform.

---

## 2. Structured Prediction JSON Schema (`StructuredPredictionReport`)

### 2.1 Complete JSON Schema (Draft-07)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "StructuredPredictionReport",
  "type": "object",
  "required": [
    "report_title",
    "time_horizon",
    "target_date",
    "profile",
    "sections",
    "timing_metadata"
  ],
  "properties": {
    "report_title": {
      "type": "string",
      "description": "Human-readable descriptive report title"
    },
    "time_horizon": {
      "type": "string",
      "enum": ["hourly", "weekly", "monthly", "yearly"]
    },
    "target_date": {
      "type": "string",
      "format": "date",
      "description": "ISO 8601 target evaluation date, e.g. '2026-10-21'"
    },
    "profile": {
      "type": "object",
      "required": ["name", "lagna", "moon_sign", "active_mahadasha", "active_antardasha"],
      "properties": {
        "name": { "type": "string" },
        "lagna": { "type": "string" },
        "lagna_degree": { "type": "number" },
        "moon_sign": { "type": "string" },
        "moon_nakshatra": { "type": "string" },
        "sun_sign": { "type": "string" },
        "active_mahadasha": { "type": "string" },
        "active_antardasha": { "type": "string" },
        "sade_sati_phase": { "type": "string" },
        "is_manglik": { "type": "boolean" }
      }
    },
    "sections": {
      "type": "object",
      "required": [
        "overall_outlook",
        "supportive_developments",
        "challenges_and_cautions",
        "relevant_time_windows",
        "why_this_applies",
        "practical_reflection",
        "limitations"
      ],
      "properties": {
        "overall_outlook": {
          "type": "string",
          "description": "Section A: Executive astrological overview"
        },
        "supportive_developments": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Section B: Benefic alignments, opportunities, favorable windows"
        },
        "challenges_and_cautions": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Section C: Malefic transits, cautions, risk mitigation"
        },
        "relevant_time_windows": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Section D: Auspicious and cautionary intervals"
        },
        "why_this_applies": {
          "type": "string",
          "description": "Section E: Astrological grounding (Lagna, Moon, Dasha)"
        },
        "practical_reflection": {
          "type": "string",
          "description": "Section F: Actionable habits and mindfulness guidance"
        },
        "limitations": {
          "type": "string",
          "description": "Section G: Epistemic scope and non-fatalistic disclosure"
        }
      }
    },
    "timing_metadata": {
      "type": "object",
      "properties": {
        "active_hora_planet": { "type": "string" },
        "hora_window": { "type": "string" },
        "calculation_engine": { "type": "string" },
        "interpretation_standard": { "type": "string" }
      }
    }
  }
}
```

---

## 3. Database Persistence Schema (`SavedReportRecord`)

Stored in `services/wallet-service/data/astroverse_db.json`:

```typescript
export interface SavedReportRecord {
  id: string;              // Format: 'rep_' + 16-hex characters
  userId: string;          // Foreign key to UserRecord.id
  title: string;           // Display title of the saved report
  reportType: string;      // Enum: 'PREDICTION_HOURLY' | 'PREDICTION_WEEKLY' | 'PREDICTION_MONTHLY' | 'PREDICTION_YEARLY' | 'KUNDLI_CHART'
  payload: StructuredPredictionReport;
  createdAt: string;       // ISO 8601 creation timestamp
}
```

---

## 4. Endpoints & Data Exchange

### 4.1 Save Report (`POST /api/reports/save`)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "title": "Hourly Personal Guidance: Jupiter Hora",
    "reportType": "PREDICTION_HOURLY",
    "payload": { ... }
  }
  ```
- **Response**: `HTTP 200 OK` returning the created `SavedReportRecord`.

### 4.2 List Saved Reports (`GET /api/reports/:userId`)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `HTTP 200 OK` returning an array of `SavedReportRecord` sorted newest first.
- **Tenant Isolation**: Non-admin callers requesting another user's ID receive `HTTP 403 Forbidden`.

### 4.3 Fetch Report Detail (`GET /api/reports/detail/:id`)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `HTTP 200 OK` returning single `SavedReportRecord`.
- **Tenant Isolation**: Callers who do not own the report receive `HTTP 403 Forbidden`.
