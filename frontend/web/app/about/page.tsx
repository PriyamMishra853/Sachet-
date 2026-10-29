"use client";

import { useLang } from "../components/LangProvider";

const TEXT = {
  title: { en: "About Sachet", hi: "Sachet के बारे में" },
  paras: [
    {
      en: '"Sachet" means alert in Hindi. Indians lost ₹19,813 crore to cyber fraud in 2025, and every existing tool acts after the money is gone. Sachet answers before you pay.',
      hi: '"सचेत" का मतलब है सावधान। 2025 में भारतीयों ने साइबर धोखाधड़ी में ₹19,813 करोड़ गंवाए, और ज़्यादातर उपाय पैसे जाने के बाद काम आते हैं। Sachet पेमेंट से पहले जवाब देता है।',
    },
    {
      en: "Check a phone number, UPI ID, link or a whole message. Sachet looks it up in reports from other people and public phishing lists, and reads the message for signs of the 10 most common Indian scams.",
      hi: "फोन नंबर, UPI ID, लिंक या पूरा मैसेज जांचें। Sachet दूसरे लोगों की शिकायतों और सार्वजनिक फ़िशिंग सूचियों में देखता है, और मैसेज में भारत की 10 सबसे आम धोखाधड़ी के संकेत पढ़ता है।",
    },
    {
      en: 'When Sachet knows nothing about something, it never says "safe". It says "No reports yet" and shows any warning signs it found.',
      hi: 'जब Sachet को किसी चीज़ के बारे में कुछ पता नहीं होता, तो वह कभी "सुरक्षित" नहीं कहता। वह "अभी तक कोई रिपोर्ट नहीं" कहता है और मिले हुए चेतावनी संकेत दिखाता है।',
    },
    {
      en: "Built by Team UnfilteredEngineers, B.Tech CSE, UIET, CSJM University Kanpur. Sachet is a student project and not a government service. For help with fraud, always call 1930.",
      hi: "Team UnfilteredEngineers (B.Tech CSE, UIET, CSJM विश्वविद्यालय कानपुर) द्वारा बनाया गया। Sachet एक छात्र प्रोजेक्ट है, सरकारी सेवा नहीं। धोखाधड़ी में मदद के लिए हमेशा 1930 पर कॉल करें।",
    },
  ],
};

export default function AboutPage() {
  const { lang } = useLang();
  return (
    <>
      <h1>{TEXT.title[lang]}</h1>
      <section className="card prose">
        {TEXT.paras.map((p) => (
          <p key={p.en}>{p[lang]}</p>
        ))}
      </section>
    </>
  );
}
