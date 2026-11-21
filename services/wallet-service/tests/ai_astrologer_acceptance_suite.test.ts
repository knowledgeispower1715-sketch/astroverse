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
    await t.test(
      "Test A — Initial Greeting ('Hello') with zero prior chart",
      async () => {
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
      },
    );

    // -------------------------------------------------------------------------
    // TEST B: Customer provides only a name ("My name is Menex.")
    // -------------------------------------------------------------------------
    await t.test(
      "Test B — Customer provides only name ('My name is Menex.')",
      async () => {
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
        const expectedB =
          "Nice to meet you, Menex! What would you like to explore today?";
        assert.equal(data.message.trim(), expectedB);

        // Verifies zero chart claims or ungrounded facts
        assert.doesNotMatch(data.message, /Scorpio/i);
        assert.doesNotMatch(data.message, /Aquarius/i);
        assert.doesNotMatch(data.message, /Lagna/i);
        assert.doesNotMatch(data.message, /Dasha/i);
        assert.doesNotMatch(data.message, /years of age/i);
      },
    );

    // -------------------------------------------------------------------------
    // TEST C: Customer asks how system knows information ("How did you get this information?")
    // -------------------------------------------------------------------------
    await t.test(
      "Test C — Customer asks how system knows info ('How did you get this information?')",
      async () => {
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
      },
    );

    // -------------------------------------------------------------------------
    // TEST D: Greeting after a saved chart exists
    // -------------------------------------------------------------------------
    await t.test(
      "Test D — Greeting after saved chart exists ('Hello')",
      async () => {
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
                content:
                  "Connected to your chart: Scorpio Lagna, Aquarius Moon.",
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
      },
    );

    // -------------------------------------------------------------------------
    // TEST B.1: Customer introduces self with informal contraction ("im menex")
    // -------------------------------------------------------------------------
    await t.test(
      "Test B.1 — Informal contraction name ('im menex') without apostrophe",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "im menex",
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
        assert.equal(
          data.message.trim(),
          "Nice to meet you, Menex! What would you like to explore today?",
        );

        // Zero fabricated astrological coordinates
        assert.doesNotMatch(data.message, /Scorpio/i);
        assert.doesNotMatch(data.message, /Aquarius/i);
        assert.doesNotMatch(data.message, /Lagna/i);
        assert.doesNotMatch(data.message, /Dasha/i);
        assert.doesNotMatch(data.message, /years of age/i);
        assert.doesNotMatch(data.message, /Sun in royal Leo/i);
        assert.doesNotMatch(data.message, /Mars in Aries/i);
      },
    );

    // -------------------------------------------------------------------------
    // TEST A.1: Consecutive greeting ("hi" in turn 2 with prior assistant turn)
    // -------------------------------------------------------------------------
    await t.test(
      "Test A.1 — Consecutive greeting ('hi') during active chat without chart",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "hi",
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
        assert.equal(data.intent, "greeting");
        assert.match(data.message, /Pranam! I am right here with you/i);
        assert.doesNotMatch(data.message, /Scorpio/i);
        assert.doesNotMatch(data.message, /Lagna/i);
      },
    );

    // -------------------------------------------------------------------------
    // TEST E: General question with zero birth chart
    // -------------------------------------------------------------------------
    await t.test(
      "Test E — General inquiry without birth coordinates",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "tell me something interesting about astrology",
            session_history: [
              {
                role: "assistant",
                content:
                  "Namaste! Welcome to AstroVerse. I'm your AI Vedic astrology guide.",
              },
            ],
            lang: "en",
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();

        assert.equal(data.profile_loaded, false);
        assert.ok(
          data.intent === "general" || data.intent === "general_guidance",
        );
        assert.match(data.message, /Date of Birth/i);
        assert.doesNotMatch(data.message, /Scorpio Lagna/i);
        assert.doesNotMatch(data.message, /Sun in royal Leo/i);
      },
    );

    // -------------------------------------------------------------------------
    // TEST F: Customer provides date of birth only ("10 August 2001") - Menex Screenshot 2
    // -------------------------------------------------------------------------
    await t.test(
      "Test F — Customer provides date only ('10 August 2001') without time or city",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "10 August 2001",
            session_history: [
              {
                role: "assistant",
                content:
                  "Namaste! Welcome to AstroVerse. I'm your AI Vedic astrology guide...",
              },
              { role: "user", content: "My name is Menex." },
              {
                role: "assistant",
                content:
                  "Nice to meet you, Menex! What would you like to explore today?",
              },
            ],
            seeker_name: "Menex",
            lang: "en",
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();

        assert.equal(data.profile_loaded, false);
        assert.deepEqual(data.chartEvidence, []);
        assert.equal(data.intent, "partial_birth_data");

        // Verifies exact required prompt for time and city
        assert.equal(
          data.message.trim(),
          "Thanks, Menex. I have your birth date. To calculate your Ascendant and houses accurately, I'll also need your birth time and birthplace. Do you know them?",
        );

        // Verifies zero chart claims or ungrounded calculations
        assert.doesNotMatch(data.message, /Libra/i);
        assert.doesNotMatch(data.message, /Aries/i);
        assert.doesNotMatch(data.message, /Ashwini/i);
        assert.doesNotMatch(data.message, /Lagna/i);
        assert.doesNotMatch(data.message, /Moon/i);
        assert.doesNotMatch(data.message, /Dasha/i);
        assert.doesNotMatch(data.message, /updated your chart/i);
      },
    );

    // -------------------------------------------------------------------------
    // TEST G: Customer asks "Everything" with zero birth chart - Menex Screenshot 4
    // -------------------------------------------------------------------------
    await t.test(
      "Test G — Customer asks 'Everything' with zero birth chart",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Everything",
            session_history: [
              {
                role: "assistant",
                content: "Namaste! Welcome to AstroVerse...",
              },
              { role: "user", content: "My name is Menex." },
              { role: "assistant", content: "Nice to meet you, Menex!" },
            ],
            seeker_name: "Menex",
            lang: "en",
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();

        assert.equal(data.profile_loaded, false);
        assert.deepEqual(data.chartEvidence, []);
        assert.equal(data.intent, "everything_overview");

        // Verifies 5 pillars presented without repeating initial greetings
        assert.match(data.message, /Career & Vocation/i);
        assert.match(data.message, /Relationships & Marriage/i);
        assert.match(data.message, /Wealth & Financial Stability/i);
        assert.match(data.message, /Planetary Periods & Timing/i);
        assert.match(data.message, /Remedial Guidance/i);
        assert.match(data.message, /complete birth details/i);

        // Verifies no repetition of canned welcome greeting
        assert.doesNotMatch(data.message, /^Namaste! Welcome to AstroVerse/i);
        assert.doesNotMatch(data.message, /^Pranam! I am/i);
      },
    );

    // -------------------------------------------------------------------------
    // TEST G.1: Customer asks "Everything" with a verified saved chart
    // -------------------------------------------------------------------------
    await t.test(
      "Test G.1 — Customer asks 'Everything' with a verified saved chart",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Everything",
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
                content:
                  "Connected to your chart: Scorpio Lagna, Aquarius Moon.",
              },
            ],
            lang: "en",
          }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();

        assert.equal(data.profile_loaded, true);
        assert.equal(data.intent, "everything_overview");

        // Verifies 3-pillar synthesis without repeating greetings
        assert.match(data.message, /Constitutional Mindset/i);
        assert.match(data.message, /Career & Wealth Potential/i);
        assert.match(data.message, /Active Karmic Season/i);
        assert.doesNotMatch(data.message, /^Namaste! Welcome to AstroVerse/i);
        assert.doesNotMatch(data.message, /^Pranam! I am/i);
      },
    );

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
    await t.test(
      "10-Turn Scenario — Turn 3: 'How did you get this information?'",
      async () => {
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
      },
    );

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
    await t.test(
      "10-Turn Scenario — Turn 5: 'Tell me about my career.'",
      async () => {
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
      },
    );

    // Turn 6: "When will I get married?"
    await t.test(
      "10-Turn Scenario — Turn 6: 'When will I get married?'",
      async () => {
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
      },
    );

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
    await t.test(
      "10-Turn Scenario — Turn 8: 'What about his career?'",
      async () => {
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
      },
    );

    // Turn 9: "Return to my chart."
    await t.test(
      "10-Turn Scenario — Turn 9: 'Return to my chart.'",
      async () => {
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
      },
    );

    // Turn 10: "I have been feeling very low."
    await t.test(
      "10-Turn Scenario — Turn 10: 'I have been feeling very low.'",
      async () => {
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
      },
    );

    // Domain Tests: Education & Competitive Exams
    await t.test(
      "Domain Test — Education: 'Will I clear my entrance exam?'",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Will I clear my competitive entrance exam?",
            session_history: conversationHistory,
            lang: "en",
          }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.intent, "education");
        assert.match(data.message, /Vidya & Buddhi Bhavas/i);
        assert.match(data.message, /5th House/i);
        assert.match(data.message, /Saraswati Mantra/i);
        assert.ok(data.remedyCard);
        assert.match(data.remedyCard.mantra, /Saraswati Mantra/i);
      },
    );

    // Domain Tests: Health & Vitality
    await t.test(
      "Domain Test — Health: 'How is my health and physical vitality?'",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "How is my health and physical vitality?",
            session_history: conversationHistory,
            lang: "en",
          }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.intent, "health");
        assert.match(data.message, /Constitutional Geometry/i);
        assert.match(data.message, /1st, 6th & 8th Houses/i);
        assert.match(data.message, /Medical Disclaimer/i);
        assert.ok(data.remedyCard);
        assert.match(data.remedyCard.mantra, /Maha Mrityunjaya/i);
      },
    );

    // Domain Tests: Property & Land
    await t.test(
      "Domain Test — Property: 'Can I buy a house or real estate property soon?'",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Can I buy a house or real estate property soon?",
            session_history: conversationHistory,
            lang: "en",
          }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.intent, "property");
        assert.match(data.message, /4th House \(Sukhasthana\)/i);
        assert.match(data.message, /Bhumi Karaka Mars/i);
        assert.ok(data.remedyCard);
        assert.match(data.remedyCard.mantra, /Hanuman/i);
      },
    );

    // Domain Tests: Foreign Travel & Relocation
    await t.test(
      "Domain Test — Foreign Travel: 'Will I settle abroad or travel overseas?'",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Will I settle abroad or travel overseas on a visa?",
            session_history: conversationHistory,
            lang: "en",
          }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.intent, "foreign_travel");
        assert.match(data.message, /9th & 12th House Geometries/i);
        assert.match(data.message, /Rahu/i);
      },
    );

    // Domain Tests: Spiritual & Meditation
    await t.test(
      "Domain Test — Spiritual: 'How can I deepen my spiritual meditation?'",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question:
              "How can I deepen my spiritual meditation and discover my Ishta Devata?",
            session_history: conversationHistory,
            lang: "en",
          }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.intent, "spiritual");
        assert.match(data.message, /Dharma & Moksha Houses/i);
        assert.match(data.message, /Ketu/i);
        assert.ok(data.remedyCard);
        assert.match(data.remedyCard.mantra, /Om Namah Shivaya/i);
      },
    );

    // Domain Tests: Kundli Matching & Ashta Koota
    await t.test(
      "Domain Test — Kundli Matching: 'Explain Ashta Koota 36 Guna matching'",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Explain Ashta Koota 36 Guna matching and compatibility",
            session_history: conversationHistory,
            lang: "en",
          }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.intent, "kundli_matching");
        assert.match(data.message, /Ashta Koota/i);
        assert.match(data.message, /Graha Maitri/i);
        assert.match(data.message, /Nadi Dosha/i);
      },
    );

    // Domain Tests: Litigation & Dispute Resolution
    await t.test(
      "Domain Test — Litigation: 'How to resolve court cases and disputes with enemies?'",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question:
              "How to resolve court cases, lawsuits and disputes with enemies?",
            session_history: conversationHistory,
            lang: "en",
          }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.intent, "litigation");
        assert.match(data.message, /6th House \(Shatrusthana\)/i);
        assert.match(data.message, /Mediation/i);
        assert.ok(data.remedyCard);
        assert.match(data.remedyCard.mantra, /Bajrang Baan/i);
      },
    );

    // Domain Tests: Children & Progeny
    await t.test(
      "Domain Test — Children: 'What does my chart indicate for children and santan bhava?'",
      async () => {
        const res = await fetch(`${baseUrl}/api/ai-astrologer/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question:
              "What does my chart indicate for children, pregnancy and santan bhava?",
            session_history: conversationHistory,
            lang: "en",
          }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.intent, "children");
        assert.match(data.message, /5th House & Putrakaraka/i);
        assert.match(data.message, /Jupiter/i);
        assert.ok(data.remedyCard);
        assert.match(data.remedyCard.mantra, /Santana Gopala/i);
      },
    );
  } finally {
    await closeServer();
  }
});
