import test from "node:test";
import assert from "node:assert/strict";
import http from "http";
import app from "../src/server";

test("AstroVerse AI Astrologer Acceptance Suite (Directive Acceptance Tests A-D and 10-Turn Scenario)", async (t) => {
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
    // =========================================================================
    // SECTION 3 ACCEPTANCE CRITERIA TESTS A, B, C, D
    // =========================================================================

    // -------------------------------------------------------------------------
    // TEST A: Initial Greeting ("Hello")
    // -------------------------------------------------------------------------
    await t.test("Test A — Initial Greeting ('Hello') with zero prior chart", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Hello",
          session_history: [],
          lang: "en",
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.profile_loaded, false);
      assert.deepEqual(data.chartEvidence, []);
      assert.equal(data.intent, "greeting");

      // Verifies exact required Test A greeting
      const expectedA =
        "Namaste! Welcome to AstroVerse. I'm your AI Vedic astrology guide. You can ask me about relationships, marriage, career, business, family, Kundli or any question you'd like to explore. What is on your mind today?";
      assert.equal(data.message.trim(), expectedA);

      // Verifies no Acharya impersonation or invented chart claims
      assert.doesNotMatch(data.message, /Acharya/i);
      assert.doesNotMatch(data.message, /Devratan/i);
      assert.doesNotMatch(data.message, /Lagna/i);
      assert.doesNotMatch(data.message, /Moon/i);
      assert.doesNotMatch(data.message, /Dasha/i);
    });

    // -------------------------------------------------------------------------
    // TEST B: Customer provides only a name ("My name is Menex.")
    // -------------------------------------------------------------------------
    await t.test("Test B — Customer provides only name ('My name is Menex.')", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "My name is Menex.",
          session_history: [
            {
              role: "assistant",
              content:
                "Namaste! Welcome to AstroVerse. I'm your AI Vedic astrology guide. You can ask me about relationships, marriage, career, business, family, Kundli or any question you'd like to explore. What is on your mind today?",
            },
          ],
          lang: "en",
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.profile_loaded, false);
      assert.deepEqual(data.chartEvidence, []);
      assert.equal(data.intent, "name_introduction");

      // Verifies exact required Test B response
      const expectedB = "Nice to meet you, Menex! What would you like to explore today?";
      assert.equal(data.message.trim(), expectedB);

      // Verifies zero chart claims or ungrounded facts
      assert.doesNotMatch(data.message, /Scorpio/i);
      assert.doesNotMatch(data.message, /Aquarius/i);
      assert.doesNotMatch(data.message, /Lagna/i);
      assert.doesNotMatch(data.message, /Dasha/i);
      assert.doesNotMatch(data.message, /years of age/i);
    });

    // -------------------------------------------------------------------------
    // TEST C: Customer asks how system knows information ("How did you get this information?")
    // -------------------------------------------------------------------------
    await t.test("Test C — Customer asks how system knows info ('How did you get this information?')", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "How did you get this information?",
          session_history: [
            { role: "user", content: "Hello" },
            {
              role: "assistant",
              content: "Namaste! Welcome to AstroVerse...",
            },
          ],
          lang: "en",
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.profile_loaded, false);
      assert.equal(data.intent, "source_inquiry");

      // Verifies exact required Test C correction
      const expectedC =
        "I need to correct that. You haven't provided your birth details, so I had no basis to state your Ascendant, Moon sign or Dasha. Those earlier statements were unsupported and should be disregarded. I can provide a personal astrological reading after calculating your birth chart from details you choose to share, or by using a verified saved profile.";
      assert.equal(data.message.trim(), expectedC);
    });

    // -------------------------------------------------------------------------
    // TEST D: Greeting after a saved chart exists
    // -------------------------------------------------------------------------
    await t.test("Test D — Greeting after saved chart exists ('Hello')", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Hello",
          dob: "2005-08-20T14:05:00",
          lat: 23.1815,
          lon: 79.9864,
          seeker_name: "Menex",
          session_history: [
            {
              role: "user",
              content: "I was born on 20 August 2005 at 2:05 PM in Jabalpur.",
            },
            {
              role: "assistant",
              content: "Connected to your chart: Scorpio Lagna, Aquarius Moon.",
            },
          ],
          lang: "en",
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.profile_loaded, true);
      assert.equal(data.intent, "greeting");

      // Verifies exact required Test D greeting acknowledging Menex
      const expectedD =
        "Namaste, Menex. Would you like to continue exploring your saved birth chart, or is there something else on your mind?";
      assert.equal(data.message.trim(), expectedD);
    });

    // =========================================================================
    // SECTION 19: 10-TURN FULL ACCEPTANCE EVALUATION SCENARIO
    // =========================================================================

    const conversationHistory: Array<{ role: string; content: string }> = [];

    // Turn 1: "Hello."
    await t.test("10-Turn Scenario — Turn 1: 'Hello.'", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Hello.",
          session_history: conversationHistory,
          lang: "en",
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.profile_loaded, false);
      assert.match(data.message, /I'm your AI Vedic astrology guide/i);
      assert.doesNotMatch(data.message, /Scorpio Lagna/i);
      conversationHistory.push({ role: "user", content: "Hello." });
      conversationHistory.push({ role: "assistant", content: data.message });
    });

    // Turn 2: "My name is Menex."
    await t.test("10-Turn Scenario — Turn 2: 'My name is Menex.'", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "My name is Menex.",
          session_history: conversationHistory,
          lang: "en",
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.intent, "name_introduction");
      assert.equal(
        data.message.trim(),
        "Nice to meet you, Menex! What would you like to explore today?",
      );
      conversationHistory.push({ role: "user", content: "My name is Menex." });
      conversationHistory.push({ role: "assistant", content: data.message });
    });

    // Turn 3: "How did you get this information?"
    await t.test("10-Turn Scenario — Turn 3: 'How did you get this information?'", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "How did you get this information?",
          session_history: conversationHistory,
          lang: "en",
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.intent, "source_inquiry");
      assert.match(data.message, /I need to correct that/i);
      assert.match(data.message, /unsupported and should be disregarded/i);
      conversationHistory.push({
        role: "user",
        content: "How did you get this information?",
      });
      conversationHistory.push({ role: "assistant", content: data.message });
    });

    // Turn 4: "I was born on 20 August 2005 at 2:05 PM in Jabalpur."
    await t.test(
      "10-Turn Scenario — Turn 4: 'I was born on 20 August 2005 at 2:05 PM in Jabalpur.'",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "I was born on 20 August 2005 at 2:05 PM in Jabalpur.",
            session_history: conversationHistory,
            lang: "en",
          }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();

        assert.equal(data.profile_loaded, true);
        assert.match(data.message, /Scorpio Lagna/i);
        assert.match(data.message, /Aquarius/i);
        assert.match(data.message, /Jupiter.*Venus/i);
        assert.match(data.message, /21 years of age/i);
        assert.match(data.message, /Menex/i);

        conversationHistory.push({
          role: "user",
          content: "I was born on 20 August 2005 at 2:05 PM in Jabalpur.",
        });
        conversationHistory.push({ role: "assistant", content: data.message });
      },
    );

    // Turn 5: "Tell me about my career."
    await t.test("10-Turn Scenario — Turn 5: 'Tell me about my career.'", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Tell me about my career.",
          session_history: conversationHistory,
          lang: "en",
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.intent, "career");
      assert.match(data.message, /Scorpio Lagna/i);
      assert.match(
        data.message,
        /10th House of career is governed by Sun \(Leo\)/i,
      );
      assert.match(data.message, /Sun in royal Leo and Mars in Aries/i);
      assert.match(data.message, /2025.*2027/i);

      conversationHistory.push({
        role: "user",
        content: "Tell me about my career.",
      });
      conversationHistory.push({ role: "assistant", content: data.message });
    });

    // Turn 6: "When will I get married?"
    await t.test("10-Turn Scenario — Turn 6: 'When will I get married?'", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "When will I get married?",
          session_history: conversationHistory,
          lang: "en",
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.intent, "marriage");
      assert.match(data.message, /Scorpio Lagna/i);
      assert.match(data.message, /7th House.*Taurus.*Venus/i);
      assert.match(data.message, /D9 Navamsha/i);
      assert.match(data.message, /Aries Swakshetra BPHS Cancellation/i);

      conversationHistory.push({
        role: "user",
        content: "When will I get married?",
      });
      conversationHistory.push({ role: "assistant", content: data.message });
    });

    // Turn 7: "My brother was born on 19 December 2001 in New Delhi."
    await t.test(
      "10-Turn Scenario — Turn 7: 'My brother was born on 19 December 2001 in New Delhi.'",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "My brother was born on 19 December 2001 in New Delhi.",
            session_history: conversationHistory,
            lang: "en",
          }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();

        assert.equal(data.intent, "relative_natal_connection");
        assert.match(data.message, /brother/i);
        assert.match(data.message, /Aquarius Lagna/i);
        assert.match(data.message, /Capricorn/i);
        assert.match(data.message, /Sagittarius/i);
        assert.match(data.message, /Mars.*Aquarius/i);
        assert.match(data.message, /Jupiter.*Jupiter/i);
        assert.match(data.message, /25 years of age/i);

        conversationHistory.push({
          role: "user",
          content: "My brother was born on 19 December 2001 in New Delhi.",
        });
        conversationHistory.push({ role: "assistant", content: data.message });
      },
    );

    // Turn 8: "What about his career?"
    await t.test("10-Turn Scenario — Turn 8: 'What about his career?'", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "What about his career?",
          session_history: conversationHistory,
          lang: "en",
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.intent, "career");
      assert.match(data.message, /brother \(Aquarius Lagna\)/i);
      assert.match(
        data.message,
        /10th House of career is governed by Mars \(Scorpio\)/i,
      );
      assert.match(data.message, /Sun in Sagittarius/i);
      assert.match(data.message, /Mars in Aquarius/i);

      conversationHistory.push({
        role: "user",
        content: "What about his career?",
      });
      conversationHistory.push({ role: "assistant", content: data.message });
    });

    // Turn 9: "Return to my chart."
    await t.test("10-Turn Scenario — Turn 9: 'Return to my chart.'", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Return to my chart.",
          session_history: conversationHistory,
          lang: "en",
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.intent, "switch_to_primary_chart");
      assert.match(data.message, /Scorpio Lagna/i);
      assert.match(data.message, /Aquarius/i);
      assert.match(data.message, /Jupiter-Venus Dasha/i);

      conversationHistory.push({
        role: "user",
        content: "Return to my chart.",
      });
      conversationHistory.push({ role: "assistant", content: data.message });
    });

    // Turn 10: "I have been feeling very low."
    await t.test("10-Turn Scenario — Turn 10: 'I have been feeling very low.'", async () => {
      const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "I have been feeling very low.",
          session_history: conversationHistory,
          lang: "en",
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.intent, "emotional_wellbeing");
      assert.match(data.message, /I hear the heaviness in your words/i);
      assert.match(data.message, /Manas Karaka/i);
      assert.match(data.message, /Sukha Bhava/i);
      assert.match(data.message, /Chandra Beej Mantra/i);
      assert.match(data.message, /Om Som Somaya Namah/i);
      assert.match(data.message, /Tele-MANAS/i);
      assert.match(data.message, /14416/i);

      assert.ok(data.remedyCard);
      assert.match(data.remedyCard.mantra, /Om Som Somaya Namah/i);
    });
  } finally {
    await closeServer();
  }
});
