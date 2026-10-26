# AstroVerse AI — Image Asset Manifest & Provenance Registry

**Document Date:** October 26, 2026  
**Director:** Visual Asset Director & UI/UX Specialist  

---

## 1. Mobile Client Store & Application Assets (`apps/mobile/assets/`)

| Asset File | Target Purpose | Resolution | Format | Provenance / Generation | License | Accessibility Alt Text |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `icon.png` | App Store & Google Play Icon | 1024 × 1024 | PNG | Proprietary AstroVerse geometric golden Dharmachakra on cosmic navy background | Commercial AstroVerse Proprietary | "AstroVerse AI celestial golden Dharmachakra on cosmic midnight blue" |
| `adaptive-icon.png`| Android Adaptive Icon Foreground | 1024 × 1024 | PNG | Centered golden Vedic wheel positioned within the 66% Android mask safe zone | Commercial AstroVerse Proprietary | "AstroVerse AI adaptive launcher icon emblem" |
| `splash.png` | Native iOS & Android Launch Screen | 2048 × 2048 | PNG | High-resolution cosmic starfield with centered Dharmachakra and golden glow | Commercial AstroVerse Proprietary | "AstroVerse AI launch screen with starfield and celestial wheel" |
| `favicon.png` | Web & Mobile Browser Tab Icon | 48 × 48 | PNG | Downscaled crisp Dharmachakra emblem | Commercial AstroVerse Proprietary | "AstroVerse AI favicon emblem" |

---

## 2. Web & Mobile Service Vector Illustrations (`assets/illustrations/`)

| Asset File | Target Feature | Vector Standard | Format | Description | Accessibility Alt Text |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `hero-zodiac-wheel.svg` | Web & Mobile Hero Section | Scalable SVG (800 × 800) | SVG | 12-Rashi celestial zodiac wheel with Sanskrit/English sign sectors, degrees, and central guidance emblem | "AstroVerse 12-sign Vedic celestial zodiac wheel with golden spokes" |
| `kundli-birthchart.svg` | Janam Kundli Birth Chart View | Scalable SVG (600 × 600) | SVG | Classical North Indian diamond lattice diagram detailing 12 Bhavas (1st Lagna through 12th Vyaya) | "Classical North Indian 12-house diamond birth chart diagram" |
| `horas-timing.svg` | 24-Hour Solar Horas Timeline | Scalable SVG (600 × 600) | SVG | Day and night 24-hour planetary Hora cycles with sunrise/sunset orientation | "24-hour planetary Horas solar timeline wheel" |
| `synastry-compatibility.svg` | Astrological Compatibility Synastry | Scalable SVG (600 × 600) | SVG | Dual intersecting celestial charts illustrating 36-Guna Ashtakoota harmony lens | "Dual intersecting birth chart synastry diagram with 36 Gunas" |
| `numerology-yantra.svg` | Numerology Studio | Scalable SVG (600 × 600) | SVG | Traditional Chaldean and Pythagorean 3x3 numerical magic square Yantra | "Vedic 3x3 numerology Yantra grid with numbers 1 through 9" |
| `transits-timeline.svg` | Planetary Transits & Gochar | Scalable SVG (600 × 600) | SVG | Multi-orbit planetary transit model highlighting Saturn, Jupiter, Rahu, and Ketu | "Planetary orbit transit diagram for Gochar and Vimshottari Dasha" |

---

## 3. Image Optimization & Quality Checks

- **Zero Broken Paths**: All asset references in `apps/mobile/app.json` verified to exist directly on disk.
- **Zero Third-Party Scraping**: No copyrighted commercial assets or competitor screenshots used.
- **Vector Independence**: All service illustrations are self-contained SVGs that render crisply at any DPI without network dependencies.
- **Aspect Ratio Integrity**: Icons and splash screens follow exact Apple Human Interface Guidelines and Google Play Icon specifications.
