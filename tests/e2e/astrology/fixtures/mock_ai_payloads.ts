/**
 * Golden AI Astrologer Chat Payloads
 * Responses grounded in natal chart ephemeris data.
 */

export const MOCK_AI_RESPONSES = {
  career_english: {
    text: "Namaste. In your birth chart with Capricorn Lagna and Sun exalted in Aries in the 4th house, coupled with your active Jupiter Mahadasha and Saturn Antardasha, career development is heavily anchored in structured leadership, organizational discipline, and strategic initiatives. Mars in Pisces occupying the 3rd house grants persistent effort and technical aptitude. Focus on mid-to-long-term milestones rather than speculative gambles.",
    grounded: true,
    persona: "acharya-devratan",
    tokens_used: 128,
  },
  career_hindi: {
    text: "नमस्ते। आपकी मकर लग्न की जन्म कुंडली में सूर्य चतुर्थ भाव में उच्च राशि में स्थित है। वर्तमान में गुरु महादशा और शनि अंतर्दशा प्रभावी है, जो दीर्घकालिक अनुशासन, संगठनात्मक नेतृत्व और स्थिरता को दर्शाती है। धैर्यपूर्वक अपने कर्मक्षेत्र में आगे बढ़ें, सकारात्मक परिणाम सुनिश्चित होंगे।",
    grounded: true,
    persona: "acharya-devratan",
    tokens_used: 142,
  },
  remedies_response: {
    text: "Regarding Saturn's transit and natal dignity: Saturn is Swakshetra in Capricorn in your 1st house. To harmonize planetary vibrations: (1) Chant the Dasharatha Shani Stotram on Saturdays after sunset; (2) Donate black sesame seeds and iron vessels to the needy; (3) Wear a clean Blue Sapphire (Neelam) only after personal trial; (4) Maintain disciplined morning routines.",
    grounded: true,
    persona: "acharya-devratan",
    tokens_used: 115,
  },
  unlinked_chart_response: {
    text: "Pranam! I notice that your Janam Kundli is not currently linked to our session. To provide precise astrological guidance tailored to your exact Lagna, Moon sign, and planetary periods, please calculate or link your birth chart using the button above.",
    grounded: false,
    persona: "acharya-devratan",
    tokens_used: 56,
  },
  general_greeting: {
    text: "Welcome to AstroVerse consultation. I am Acharya Devratan, seasoned in Parashari Vedic principles. How may I guide your life path today?",
    grounded: false,
    persona: "acharya-devratan",
    tokens_used: 40,
  },
};
