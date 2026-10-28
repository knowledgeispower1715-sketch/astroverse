"""
AstroVerse Classical Vedic Dosha & Yoga Verification Test Suite
==============================================================
Validates:
1. Reference chart (2005-08-20, 14:05, Jabalpur, MP) under Swiss Ephemeris Lahiri:
   - Scorpio Lagna (24.16°), Aquarius Moon (12.21°), Aries Mars (18.29°)
   - Gajakesari Yoga: ABSENT (Jupiter is 8th from Moon, not Kendra)
   - Budhaditya Yoga: ABSENT (Sun in Leo, Mercury in Cancer; different signs)
   - Amala Yoga: ABSENT (No natural benefic in 10th from Lagna or Moon)
   - Dharma-Karmadhipati Raja Yoga: PRESENT (9th lord Moon & 10th lord Sun in mutual 7th aspect)
   - Manglik Dosha: Multi-reference (Lagna: H6 Not Met, Moon: H3 Not Met, Venus: H8 Met with Aries own-sign mitigation)
   - Kaal Sarp Dosha: ABSENT (Moon is outside Rahu-Ketu nodal arc)
   - Shani Sade Sati: PRESENT (Phase 3 Setting: Saturn in Pisces 2nd from natal Moon)
   - Kantaka Shani: ABSENT
2. Controlled positive/negative boundary cases for all yogas and doshas.
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ephemeris import calculate_kundli
from yoga_dosha_registry import YogaDoshaRegistry
from doshas_and_remedies import analyze_doshas_and_remedies
from shadbala_and_yogas import detect_classical_yogas


# -----------------------------------------------------------------------------
# 1. REFERENCE CHART REGRESSION TESTS (2005-08-20, 14:05, Jabalpur)
# -----------------------------------------------------------------------------

@pytest.fixture
def reference_chart():
    # DOB: 20 August 2005, 14:05 IST, Jabalpur (23.17 N, 79.95 E)
    return calculate_kundli("2005-08-20T14:05:00", 23.17, 79.95, "Asia/Kolkata")


def test_reference_chart_planetary_positions(reference_chart):
    k = reference_chart
    lagna = k["lagna"]
    planets = k["planets"]

    # Assert Ascendant in Scorpio (~24.16°)
    assert lagna["sign"] == "Scorpio"
    assert abs(lagna["degree"] - 24.16) < 0.2

    # Assert D1 Signs and Longitudes
    assert planets["Sun"]["sign"] == "Leo"
    assert abs(planets["Sun"]["degree"] - 3.49) < 0.2

    assert planets["Moon"]["sign"] == "Aquarius"
    assert abs(planets["Moon"]["degree"] - 12.21) < 0.2

    assert planets["Mars"]["sign"] == "Aries"
    assert abs(planets["Mars"]["degree"] - 18.29) < 0.2

    assert planets["Mercury"]["sign"] == "Cancer"
    assert abs(planets["Mercury"]["degree"] - 15.90) < 0.2

    assert planets["Jupiter"]["sign"] == "Virgo"
    assert abs(planets["Jupiter"]["degree"] - 22.46) < 0.2

    assert planets["Venus"]["sign"] == "Virgo"
    assert abs(planets["Venus"]["degree"] - 9.89) < 0.2

    assert planets["Saturn"]["sign"] == "Cancer"
    assert abs(planets["Saturn"]["degree"] - 10.51) < 0.2

    assert planets["Rahu"]["sign"] == "Pisces"
    assert abs(planets["Rahu"]["degree"] - 22.14) < 0.5


def test_reference_chart_gajakesari_yoga_is_absent(reference_chart):
    """Jupiter is in Virgo (8th from Aquarius Moon) -> MUST BE ABSENT."""
    k = reference_chart
    yogas = YogaDoshaRegistry.evaluate_yogas(k["planets"], k["lagna"]["sign"], False)
    gj = next((y for y in yogas if y["rule_id"] == "YOGA_GAJAKESARI"), None)

    assert gj is not None
    assert gj["status"] == "ABSENT"
    assert gj["is_active"] is False
    assert gj["tested_references"]["house_from_moon"] == 8
    assert "not a Kendra" in gj["evidence_text_en"]


def test_reference_chart_budhaditya_yoga_is_absent(reference_chart):
    """Sun in Leo and Mercury in Cancer (adjacent signs) -> MUST BE ABSENT."""
    k = reference_chart
    yogas = YogaDoshaRegistry.evaluate_yogas(k["planets"], k["lagna"]["sign"], False)
    bu = next((y for y in yogas if y["rule_id"] == "YOGA_BUDHADITYA"), None)

    assert bu is not None
    assert bu["status"] == "ABSENT"
    assert bu["is_active"] is False
    assert "adjacent or separate signs" in bu["evidence_text_en"]


def test_reference_chart_amala_yoga_is_absent(reference_chart):
    """No natural benefic in 10th from Lagna (Leo has Sun) or 10th from Moon (Scorpio empty) -> MUST BE ABSENT."""
    k = reference_chart
    yogas = YogaDoshaRegistry.evaluate_yogas(k["planets"], k["lagna"]["sign"], False)
    am = next((y for y in yogas if y["rule_id"] == "YOGA_AMALA"), None)

    assert am is not None
    assert am["status"] == "ABSENT"
    assert am["is_active"] is False
    assert "No natural benefic" in am["evidence_text_en"]


def test_reference_chart_dharma_karmadhipati_is_present(reference_chart):
    """9th Lord Moon (in Aquarius, H4) and 10th Lord Sun (in Leo, H10) in mutual 7th aspect -> PRESENT."""
    k = reference_chart
    yogas = YogaDoshaRegistry.evaluate_yogas(k["planets"], k["lagna"]["sign"], False)
    dk = next((y for y in yogas if y["rule_id"] == "YOGA_DHARMA_KARMADHIPATI"), None)

    assert dk is not None
    assert dk["status"] == "PRESENT"
    assert dk["is_active"] is True
    assert "Mutual 7th Aspect" in dk["relationship_type"]
    assert "Dharma-Karmadhipati" in dk["evidence_text_en"]


def test_reference_chart_manglik_multi_reference_breakdown(reference_chart):
    """
    Mars in Aries:
    - Lagna (Scorpio): House 6 -> Not met
    - Moon (Aquarius): House 3 -> Not met
    - Venus (Virgo): House 8 -> Met, but mitigated by Mars in Aries (own sign Swakshetra).
    """
    k = reference_chart
    doshas = YogaDoshaRegistry.evaluate_doshas(k["planets"], k["lagna"]["sign"], False)
    mg = doshas["manglik"]

    assert mg["status"] == "PRESENT_WITH_MITIGATION"
    refs = mg["tested_references"]
    assert refs["from_lagna"]["house"] == 6
    assert refs["from_lagna"]["qualifies"] is False

    assert refs["from_moon"]["house"] == 3
    assert refs["from_moon"]["qualifies"] is False

    assert refs["from_venus"]["house"] == 8
    assert refs["from_venus"]["qualifies"] is True

    assert len(mg["mitigations_applied"]) > 0
    assert "Swakshetra in Aries" in mg["mitigations_applied"][0]


def test_reference_chart_kaal_sarp_is_absent(reference_chart):
    """Natal Moon in Aquarius is outside the Rahu-Ketu nodal axis -> ABSENT."""
    k = reference_chart
    doshas = YogaDoshaRegistry.evaluate_doshas(k["planets"], k["lagna"]["sign"], False)
    ks = doshas["kaal_sarp"]

    assert ks["status"] == "ABSENT"
    assert ks["has_dosha"] is False
    assert "both sides of the nodal axis" in ks["evidence_text_en"]


def test_reference_chart_sade_sati_is_phase_3_setting(reference_chart):
    """Natal Moon in Aquarius, transiting Saturn in Pisces -> 2nd from Moon = Phase 3 Setting."""
    k = reference_chart
    transits = YogaDoshaRegistry.evaluate_transits(k["planets"], "Pisces", "2026-10-29")
    ss = transits["sade_sati"]
    kd = transits["kantaka_shani"]

    assert ss["status"] == "PRESENT"
    assert ss["is_active"] is True
    assert "Phase 3: Setting" in ss["phase_en"]
    assert ss["house_from_moon"] == 2

    # Kantaka Shani must be separate and inactive
    assert kd["status"] == "ABSENT"
    assert kd["is_active"] is False


# -----------------------------------------------------------------------------
# 2. CONTROLLED BOUNDARY TESTS FOR YOGAS & DOSHAS
# -----------------------------------------------------------------------------

def test_gajakesari_positive_boundary():
    """Jupiter in 1st, 4th, 7th, 10th from Moon should trigger PRESENT."""
    planets = {
        "Moon": {"sign": "Taurus", "degree": 15.0},
        "Jupiter": {"sign": "Scorpio", "degree": 12.0} # 7th from Taurus = Kendra
    }
    yogas = YogaDoshaRegistry.evaluate_yogas(planets, "Aries", False)
    gj = next((y for y in yogas if y["rule_id"] == "YOGA_GAJAKESARI"), None)
    assert gj["status"] == "PRESENT"
    assert gj["is_active"] is True


def test_budhaditya_positive_boundary():
    """Sun and Mercury in the exact same sign should trigger PRESENT."""
    planets = {
        "Sun": {"sign": "Aries", "degree": 10.0},
        "Mercury": {"sign": "Aries", "degree": 20.0}
    }
    yogas = YogaDoshaRegistry.evaluate_yogas(planets, "Aries", False)
    bu = next((y for y in yogas if y["rule_id"] == "YOGA_BUDHADITYA"), None)
    assert bu["status"] == "PRESENT"
    assert bu["is_active"] is True


def test_amala_positive_boundary():
    """Jupiter in 10th house from Lagna should trigger PRESENT."""
    planets = {
        "Jupiter": {"sign": "Capricorn", "degree": 5.0}, # 10th from Aries is Capricorn
        "Moon": {"sign": "Gemini", "degree": 10.0}
    }
    yogas = YogaDoshaRegistry.evaluate_yogas(planets, "Aries", False)
    am = next((y for y in yogas if y["rule_id"] == "YOGA_AMALA"), None)
    assert am["status"] == "PRESENT"
    assert am["is_active"] is True


def test_dharma_karmadhipati_conjunction_positive():
    """9th and 10th lords conjunct in the same house."""
    # For Aries Lagna: 9th lord = Jupiter (Sagittarius), 10th lord = Saturn (Capricorn).
    # Conjunction in Leo (5th house):
    planets = {
        "Jupiter": {"sign": "Leo", "degree": 12.0, "house": 5},
        "Saturn": {"sign": "Leo", "degree": 15.0, "house": 5},
        "Moon": {"sign": "Aries", "degree": 1.0, "house": 1}
    }
    yogas = YogaDoshaRegistry.evaluate_yogas(planets, "Aries", False)
    dk = next((y for y in yogas if y["rule_id"] == "YOGA_DHARMA_KARMADHIPATI"), None)
    assert dk["status"] == "PRESENT"
    assert dk["is_active"] is True
    assert dk["relationship_type"] == "Conjunction"
