# RESPONSIVE PREVIEW SCREENSHOT & VIEWPORT INDEX

**Application:** AstroVerse AI  
**Target Preview Origin:** `https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app`  
**Execution Timestamp:** 2026-11-05T00:52:00.000Z  
**Chrome Debugging Endpoint:** `http://127.0.0.1:9222`  
**Current Status:** **BLOCKED_VERCEL_SSO (Awaiting Owner SSO in Profile `D:\insta\automation_profile`)**  

---

## 1. Planned Responsive Viewport Suite

The responsive test harness in `scripts/verify_phase4_cdp_responsive.mjs` targets 8 standard industry device dimensions:

| Viewport Key | Dimensions (W × H) | Aspect Ratio | Device Category | DOM Verification Metrics |
|:---|:---|:---|:---|:---|
| `mobile_compact` | 360 × 640 | 9:16 | Compact Mobile | Horizontal overflow, menu collapse, touch targets >= 44px |
| `mobile_standard` | 390 × 844 | 19.5:9 | Modern Smartphone | Navigation drawer toggle, card reflow, typography readability |
| `mobile_max` | 430 × 932 | 19.5:9 | Large Smartphone | Safe area reflow, sticky action center, metric grid balance |
| `tablet_portrait` | 768 × 1024 | 3:4 | Tablet Portrait | Sidebar collapsible behavior, filter preset accessibility |
| `tablet_landscape` | 1024 × 768 | 4:3 | Tablet Landscape | Two-column dashboard layout, table scroll containers |
| `laptop_hd` | 1366 × 768 | 16:9 | HD Laptop | Full sidebar expansion, fixed command cards, grid flow |
| `desktop_standard` | 1440 × 900 | 16:10 | Standard Desktop | Multi-horizon prediction view, persistent ground truth banner |
| `desktop_fhd` | 1920 × 1080 | 16:9 | Full HD Monitor | Master Admin Command Centre layout, high-density analytics |

---

## 2. Browser Zoom Levels (WCAG 1.4.10 Reflow)

| Zoom Scale | Emulation Command | Verification Requirement |
|:---|:---|:---|
| **125%** | `Emulation.setPageScaleFactor(1.25)` | Modal dialogs remain centered; no clipped control labels |
| **150%** | `Emulation.setPageScaleFactor(1.50)` | Table sticky headers functional; no overlapping buttons |
| **200%** | `Emulation.setPageScaleFactor(2.00)` | No two-dimensional scrolling required; full content accessible |

---

## 3. Screenshot Capture Status

- **Status:** **BLOCKED_VERCEL_SSO**
- **Reason:** The browser instance listening on port 9222 is currently displaying `https://vercel.com/login?next=...`. Per the non-fabrication rule, screenshots of third-party login pages are rejected as application verification.
- **Resumption:** Live screenshot capture and DOM bounding client measurements will proceed immediately upon completion of SSO authentication in that Chrome session.
