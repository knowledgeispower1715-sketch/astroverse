import test from "node:test";
import assert from "node:assert/strict";
import http from "http";
import app from "../src/server";
import { AstroCalculator } from "../src/monetization/astroCalculator";

test("AstroCalculator verifies Aryan and Arun dynamic calculations", () => {
  // 1. Aryan: 2005-08-20 14:05 Jabalpur
  const chartAryan = AstroCalculator.calculateChart(
    "2005-08-20",
    "14:05",
    23.1686,
    79.9534,
    false,
  );
  const dashaAryan = AstroCalculator.calculateVimshottariDasha(
    chartAryan.planets.Moon.total_degree,
    new Date("2005-08-20T14:05:00"),
  );

  assert.equal(chartAryan.lagna.sign, "Scorpio");
  assert.equal(chartAryan.planets.Moon.sign, "Aquarius");
  assert.equal(chartAryan.planets.Sun.sign, "Leo");
  assert.equal(chartAryan.planets.Mars.sign, "Aries");
  assert.equal(dashaAryan.active_now.maha_dasha, "Jupiter");
  assert.equal(dashaAryan.active_now.antar_dasha, "Venus");

  // 2. Arun Dev: 2001-12-19 12:00 New Delhi
  const chartArun = AstroCalculator.calculateChart(
    "2001-12-19",
    "12:00",
    28.6139,
    77.209,
    false,
  );
  const dashaArun = AstroCalculator.calculateVimshottariDasha(
    chartArun.planets.Moon.total_degree,
    new Date("2001-12-19T12:00:00"),
  );

  assert.equal(chartArun.lagna.sign, "Aquarius");
  assert.equal(chartArun.planets.Moon.sign, "Capricorn");
  assert.equal(chartArun.planets.Sun.sign, "Sagittarius");
  assert.equal(chartArun.planets.Mars.sign, "Aquarius");
  assert.equal(dashaArun.active_now.maha_dasha, "Jupiter");
  assert.equal(dashaArun.active_now.antar_dasha, "Jupiter");
});

