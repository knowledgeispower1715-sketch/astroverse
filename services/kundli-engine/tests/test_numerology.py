"""
AstroVerse Numerology Test Suite
================================
Validates mathematical correctness, known values, Chaldean/Pythagorean mappings,
9x9 planetary relationship matrix, compound numbers, harmony scoring, and name correction.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from numerology_engine import (
    digit_root_1_to_9,
    calculate_mulank,
    calculate_bhagyank,
    calculate_naamank,
    calculate_harmony_score,
    generate_name_correction_candidates,
    get_signature_guidance,
    analyze_business_name,
    analyze_mobile_number,
    CHALDEAN_MAP,
    PYTHAGOREAN_MAP,
    RELATIONSHIP_MATRIX,
    PREFERRED_COMPOUND_NUMBERS,
    CHALLENGING_COMPOUND_NUMBERS,
    PLANET_DATA
)

# ---------------------------------------------------------------------------
# 1. DIGIT ROOT TESTS
# ---------------------------------------------------------------------------

def test_digit_root():
    assert digit_root_1_to_9(0) == 0
    assert digit_root_1_to_9(1) == 1
    assert digit_root_1_to_9(9) == 9
    assert digit_root_1_to_9(10) == 1
    assert digit_root_1_to_9(19) == 1  # 1+9 = 10 -> 1
    assert digit_root_1_to_9(23) == 5  # 2+3 = 5
    assert digit_root_1_to_9(337) == 4 # 3+3+7 = 13 -> 4

    with pytest.raises(ValueError):
        digit_root_1_to_9(-5)
    with pytest.raises(ValueError):
        digit_root_1_to_9(True)  # Booleans rejected
    with pytest.raises(ValueError):
        digit_root_1_to_9("123") # Strings rejected

# ---------------------------------------------------------------------------
# 2. MOOLANK & BHAGYANK KNOWN VALUES
# ---------------------------------------------------------------------------

def test_moolank_known_values():
    assert calculate_mulank(1) == 1
    assert calculate_mulank(9) == 9
    assert calculate_mulank(10) == 1
    assert calculate_mulank(20) == 2
    assert calculate_mulank(28) == 1  # 2+8 = 10 -> 1
    assert calculate_mulank(29) == 2  # 2+9 = 11 -> 2
    assert calculate_mulank(31) == 4  # 3+1 = 4

    with pytest.raises(ValueError):
        calculate_mulank(0)
    with pytest.raises(ValueError):
        calculate_mulank(32)

def test_bhagyank_known_values():
    # Directive required known test: 2005-08-20 -> Moolank 2, Bhagyank 8
    res = calculate_bhagyank("2005-08-20")
    assert res["destiny_number"] == 8
    assert res["total_sum"] == 17  # 2 + 0 + 0 + 5 + 0 + 8 + 2 + 0 = 17 -> 8
    assert calculate_mulank(20) == 2

    # Another verified date: 1995-08-14 -> 1+9+9+5+0+8+1+4 = 37 -> 10 -> 1
    res2 = calculate_bhagyank("1995-08-14")
    assert res2["total_sum"] == 37
    assert res2["destiny_number"] == 1

    # Invalid dates
    with pytest.raises(ValueError):
        calculate_bhagyank("invalid-date")
    with pytest.raises(ValueError):
        calculate_bhagyank("2021-02-29")  # 2021 not a leap year

# ---------------------------------------------------------------------------
# 3. CHALDEAN & PYTHAGOREAN KNOWN VALUES (ARYAN TEST CASE)
# ---------------------------------------------------------------------------

def test_name_aryan_known_values():
    """
    Directive required known test case:
    ARYAN:
    - Chaldean total = 10 (A=1, R=2, Y=1, A=1, N=5 -> 10)
    - Chaldean reduced root = 1
    - Pythagorean total = 23 (A=1, R=9, Y=7, A=1, N=5 -> 23)
    - Pythagorean reduced root = 5
    """
    res = calculate_naamank("ARYAN")

    # Chaldean checks
    assert res["chaldean"]["compound_total"] == 10
    assert res["chaldean"]["naamank"] == 1
    assert res["chaldean"]["governing_planet"] == "Sun (Surya)"

    # Pythagorean checks
    assert res["pythagorean"]["compound_total"] == 23
    assert res["pythagorean"]["naamank"] == 5
    assert res["pythagorean"]["governing_planet"] == "Mercury (Budha)"

    # Letter-by-letter breakdown verification
    c_letters = {item["letter"]: item["value"] for item in res["chaldean"]["breakdown"]}
    assert c_letters["A"] == 1
    assert c_letters["R"] == 2
    assert c_letters["Y"] == 1
    assert c_letters["N"] == 5

def test_letter_mappings_integrity():
    # 9 must have no letters in Chaldean
    assert 9 not in CHALDEAN_MAP.values()
    assert len(CHALDEAN_MAP) == 26

    # Pythagorean has all 1-9
    assert set(PYTHAGOREAN_MAP.values()) == set(range(1, 10))
    assert len(PYTHAGOREAN_MAP) == 26

# ---------------------------------------------------------------------------
# 4. 9x9 PLANETARY RELATIONSHIP MATRIX
# ---------------------------------------------------------------------------

def test_relationship_matrix_completeness():
    for i in range(1, 10):
        assert i in RELATIONSHIP_MATRIX
        for j in range(1, 10):
            rel = RELATIONSHIP_MATRIX[i].get(j)
            assert rel in ("friendly", "neutral", "enemy")

    # Known Jyotish relationships:
    # Sun (1) vs Saturn (8) must be enemy
    assert RELATIONSHIP_MATRIX[1][8] == "enemy"
    assert RELATIONSHIP_MATRIX[8][1] == "enemy"

    # Sun (1) vs Mars (9) must be friendly
    assert RELATIONSHIP_MATRIX[1][9] == "friendly"
    assert RELATIONSHIP_MATRIX[9][1] == "friendly"

    # Mercury (5) has no enemies
    for j in range(1, 10):
        assert RELATIONSHIP_MATRIX[5][j] != "enemy"

# ---------------------------------------------------------------------------
# 5. HARMONY SCORING FORMULA
# ---------------------------------------------------------------------------

def test_harmony_scoring_formula():
    """
    Test harmony score calculation:
    Moolank 1, Bhagyank 1, Chaldean Compound 19 (Preferred):
    - Moolank vs Naamank (1 vs 1): Friendly -> 100
    - Bhagyank vs Naamank (1 vs 1): Friendly -> 100
    - Compound 19: Preferred -> 100
    - Score = round(0.40 * 100 + 0.40 * 100 + 0.20 * 100) = 100
    """
    res = calculate_harmony_score(1, 1, 19)
    assert res["score"] == 100
    assert res["scale"] == "0-100"
    assert res["alignment_tier_en"] == "High Synergy (Highly Auspicious)"

    # Clashing test: Moolank 1, Bhagyank 8, Compound 26 (Challenging)
    # Naamank for 26 is 8.
    # 1 vs 8: Enemy -> 30 (0.40 * 30 = 12)
    # 8 vs 8: Neutral -> 65 (0.40 * 65 = 26)
    # Compound 26: Challenging -> 30 (0.20 * 30 = 6)
    # Score = round(12 + 26 + 6) = 44
    res_clash = calculate_harmony_score(1, 8, 26)
    assert res_clash["score"] == 44
    assert res_clash["alignment_tier_en"] == "Planetary Friction (Correction Recommended)"

# ---------------------------------------------------------------------------
# 6. NAME CORRECTION CANDIDATE GENERATION
# ---------------------------------------------------------------------------

def test_name_correction_generation():
    candidates = generate_name_correction_candidates(
        full_name="ARYAN TIWARI",
        dob_iso="2005-08-20",
        target_count=5
    )
    assert len(candidates) >= 3
    assert len(candidates) <= 5

    for cand in candidates:
        assert "proposed_name" in cand
        assert "chaldean_compound" in cand
        assert "harmony_score" in cand
        assert "edit_distance" in cand
        assert cand["edit_distance"] <= 5
        assert cand["harmony_score"] >= 0

# ---------------------------------------------------------------------------
# 7. BUSINESS NAME & MOBILE NUMBER
# ---------------------------------------------------------------------------

def test_business_and_mobile_analysis():
    biz = analyze_business_name("AstroVerse Media", owner_dob_iso="1995-08-14")
    assert biz["calculation"]["chaldean"]["compound_total"] > 0
    assert "owner_alignment" in biz

    mob = analyze_mobile_number("+91 98765 43210")
    assert mob["compound_total"] == 45 # 9+8+7+6+5+4+3+2+1+0 = 45 -> 9
    assert mob["reduced_number"] == 9
    assert mob["governing_planet_en"] == "Mars (Mangala)"

# ---------------------------------------------------------------------------
# 8. SIGNATURE GUIDANCE
# ---------------------------------------------------------------------------

def test_signature_guidance():
    sig = get_signature_guidance(moolank=1, naamank=5)
    assert "+15° to +25°" in sig["recommended_slope"]
    assert "guidance_en" in sig
    assert "guidance_hi" in sig
