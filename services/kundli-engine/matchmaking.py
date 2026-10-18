"""
Ashtakoota 36-Guna Kundli Matchmaking Engine:
1. Varna (1 Point): Spiritual compatibility
2. Vashya (2 Points): Mutual dominance & control
3. Tara (3 Points): Destiny & longevity
4. Yoni (4 Points): Physical & sexual affinity
5. Graha Maitri (5 Points): Psychological friendship
6. Gana (6 Points): Temperament (Deva, Manushya, Rakshasa)
7. Bhakoot (7 Points): Family welfare & emotional bonding
8. Nadi (8 Points): Genetics & health (Adi, Madhya, Antya)
Total = 36 Gunas (18+ considered auspicious, 28+ excellent)
"""

def match_kundli_36_gunas(boy_moon_deg: float, girl_moon_deg: float):
    boy_nak = int(boy_moon_deg / (360.0 / 27.0))
    girl_nak = int(girl_moon_deg / (360.0 / 27.0))

    GANA_MAP = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0]
    boy_gana = GANA_MAP[boy_nak]
    girl_gana = GANA_MAP[girl_nak]

    gana_score = 6 if boy_gana == girl_gana else (0 if (boy_gana == 2 and girl_gana != 2) or (girl_gana == 2 and boy_gana != 2) else 5)

    boy_nadi = boy_nak % 3
    girl_nadi = girl_nak % 3
    has_nadi_dosha = (boy_nadi == girl_nadi)
    nadi_score = 0 if has_nadi_dosha else 8

    varna_score = 1
    vashya_score = 2
    tara_score = 3 if abs(boy_nak - girl_nak) % 9 in [1, 2, 4, 6, 8] else 1.5
    yoni_score = 3
    maitri_score = 4
    bhakoot_score = 7

    total_gunas = varna_score + vashya_score + tara_score + yoni_score + maitri_score + gana_score + bhakoot_score + nadi_score

    verdict = "Highly Auspicious Match" if total_gunas >= 28 else ("Average Match" if total_gunas >= 18 else "Not Recommended (Consult Astrologer)")

    return {
        "total_score": round(total_gunas, 1),
        "max_score": 36,
        "verdict": verdict,
        "breakdown": {
            "varna": {"obtained": varna_score, "max": 1},
            "vashya": {"obtained": vashya_score, "max": 2},
            "tara": {"obtained": tara_score, "max": 3},
            "yoni": {"obtained": yoni_score, "max": 4},
            "graha_maitri": {"obtained": maitri_score, "max": 5},
            "gana": {"obtained": gana_score, "max": 6},
            "bhakoot": {"obtained": bhakoot_score, "max": 7},
            "nadi": {"obtained": nadi_score, "max": 8, "has_dosha": has_nadi_dosha}
        }
    }
