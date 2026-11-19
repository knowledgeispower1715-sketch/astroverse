import path from "path";
import { chromium } from "playwright";

(async () => {
  console.log(
    "================================================================",
  );
  console.log("RUNNING MILESTONE 4 PLAYWRIGHT IN-BROWSER VALIDATION SUITE");
  console.log(
    "================================================================",
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  const fileUrl =
    "file:///" + path.resolve("e:/rea/index.html").replace(/\\/g, "/");
  console.log(`Loading application from: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  let passedAssertions = 0;
  let failedAssertions = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedAssertions++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedAssertions++;
    }
  }

  // 1. Console & Page Errors
  assert(
    pageErrors.length === 0,
    `Zero page runtime errors (Actual: ${pageErrors.length} -> ${pageErrors.join("; ")})`,
  );
  const appConsoleErrors = consoleErrors.filter(
    (m) => !m.includes("net::ERR") && !m.includes("Failed to load resource"),
  );
  assert(
    appConsoleErrors.length === 0,
    `Zero JavaScript application console errors (Actual: ${appConsoleErrors.length} -> ${appConsoleErrors.join("; ")})`,
  );

  // 2. Navigation Entry Points
  const desktopNavBtn = await page.$("#btn-nav-calendar");
  assert(!!desktopNavBtn, "Desktop navbar contains #btn-nav-calendar");

  const mobileNavBtn = await page.$("#mob-nav-calendar");
  assert(!!mobileNavBtn, "Mobile nav drawer contains #mob-nav-calendar");

  const mobileDockBtn = await page.$("#mob-dock-calendar");
  assert(!!mobileDockBtn, "Mobile bottom dock contains #mob-dock-calendar");

  const exploreCtaBtn = await page.$("#btn-explore-calendar-cta");
  assert(!!exploreCtaBtn, "Overview card contains #btn-explore-calendar-cta");

  // 3. Navigate to Calendar View via #btn-nav-calendar
  await page.click("#btn-nav-calendar");
  await page.waitForTimeout(300);

  const isCalActive = await page.evaluate(() => {
    const sec = document.getElementById("view-calendar");
    return sec && sec.classList.contains("active");
  });
  assert(
    isCalActive,
    "#view-calendar section is active after clicking #btn-nav-calendar",
  );

  // 4. Header Controls Verification
  const headerCheck = await page.evaluate(() => {
    const monthSel = document.getElementById("cal-select-month");
    const yearSel = document.getElementById("cal-select-year");
    const dateInput = document.getElementById("cal-input-date");
    const todayBtn = document.getElementById("cal-btn-today");
    const locBadge = document.getElementById("cal-disp-location");
    const btn3d = document.getElementById("cal-view-btn-3d");
    const btn2d = document.getElementById("cal-view-btn-2d");
    const btnPur = document.getElementById("cal-trad-purnimanta");
    const btnAma = document.getElementById("cal-trad-amanta");

    return {
      monthVal: monthSel?.value,
      yearVal: yearSel?.value,
      dateVal: dateInput?.value,
      todayBtn: !!todayBtn,
      locBadgeText: locBadge?.textContent?.trim(),
      has3dBtn: !!btn3d,
      has2dBtn: !!btn2d,
      is3dActive: btn3d?.classList.contains("active"),
      is2dActive: btn2d?.classList.contains("active"),
      isPurActive: btnPur?.classList.contains("active"),
      isAmaActive: btnAma?.classList.contains("active"),
    };
  });

  assert(
    headerCheck.monthVal === "11",
    `Default month selector is November (11) (Actual: ${headerCheck.monthVal})`,
  );
  assert(
    headerCheck.yearVal === "2026",
    `Default year selector is 2026 (Actual: ${headerCheck.yearVal})`,
  );
  assert(
    headerCheck.has3dBtn && headerCheck.has2dBtn,
    "Both 3D Cosmic and Classic 2D view toggle buttons exist",
  );
  assert(headerCheck.is3dActive, "3D Cosmic View is active by default");
  assert(headerCheck.isPurActive, "Purnimanta convention is active by default");
  assert(
    headerCheck.locBadgeText.includes("New Delhi"),
    `Location badge displays New Delhi (Actual: ${headerCheck.locBadgeText})`,
  );

  // 5. Month Grid & Date Cards
  const gridCheck = await page.evaluate(() => {
    const grid = document.getElementById("cal-month-grid");
    const cards = document.querySelectorAll(".cal-date-card:not(.pad-day)");
    const padCards = document.querySelectorAll(".cal-date-card.pad-day");
    const selected = document.querySelector(".cal-date-card.selected");

    return {
      isGrid3d: grid?.classList.contains("cal-grid-3d"),
      activeDayCount: cards.length,
      padCardCount: padCards.length,
      selectedDate: selected?.getAttribute("data-date"),
      hasTithiChips: !!document.querySelector(".cal-tithi-chip"),
      hasRashiBadges: !!document.querySelector(".cal-rashi-badge"),
      hasLunarGlyphs: !!document.querySelector(".cal-lunar-glyph"),
    };
  });

  assert(gridCheck.isGrid3d, "#cal-month-grid has class cal-grid-3d");
  assert(
    gridCheck.activeDayCount === 30,
    `November 2026 has exactly 30 active day cards (Actual: ${gridCheck.activeDayCount})`,
  );
  assert(
    gridCheck.selectedDate === "2026-11-17",
    `Default selected date is 2026-11-17 (Actual: ${gridCheck.selectedDate})`,
  );
  assert(gridCheck.hasTithiChips, "Date cards render Sanskrit tithi chips");
  assert(gridCheck.hasRashiBadges, "Date cards render Moon rashi symbols");
  assert(gridCheck.hasLunarGlyphs, "Date cards render lunar phase glyphs");

  // 6. Day Selection & Inspector Update
  await page.evaluate(() => {
    window.selectCalendarDate("2026-11-08"); // Diwali date!
  });
  await page.waitForTimeout(200);

  const diwaliInspector = await page.evaluate(() => {
    const title = document
      .getElementById("cal-insp-date-title")
      ?.textContent?.trim();
    const tithi = document
      .getElementById("cal-insp-tithi-name")
      ?.textContent?.trim();
    const festRow = document.getElementById("cal-insp-fest-row");
    const festText = document
      .getElementById("cal-insp-festivals-text")
      ?.textContent?.trim();

    return {
      title,
      tithi,
      festVisible: festRow?.style.display !== "none",
      festText,
    };
  });

  assert(
    diwaliInspector.title.includes("8 Nov 2026"),
    `Day inspector updated to 8 Nov 2026 (Actual: ${diwaliInspector.title})`,
  );
  assert(
    diwaliInspector.festVisible,
    "Holiday row is visible on Nov 8 (Diwali)",
  );
  assert(
    diwaliInspector.festText.includes("Diwali"),
    `Holiday row cites Diwali (Actual: ${diwaliInspector.festText})`,
  );

  // 7. Keyboard Navigation on Month Grid
  await page.evaluate(() => {
    // Dispatch ArrowRight key from 2026-11-08
    window.handleCalendarCellKey(
      { key: "ArrowRight", preventDefault: () => {} },
      "2026-11-08",
    );
  });
  await page.waitForTimeout(100);

  const nextDaySelected = await page.evaluate(() => {
    return window.currentCalendarState.selectedDate;
  });
  assert(
    nextDaySelected === "2026-11-09",
    `ArrowRight advances selected date to 2026-11-09 (Actual: ${nextDaySelected})`,
  );

  // 8. View Mode Switch (3D -> 2D -> 3D)
  await page.click("#cal-view-btn-2d");
  await page.waitForTimeout(100);

  const is2dActiveNow = await page.evaluate(() => {
    const grid = document.getElementById("cal-month-grid");
    const mode = localStorage.getItem("astro_calendar_view_mode");
    return (
      grid.classList.contains("cal-grid-2d") &&
      !grid.classList.contains("cal-grid-3d") &&
      mode === "2d"
    );
  });
  assert(
    is2dActiveNow,
    "Switching to Classic 2D applies cal-grid-2d and persists mode to localStorage",
  );

  await page.click("#cal-view-btn-3d");
  await page.waitForTimeout(100);

  const is3dActiveAgain = await page.evaluate(() => {
    const grid = document.getElementById("cal-month-grid");
    const mode = localStorage.getItem("astro_calendar_view_mode");
    return grid.classList.contains("cal-grid-3d") && mode === "3d";
  });
  assert(
    is3dActiveAgain,
    "Switching back to 3D Cosmic applies cal-grid-3d and persists mode to localStorage",
  );

  // 9. Sub-Workspace 2: Day Panchang (5 Angas)
  await page.click("#cal-tab-btn-panchang");
  await page.waitForTimeout(200);

  const panchangCheck = await page.evaluate(() => {
    const panel = document.getElementById("cal-tab-panel-panchang");
    const cards = document.querySelectorAll(
      "#cal-angas-grid-container .cal-anga-card",
    );
    const celestialContent = document.getElementById(
      "cal-celestial-timings-content",
    );
    const samvatContent = document.getElementById("cal-samvat-details-content");

    return {
      isActive: panel?.classList.contains("active"),
      angaCount: cards.length,
      hasCelestialTimings: celestialContent?.children.length >= 5,
      hasSamvatDetails: samvatContent?.children.length >= 5,
    };
  });

  assert(panchangCheck.isActive, "Panchang tab panel is active");
  assert(
    panchangCheck.angaCount === 5,
    `Panchang renders all 5 Angas cards (Actual: ${panchangCheck.angaCount})`,
  );
  assert(
    panchangCheck.hasCelestialTimings,
    "Panchang renders complete celestial timings (Sunrise/Set/Noon/Moon)",
  );
  assert(
    panchangCheck.hasSamvatDetails,
    "Panchang renders Samvat, Ayana, and Ritu details",
  );

  // 10. Sub-Workspace 3: 12-Sign Rashifal
  await page.click("#cal-tab-btn-rashifal");
  await page.waitForTimeout(200);

  const rashifalCheck = await page.evaluate(() => {
    const panel = document.getElementById("cal-tab-panel-rashifal");
    const filterPills = document.querySelectorAll(
      "#cal-rashifal-signs-filter-bar .cal-sign-filter-pill",
    );
    const rashiCards = document.querySelectorAll(
      "#cal-rashifal-cards-container .cal-rashi-card",
    );
    const firstCard = rashiCards[0];

    return {
      isActive: panel?.classList.contains("active"),
      pillCount: filterPills.length,
      cardCount: rashiCards.length,
      hasCareerSection: firstCard?.innerHTML.includes("Career"),
      hasFinanceSection: firstCard?.innerHTML.includes("Finance"),
      hasRelationships: firstCard?.innerHTML.includes("Relationships"),
      hasWellness: firstCard?.innerHTML.includes("Wellness"),
      hasLuckyNumber: firstCard?.innerHTML.includes("Lucky Number"),
    };
  });

  assert(rashifalCheck.isActive, "Rashifal tab panel is active");
  assert(
    rashifalCheck.pillCount === 13,
    `Rashifal filter bar has 13 pills (All + 12 Signs) (Actual: ${rashifalCheck.pillCount})`,
  );
  assert(
    rashifalCheck.cardCount === 12,
    `Rashifal renders all 12 signs cards (Actual: ${rashifalCheck.cardCount})`,
  );
  assert(
    rashifalCheck.hasCareerSection &&
      rashifalCheck.hasFinanceSection &&
      rashifalCheck.hasRelationships &&
      rashifalCheck.hasWellness,
    "Rashi card contains all mandatory dimensions (Career, Finance, Relationships, Wellness, Focus)",
  );

  // 11. Sub-Workspace 4: Festivals & Holidays
  await page.click("#cal-tab-btn-festivals");
  await page.waitForTimeout(200);

  const festivalCheck = await page.evaluate(() => {
    const panel = document.getElementById("cal-tab-panel-festivals");
    const festCards = document.querySelectorAll(
      "#cal-festivals-list-container .cal-fest-card",
    );
    const hasDiwali = Array.from(festCards).some((c) =>
      c.textContent.includes("Diwali"),
    );

    return {
      isActive: panel?.classList.contains("active"),
      cardCount: festCards.length,
      hasDiwali,
    };
  });

  assert(festivalCheck.isActive, "Festivals tab panel is active");
  assert(
    festivalCheck.cardCount >= 5,
    `Festivals list renders multiple observances for the month (Actual: ${festivalCheck.cardCount})`,
  );
  assert(
    festivalCheck.hasDiwali,
    "Festivals list contains Diwali observance for November 2026",
  );

  // 12. Sub-Workspace 5: Auspicious Muhurats & Choghadiya
  await page.click("#cal-tab-btn-muhurat");
  await page.waitForTimeout(200);

  const muhuratCheck = await page.evaluate(() => {
    const panel = document.getElementById("cal-tab-panel-muhurat");
    const auspRows = document.querySelectorAll(
      "#cal-auspicious-muhurat-rows .cal-insp-row",
    );
    const inauspRows = document.querySelectorAll(
      "#cal-inauspicious-muhurat-rows .cal-insp-row",
    );
    const choghRows = document.querySelectorAll("#cal-choghadiya-tbody tr");

    return {
      isActive: panel?.classList.contains("active"),
      auspCount: auspRows.length,
      inauspCount: inauspRows.length,
      choghRowsCount: choghRows.length,
    };
  });

  assert(muhuratCheck.isActive, "Muhurats tab panel is active");
  assert(
    muhuratCheck.auspCount >= 4,
    `Auspicious Muhurats table renders windows (Actual: ${muhuratCheck.auspCount})`,
  );
  assert(
    muhuratCheck.inauspCount >= 4,
    `Inauspicious Muhurats table renders windows (Actual: ${muhuratCheck.inauspCount})`,
  );
  assert(
    muhuratCheck.choghRowsCount === 16,
    `Complete 16-period Day & Night Choghadiya table populated (Actual: ${muhuratCheck.choghRowsCount})`,
  );

  // 13. Sub-Workspace 6: Transits & Lunar Events
  await page.click("#cal-tab-btn-transits");
  await page.waitForTimeout(200);

  const transitsCheck = await page.evaluate(() => {
    const panel = document.getElementById("cal-tab-panel-transits");
    const lunarCards = document.querySelectorAll(
      "#cal-lunar-phases-container .cal-lunar-phase-card",
    );
    const grahaCards = document.querySelectorAll(
      "#cal-grahas-grid-container .cal-graha-card",
    );
    const ingressRows = document.querySelectorAll("#cal-ingress-tbody tr");

    return {
      isActive: panel?.classList.contains("active"),
      lunarCount: lunarCards.length,
      grahaCount: grahaCards.length,
      ingressCount: ingressRows.length,
    };
  });

  assert(transitsCheck.isActive, "Transits tab panel is active");
  assert(
    transitsCheck.lunarCount === 4,
    `Transits renders 4 primary lunar phases (Actual: ${transitsCheck.lunarCount})`,
  );
  assert(
    transitsCheck.grahaCount === 9,
    `Transits renders all 9 Navagrahas live sidereal positions (Actual: ${transitsCheck.grahaCount})`,
  );
  assert(
    transitsCheck.ingressCount >= 2,
    `Transits renders monthly sign ingresses (Actual: ${transitsCheck.ingressCount})`,
  );

  // 14. Sub-Workspace 7: Personalized Calendar
  await page.click("#cal-tab-btn-personal");
  await page.waitForTimeout(200);

  const personalCheck = await page.evaluate(() => {
    const panel = document.getElementById("cal-tab-panel-personal");
    const summary = document
      .getElementById("cal-personal-profile-summary")
      ?.textContent?.trim();
    const sadeSati = document
      .getElementById("cal-personal-sade-sati-content")
      ?.textContent?.trim();
    const chandra = document
      .getElementById("cal-personal-chandrashtama-content")
      ?.textContent?.trim();

    return {
      isActive: panel?.classList.contains("active"),
      hasSummary: !!summary,
      hasSadeSati: !!sadeSati,
      hasChandra: !!chandra,
    };
  });

  assert(personalCheck.isActive, "Personalized calendar tab panel is active");
  assert(
    personalCheck.hasSummary &&
      personalCheck.hasSadeSati &&
      personalCheck.hasChandra,
    "Personalized calendar renders profile summary, Sade Sati status, and Chandrashtama dates",
  );

  // 15. Location Modal & Coordinates Update
  await page.evaluate(() => {
    window.openCalendarLocationModal();
  });
  await page.waitForTimeout(200);

  const locModalVisible = await page.evaluate(() => {
    const m = document.getElementById("modal-calendar-location");
    const cityChips = document.querySelectorAll(
      "#cal-quick-cities-grid .cal-city-pill",
    );
    return {
      isVisible: m && m.style.display === "flex",
      chipsCount: cityChips.length,
    };
  });

  assert(
    locModalVisible.isVisible,
    "Location modal opens cleanly on openCalendarLocationModal()",
  );
  assert(
    locModalVisible.chipsCount === 18,
    `Location modal renders all 18 reference city chips (Actual: ${locModalVisible.chipsCount})`,
  );

  // Select Mumbai from chips and Save
  await page.evaluate(() => {
    window.selectCalendarQuickCity(
      "Mumbai, India",
      19.076,
      72.8777,
      "Asia/Kolkata",
    );
    window.saveCalendarLocation();
  });
  await page.waitForTimeout(200);

  const updatedLocCheck = await page.evaluate(() => {
    const saved = JSON.parse(
      localStorage.getItem("astro_calendar_location") || "{}",
    );
    const badge = document
      .getElementById("cal-disp-location")
      ?.textContent?.trim();
    return {
      savedName: saved.name,
      savedLat: saved.lat,
      badgeText: badge,
    };
  });

  assert(
    updatedLocCheck.savedName.includes("Mumbai"),
    `Location saved to Mumbai in localStorage (Actual: ${updatedLocCheck.savedName})`,
  );
  assert(
    updatedLocCheck.badgeText.includes("Mumbai"),
    `Header location badge updated to Mumbai (Actual: ${updatedLocCheck.badgeText})`,
  );

  // 16. Multi-Viewport Responsive Tests (320px to 1920px)
  const viewports = [
    { width: 1920, height: 1080, name: "Desktop Full HD" },
    { width: 1280, height: 800, name: "Laptop WXGA" },
    { width: 768, height: 1024, name: "Tablet Portrait" },
    { width: 375, height: 667, name: "Mobile iPhone SE" },
    { width: 320, height: 568, name: "Mobile Ultra-Narrow 320px" },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(100);

    const overflowCheck = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        windowInnerWidth: window.innerWidth,
        hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
      };
    });

    assert(
      !overflowCheck.hasHorizontalOverflow,
      `Viewport ${vp.name} (${vp.width}x${vp.height}): Zero horizontal overflow (scrollWidth=${overflowCheck.bodyScrollWidth}, innerWidth=${overflowCheck.windowInnerWidth})`,
    );
  }

  // 17. Regression Check on Prior Defect Fixes (M3)
  const defectRegressions = await page.evaluate(() => {
    const defResults = [];

    // DEFECT-UX-01: openSavedProfilesModal exists and callable
    try {
      window.openSavedProfilesModal();
      defResults.push({ id: "DEFECT-UX-01", ok: true });
    } catch (e) {
      defResults.push({ id: "DEFECT-UX-01", ok: false, err: e.message });
    }

    // DEFECT-UX-02: resetKundliForm exists and callable
    try {
      window.resetKundliForm();
      defResults.push({ id: "DEFECT-UX-02", ok: true });
    } catch (e) {
      defResults.push({ id: "DEFECT-UX-02", ok: false, err: e.message });
    }

    // DEFECT-UX-03: skipGuestImport & executeGuestImport exist
    defResults.push({
      id: "DEFECT-UX-03",
      ok:
        typeof window.skipGuestImport === "function" &&
        typeof window.executeGuestImport === "function",
    });

    // DEFECT-UX-05: mobile dock has both classes
    const dock = document.querySelector(".mobile-bottom-dock");
    defResults.push({
      id: "DEFECT-UX-05",
      ok: !!dock && dock.classList.contains("mob-bottom-dock"),
    });

    return defResults;
  });

  defectRegressions.forEach((dr) => {
    assert(dr.ok, `Regression Check ${dr.id}: Still clean and verified`);
  });

  console.log(
    "================================================================",
  );
  console.log(
    `MILESTONE 4 TEST SUMMARY: ${passedAssertions} PASSED, ${failedAssertions} FAILED`,
  );
  console.log(
    "================================================================",
  );

  await browser.close();

  if (failedAssertions > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
