fetch("http://localhost:8000/api/ai-astrologer/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    category: "general",
    question: "test",
    dob: "1990-01-01",
    lat: 28.6139,
    lon: 77.209,
    timezone: "Asia/Kolkata",
    astrologer_name: "test",
    session_history: [],
    lang: "en",
    sessionId: "test",
  }),
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
