"use client";

import { useLang } from "../components/LangProvider";

const TEXT = {
  title: { en: "About Sachet", hi: "Sachet के बारे में" },
  lead: {
    en: '"Sachet" (सचेत) means alert. It helps you check a message, phone number, UPI ID or link before you pay.',
    hi: '"सचेत" का मतलब है सावधान। यह पैसे भेजने से पहले किसी मैसेज, फोन नंबर, UPI ID या लिंक की जांच करने में मदद करता है।',
  },
  sections: [
    {
      title: { en: "Why it exists", hi: "यह क्यों बना" },
      body: {
        en: "People in India lost more than ₹22,800 crore to cyber fraud in 2024 (Lok Sabha reply, July 2025). Most help arrives after the money is gone. Sachet tries to warn you before you pay.",
        hi: "2024 में भारत में लोगों ने साइबर धोखाधड़ी में ₹22,800 करोड़ से ज़्यादा गंवाए (लोकसभा जवाब, जुलाई 2025)। ज़्यादातर मदद पैसे जाने के बाद मिलती है। Sachet पेमेंट से पहले आपको सावधान करने की कोशिश करता है।",
      },
    },
    {
      title: { en: "How it decides", hi: "यह कैसे तय करता है" },
      body: {
        en: "It looks for reports from other people, checks lists of known fraud websites, sees how new a website is, and reads the message for the warning signs of the 10 most common scams in India.",
        hi: "यह दूसरे लोगों की शिकायतें देखता है, जानी-मानी धोखाधड़ी वाली वेबसाइटों की सूचियां जांचता है, देखता है कि वेबसाइट कितनी नई है, और मैसेज में भारत की 10 सबसे आम धोखाधड़ी के चेतावनी संकेत पढ़ता है।",
      },
    },
    {
      title: { en: "What it will never say", hi: "यह क्या कभी नहीं कहेगा" },
      body: {
        en: 'Sachet never tells you something is "safe". When it knows nothing, it says "No reports yet" and shows any warning signs it found. Always check with the bank or company directly, using its official app or number.',
        hi: 'Sachet कभी नहीं कहता कि कुछ "सुरक्षित" है। जब उसे कुछ पता नहीं होता, तो वह "अभी तक कोई रिपोर्ट नहीं" कहता है और मिले हुए चेतावनी संकेत दिखाता है। हमेशा बैंक या कंपनी से, उसके आधिकारिक ऐप या नंबर से, सीधे जांचें।',
      },
    },
    {
      title: { en: "Who made it", hi: "इसे किसने बनाया" },
      body: {
        en: "Team UnfilteredEngineers, B.Tech CSE students at UIET, CSJM University Kanpur. Sachet is a student project, not a government service. For help with fraud, always call 1930.",
        hi: "Team UnfilteredEngineers, UIET, CSJM विश्वविद्यालय कानपुर के B.Tech CSE छात्र। Sachet एक छात्र प्रोजेक्ट है, सरकारी सेवा नहीं। धोखाधड़ी में मदद के लिए हमेशा 1930 पर कॉल करें।",
      },
    },
  ],
};

export default function AboutPage() {
  const { lang } = useLang();
  return (
    <div className="page">
      <h1>{TEXT.title[lang]}</h1>
      <p className="lead">{TEXT.lead[lang]}</p>
      {TEXT.sections.map((s) => (
        <section key={s.title.en} className="card prose">
          <h2>{s.title[lang]}</h2>
          <p>{s.body[lang]}</p>
        </section>
      ))}
    </div>
  );
}
