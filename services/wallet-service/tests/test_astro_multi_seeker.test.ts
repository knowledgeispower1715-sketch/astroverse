import test from "node:test";
import assert from "node:assert/strict";
import http from "http";
import app from "../src/server";
import { AstroCalculator } from "../src/monetization/astroCalculator";

test("Universal Dynamic Multi-Seeker & Astrological Accuracy Test Suite", async (t) => {
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
    // ---------------------------------------------------------
    // TEST 1: Arun Dev - Initial Natal Connection & Greeting
    // ---------------------------------------------------------
    await t.test(
      "1. Arun Dev (19 Dec 2001 12:00 New Delhi): Computes Aquarius Lagna, Capricorn Moon, Age 25",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Arun dev 19 December 2001 12:00 New Delhi",
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

        // Verify ZERO Aryan Tiwari leakage
        assert.doesNotMatch(data.message, /Aryan/i);
        assert.doesNotMatch(data.message, /Scorpio Lagna/i);
        assert.doesNotMatch(
          data.message,
          /Sun in royal Leo and Mars in Aries/i,
        );
      },
    );

    // ---------------------------------------------------------
    // TEST 2: Arun Dev - Career & 10th House Geometry
    // ---------------------------------------------------------
    await t.test(
      "2. Arun Dev Career: Computes 10th House Scorpio ruled by Mars with Sun in Sagittarius",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Analyze my career trajectory and promotion timing",
            dob: "2001-12-19T12:00:00",
            lat: 28.6139,
            lon: 77.209,
            seeker_name: "Arun Dev",
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
          /10th House.*governed by Mars.*Scorpio|10th House of career is governed by Mars/i,
        );
        assert.match(data.message, /Sun in Sagittarius/i);
        assert.match(data.message, /Mars in Aquarius/i);
        assert.doesNotMatch(data.message, /10th House is ruled by the Sun/i);
      },
    );

    // ---------------------------------------------------------
    // TEST 3: Arun Dev - Marriage & 7th House Geometry
    // ---------------------------------------------------------
    await t.test(
      "3. Arun Dev Marriage: Computes 7th House Leo ruled by Sun and addresses Arun ji",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question:
              "When will I get married and what is the nature of my partner?",
            dob: "2001-12-19T12:00:00",
            lat: 28.6139,
            lon: 77.209,
            seeker_name: "Arun Dev",
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

        assert.equal(data.intent, "marriage");
        assert.match(data.message, /Arun/i);
        assert.match(data.message, /Aquarius Lagna/i);
        assert.match(data.message, /7th House.*is Leo, governed by Sun/i);
        assert.match(data.message, /Moon in \*\*Capricorn\*\*/i);
        assert.ok(data.remedyCard);
        assert.match(data.remedyCard.title, /Sun Harmony.*Aquarius Lagna/i);
      },
    );

    // ---------------------------------------------------------
    // TEST 4: Arun Dev - Remedies for Aquarius Lagna
    // ---------------------------------------------------------
    await t.test(
      "4. Arun Dev Remedies: Recommends Saturn Lagna lord remedies without Scorpio Emerald disclaimer",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question:
              "What gemstones and remedies are prescribed for my chart?",
            dob: "2001-12-19T12:00:00",
            lat: 28.6139,
            lon: 77.209,
            seeker_name: "Arun Dev",
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

        assert.equal(data.intent, "remedy");
        assert.match(data.message, /Aquarius Lagna/i);
        assert.match(data.message, /Maha Mrityunjaya Mantra/i);
        assert.ok(data.remedyCard);
        assert.match(data.remedyCard.title, /Aquarius Lagna/i);
      },
    );

    // ---------------------------------------------------------
    // TEST 5: Emotional Wellbeing & Empathy First
    // ---------------------------------------------------------
    await t.test(
      "5. Emotional Wellbeing: Empathetic validation, Moon/4th house Sukha Bhava, Tele-MANAS 14416",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question:
              "I feel so sad, lonely, and crying all the time. Please help me.",
            dob: "2001-12-19T12:00:00",
            lat: 28.6139,
            lon: 77.209,
            seeker_name: "Arun Dev",
            astrologer_name: "Acharya Devratan",
            session_history: [],
            lang: "en",
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();

        assert.equal(data.intent, "emotional_wellbeing");
        assert.match(data.message, /I hear the heaviness in your words/i);
        assert.match(data.message, /Manas Karaka/i);
        assert.match(data.message, /Sukha Bhava/i);
        assert.match(data.message, /Om Som Somaya Namah/i);
        assert.match(data.message, /Tele-MANAS.*14416/i);
        assert.ok(data.remedyCard);
        assert.match(data.remedyCard.mantra, /Om Som Somaya Namah/i);
        assert.match(
          data.remedyCard.disclaimer,
          /not a substitute for clinical care/i,
        );
      },
    );

    // ---------------------------------------------------------
    // TEST 6: Crisis Safety Gate
    // ---------------------------------------------------------
    await t.test(
      "6. Crisis Safety Gate: Emergency helpline routing, zero astrological attribution",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "I want to kill myself, I cannot take this anymore",
            astrologer_name: "Acharya Devratan",
            session_history: [],
            lang: "en",
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();

        assert.equal(data.intent, "crisis_safety");
        assert.match(data.message, /life is deeply precious/i);
        assert.match(data.message, /Tele-MANAS/i);
        assert.match(data.message, /14416/i);
        assert.match(data.message, /KIRAN.*1800-599-0019/i);
        assert.doesNotMatch(data.message, /Lagna|Dasha|planet|Kundli/i);
      },
    );

    // ---------------------------------------------------------
    // TEST 7: Multi-Seeker Switch: Aryan -> Arun -> Switch back to Aryan
    // ---------------------------------------------------------
    await t.test(
      "7. Multi-Seeker Dynamic Switch: Preserves independent charts without overwrite",
      async () => {
        // 1. Aryan enters chat
        const res1 = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Aryan Tiwari 20 august 2005 14:05 Jabalpur",
            astrologer_name: "Acharya Devratan",
            session_history: [],
            lang: "en",
          }),
        });
        const data1 = await res1.json();
        assert.match(data1.message, /Aryan/i);
        assert.match(data1.message, /Scorpio Lagna/i);

        // 2. Arun enters chat (in same session)
        const res2 = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Arun dev 19 December 2001 12:00 New Delhi",
            dob: "2005-08-20T14:05:00", // client stale DOB overridden by question
            astrologer_name: "Acharya Devratan",
            session_history: [
              {
                role: "user",
                content: "Aryan Tiwari 20 august 2005 14:05 Jabalpur",
              },
              { role: "assistant", content: data1.message },
            ],
            lang: "en",
          }),
        });
        const data2 = await res2.json();
        assert.match(data2.message, /Arun/i);
        assert.match(data2.message, /Aquarius Lagna/i);
        assert.doesNotMatch(data2.message, /Aryan/i);

        // 3. User switches back to Aryan
        const res3 = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
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
              { role: "assistant", content: data1.message },
              { role: "user", content: "Arun dev 19 December 2001" },
              { role: "assistant", content: data2.message },
            ],
            lang: "en",
          }),
        });
        const data3 = await res3.json();
        assert.equal(data3.intent, "career");
        assert.match(data3.message, /Aryan/i);
        assert.match(data3.message, /Scorpio Lagna/i);
        assert.match(data3.message, /10th House.*Leo|Sun/i);
      },
    );
  } finally {
    await closeServer();
  }
});
