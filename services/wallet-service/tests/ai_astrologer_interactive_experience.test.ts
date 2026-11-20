import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

test("AI ASTROLOGER INTERACTIVE EXPERIENCE & ZERO-PREFILLED CHIPS SUITE", async (t) => {
  const indexPath = path.resolve(__dirname, "../../../index.html");
  const htmlContent = fs.readFileSync(indexPath, "utf-8");

  await t.test(
    "1. Zero forced prefilled question chips rendered on initial greeting",
    () => {
      // Verify renderInitialGreetingForPersona calls renderDynamicChips with an empty array
      assert.ok(
        htmlContent.includes("renderDynamicChips([]);"),
        "Initial greeting must not force prefilled chips on the seeker",
      );

      // Verify initial greeting function does not pass initialChips to renderDynamicChips
      assert.ok(
        !htmlContent.includes("renderDynamicChips(initialChips);"),
        "Must eliminate renderDynamicChips(initialChips) call",
      );
    },
  );

  await t.test(
    "2. In-chat multi-turn birth coordinate parsing and automatic Kundli calculation",
    () => {
      // Verify in-chat birth details parsing supports both numerical and natural language dates
      assert.ok(
        htmlContent.includes("numDateMatch") &&
          htmlContent.includes("writtenMatch1") &&
          htmlContent.includes("MONTH_MAP"),
        "sendAiUserChatMessage must parse both standard numeric and written month birth dates",
      );

      // Verify time extraction handles both 12-hour am/pm and 24-hour formats
      assert.ok(
        htmlContent.includes("timeMatch1") &&
          htmlContent.includes("timeMatch2") &&
          htmlContent.includes("pendingProfile.tob"),
        "sendAiUserChatMessage must support 12-hour am/pm and 24-hour birth times",
      );

      // Verify city extraction matches against known reference cities
      assert.ok(
        htmlContent.includes("KNOWN_CITIES") &&
          htmlContent.includes("pendingProfile.city") &&
          htmlContent.includes("pendingProfile.lat"),
        "sendAiUserChatMessage must recognize cities and extract coordinates",
      );

      // Verify automatic Janam Kundli calculation and linking
      assert.ok(
        htmlContent.includes(
          "calculateClientKundli(cleanDob, cleanTob, resolvedLat, resolvedLon, false)",
        ),
        "Must trigger calculateClientKundli upon gathering coordinates",
      );
      assert.ok(
        htmlContent.includes("toggleChatKundliLink(true)"),
        "Must link chart automatically upon calculation",
      );
    },
  );

  await t.test(
    "3. Interactive Remedy Card contains copy mantra and sacred chime audio",
    () => {
      // Verify copyMantra and playSacredChime definitions
      assert.ok(
        htmlContent.includes("function copyMantra("),
        "index.html must define copyMantra",
      );
      assert.ok(
        htmlContent.includes("window.copyMantra = copyMantra;"),
        "copyMantra must be exposed to window",
      );
      assert.ok(
        htmlContent.includes("function playSacredChime()"),
        "index.html must define playSacredChime",
      );
      assert.ok(
        htmlContent.includes("window.playSacredChime = playSacredChime;"),
        "playSacredChime must be exposed to window",
      );

      // Verify 432 Hz fundamental frequency used for sacred temple bell sound
      assert.ok(
        htmlContent.includes("432"),
        "playSacredChime must use 432 Hz sacred frequency",
      );

      // Verify Remedy Card renders interactive copy and chime buttons
      assert.ok(
        htmlContent.includes("btn-remedy-action") &&
          htmlContent.includes("Copy Mantra") &&
          htmlContent.includes("Sacred Chime"),
        "Remedy Card must render Copy Mantra and Sacred Chime action buttons",
      );
    },
  );

  await t.test(
    "4. Unlinked chat mode prompts for birth coordinates conversationally without forced chips",
    () => {
      // Verify unlinked mode explains birth detail requirements politely in chat
      assert.ok(
        htmlContent.includes(
          "To Give You an Exact, 100% Chart-Grounded Answer:",
        ),
        "Unlinked English mode must explain why birth details are needed",
      );
      assert.ok(
        htmlContent.includes("सटीक एवं 100% व्यक्तिगत फलादेश हेतु:"),
        "Unlinked Hindi mode must explain why birth details are needed",
      );

      // Verify unlinked mode does not output prefilled suggested question chips
      assert.ok(
        htmlContent.includes("suggestedQuestions: []") ||
          htmlContent.includes("suggestedQuestions = []"),
        "Unlinked mode must not output prefilled question chips",
      );
    },
  );

  await t.test(
    "5. Persona differentiation and high-stakes safety boundaries intact",
    () => {
      // Verify 3 distinct personas
      assert.ok(
        htmlContent.includes("Dr. Sunita Shastri") &&
          htmlContent.includes("Pandit Raghavendra") &&
          htmlContent.includes("Acharya Devratan"),
        "Must maintain all 3 distinguished Vedic personas",
      );

      // Verify high-stakes safety boundaries exist
      assert.ok(
        htmlContent.includes("Tele-MANAS") ||
          htmlContent.includes("988") ||
          htmlContent.includes("Ethical Boundary & Safety Advisory") ||
          htmlContent.includes("licensed medical care"),
        "Must enforce ethical safety boundaries for crisis/medical queries",
      );
    },
  );

  await t.test(
    "6. Astrotalk-grade human conversational intelligence, name extraction & chip container hidden",
    () => {
      // Verify permanent hiding of chip container
      assert.ok(
        htmlContent.includes(
          'id="ai-chat-chips-container" style="display: none !important;"',
        ),
        "#ai-chat-chips-container must be permanently hidden with display: none !important;",
      );

      // Verify name extraction from messages like 'Aryan Tiwari 20 august 2005'
      assert.ok(
        htmlContent.includes("nameDateMatch") &&
          htmlContent.includes("seekerProfile") &&
          htmlContent.includes("honorific"),
        "sendAiUserChatMessage must extract seeker name and build seekerProfile",
      );

      // Verify human spoken dialogue replaces stiff textbook headers
      assert.ok(
        htmlContent.includes(
          "let us look deeply into your professional path",
        ) || htmlContent.includes("vital and promising threshold"),
        "Career response must speak conversationally like a senior Astrotalk mentor",
      );
    },
  );
});