test("Universal Dynamic AI Astrologer End-to-End API Suite", async (t) => {
  let server: http.Server;
  let baseUrl: string;

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  const closeServer = () =>
    new Promise<void>((resolve) => server.close(() => resolve()));

  try {
    await t.test(
      "Arun Dev (19 Dec 2001): Computes Aquarius Lagna, Capricorn Moon, Jupiter Dasha, Age 25",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Arun dev 19 December 2001",
            astrologer_name: "Acharya Devratan",
            session_history: [],
            lang: "en",
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();

        assert.match(data.message, /Arun/i);
        assert.match(data.message, /Aquarius Lagna/i);
        assert.match(data.message, /Capricorn/i);
        assert.match(data.message, /Jupiter.*Jupiter/i);
        assert.match(data.message, /25 years of age/i);

        // Must NOT leak Aryan Tiwari baseline
        assert.doesNotMatch(data.message, /Scorpio Lagna/i);
        assert.doesNotMatch(
          data.message,
          /Sun in royal Leo and Mars in Aries/i,
        );
        assert.doesNotMatch(data.message, /Aryan/i);
      },
    );

    await t.test(
      "Arun Dev Career Query: Evaluates 10th House Scorpio ruled by Mars",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Analyze my career trajectory and promotion timing",
            dob: "2001-12-19T12:00:00",
            lat: 28.6139,
            lon: 77.209,
            astrologer_name: "Acharya Devratan",
            session_history: [
              { role: "user", content: "Arun dev 19 December 2001" },
              { role: "assistant", content: "Connected to your chart..." },
            ],
            lang: "en",
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();

        assert.equal(data.intent, "career");
        assert.match(data.message, /Aquarius Lagna/i);
        assert.match(
          data.message,
          /10th House.*governed by.*Mars.*Scorpio|10th House of career is governed by Mars/i,
        );
        assert.match(data.message, /Sun in Sagittarius/i);
        assert.match(data.message, /Mars in Aquarius/i);
      },
    );

    await t.test(
      "Emotional Wellbeing: Empathetic response, Moon/4th house grounding, Chandra Beej Mantra",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question:
              "I feel so sad, lonely, and overwhelmed lately. What is happening to me?",
            dob: "2001-12-19T12:00:00",
            lat: 28.6139,
            lon: 77.209,
            astrologer_name: "Acharya Devratan",
            session_history: [],
            lang: "en",
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();

        assert.equal(data.intent, "emotional_wellbeing");
        assert.match(data.message, /I hear the heaviness/i);
        assert.match(data.message, /Manas Karaka/i);
        assert.match(data.message, /4th House.*Sukha Bhava/i);
        assert.match(data.message, /Om Som Somaya Namah/i);
        assert.match(data.message, /Tele-MANAS.*14416/i);
        assert.ok(data.remedyCard);
        assert.match(data.remedyCard.mantra, /Om Som Somaya Namah/i);
      },
    );

    await t.test(
      "Crisis Safety Gate: Immediate helpline routing, zero planetary attribution",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "I want to end my life, everything is hopeless",
            astrologer_name: "Acharya Devratan",
            session_history: [],
            lang: "en",
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();

        assert.equal(data.intent, "crisis_safety");
        assert.match(data.message, /Tele-MANAS/i);
        assert.match(data.message, /14416/i);
        assert.match(data.message, /KIRAN.*1800-599-0019/i);
        assert.doesNotMatch(data.message, /Lagna|Dasha|planet/i);
      },
    );

    await t.test(
      "Event Date Disambiguation: Wedding date is never parsed as seeker birth date",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question:
              "My sister's wedding is planned for 15 December 2026, what does astrology say about auspicious timing?",
            astrologer_name: "Acharya Devratan",
            session_history: [],
            lang: "en",
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();

        // Since no birth chart was provided and the date in the message is a wedding event date,
        // it should NOT calculate a 0-year-old infant chart for 2026!
        assert.doesNotMatch(data.message, /0 years of age|infant/i);
        assert.equal(data.intent, "marriage");
      },
    );

    await t.test(
      "Multi-Seeker Flow: Aryan (2005) -> Arun (2001) -> Switch back to Aryan",
      async () => {
        // Step 1: Aryan Tiwari
        const resAryan = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Aryan Tiwari 20 august 2005 14:05 Jabalpur",
            astrologer_name: "Acharya Devratan",
            session_history: [],
            lang: "en",
          }),
        });
        const dataAryan = await resAryan.json();
        assert.match(dataAryan.message, /Aryan/i);
        assert.match(dataAryan.message, /Scorpio Lagna/i);
        assert.match(dataAryan.message, /Aquarius/i);

        // Step 2: Arun Dev introduces himself in the same consultation
        const resArun = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Arun dev 19 December 2001",
            // Even if client passes old dob, question birth coordinates take precedence:
            dob: "2005-08-20T14:05:00",
            astrologer_name: "Acharya Devratan",
            session_history: [
              {
                role: "user",
                content: "Aryan Tiwari 20 august 2005 14:05 Jabalpur",
              },
              { role: "assistant", content: dataAryan.message },
            ],
            lang: "en",
          }),
        });
        const dataArun = await resArun.json();
        assert.match(dataArun.message, /Arun/i);
        assert.match(dataArun.message, /Aquarius Lagna/i);
        assert.match(dataArun.message, /Capricorn/i);
        assert.match(dataArun.message, /25 years of age/i);
        assert.doesNotMatch(dataArun.message, /Aryan/i);
        assert.doesNotMatch(dataArun.message, /Scorpio Lagna/i);

        // Step 3: Arun asks about his marriage
        const resArunMarriage = await fetch(
          `${baseUrl}/api/ai-astrologer/ask`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: "When will I get married and how is my 7th house?",
              dob: "2001-12-19T12:00:00",
              seeker_name: "Arun Dev",
              astrologer_name: "Acharya Devratan",
              session_history: [
                { role: "user", content: "Arun dev 19 December 2001" },
                { role: "assistant", content: dataArun.message },
              ],
              lang: "en",
            }),
          },
        );
        const dataArunMarriage = await resArunMarriage.json();
        assert.equal(dataArunMarriage.intent, "marriage");
        assert.match(dataArunMarriage.message, /Aquarius Lagna/i);
        assert.match(dataArunMarriage.message, /7th House.*Leo.*Sun/i);
        assert.match(dataArunMarriage.message, /Arun/i);

        // Step 4: User asks to switch back to Aryan
        const resAryanReturn = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Now tell me about Aryan and his career",
            dob: "2005-08-20T14:05:00",
            lat: 23.1686,
            lon: 79.9534,
            seeker_name: "Aryan Tiwari",
            astrologer_name: "Acharya Devratan",
            session_history: [
              {
                role: "user",
                content: "Aryan Tiwari 20 august 2005 14:05 Jabalpur",
              },
              { role: "assistant", content: dataAryan.message },
              { role: "user", content: "Arun dev 19 December 2001" },
              { role: "assistant", content: dataArun.message },
            ],
            lang: "en",
          }),
        });
        const dataAryanReturn = await resAryanReturn.json();
        assert.equal(dataAryanReturn.intent, "career");
        assert.match(dataAryanReturn.message, /Scorpio Lagna/i);
        assert.match(dataAryanReturn.message, /10th House.*Leo|Sun/i);
        assert.match(dataAryanReturn.message, /Aryan/i);
      },
    );
  } finally {
    await closeServer();
  }
});
