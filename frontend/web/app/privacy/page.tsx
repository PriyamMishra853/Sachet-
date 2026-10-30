"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { useLang } from "../components/LangProvider";

// Plain-language privacy notice (DPDP Act: say what we collect, why, for how
// long, and how to delete it). Keep it in sync with what the code stores.
const SECTIONS = [
  {
    title: { en: "What we store", hi: "हम क्या सेव करते हैं" },
    items: [
      {
        en: "The phone numbers, UPI IDs and website names that people report or check, so we can warn others.",
        hi: "लोग जिन फोन नंबर, UPI ID और वेबसाइट की शिकायत या जांच करते हैं, ताकि दूसरों को सावधान कर सकें।",
      },
      {
        en: "Reported message text, after removing names, OTPs, emails, Aadhaar, PAN, card and account numbers we can detect.",
        hi: "शिकायत वाले मैसेज का टेक्स्ट, उसमें मिलने वाले नाम, OTP, ईमेल, आधार, पैन, कार्ड और खाता नंबर हटाने के बाद।",
      },
      {
        en: "For each check: the result (for example 'high risk'), the scam type, and the amount asked for, so we can count money protected.",
        hi: "हर जांच के लिए: नतीजा (जैसे 'उच्च जोखिम'), धोखाधड़ी का प्रकार, और मांगी गई रकम, ताकि बचाए गए पैसों की गिनती हो सके।",
      },
      {
        en: "If you ask for a review of your own number, UPI ID or website: your reason, and the contact you give until the review is decided.",
        hi: "अगर आप अपने नंबर, UPI ID या वेबसाइट की जांच का अनुरोध करते हैं: आपकी बताई वजह, और फैसला होने तक आपका दिया संपर्क।",
      },
    ],
  },
  {
    title: { en: "What we never store", hi: "हम क्या कभी सेव नहीं करते" },
    items: [
      {
        en: "Your own phone number, Telegram ID or internet address. We keep only a scrambled code made from it, which can't be turned back into the original, so your reports are counted once.",
        hi: "आपका अपना फोन नंबर, Telegram ID या इंटरनेट पता। हम सिर्फ उससे बना एक बदला हुआ कोड रखते हैं, जिससे असली जानकारी वापस नहीं निकाली जा सकती, ताकि आपकी शिकायत एक ही बार गिनी जाए।",
      },
      {
        en: "Exception: if a check looks risky on Telegram or WhatsApp, your chat ID is kept for up to 48 hours only to ask 'Did you pay?' the next day, then deleted.",
        hi: "अपवाद: अगर Telegram या WhatsApp पर जांच जोखिम भरी लगे, तो अगले दिन 'क्या आपने पैसे भेजे?' पूछने के लिए आपकी चैट ID अधिकतम 48 घंटे रखी जाती है, फिर मिटा दी जाती है।",
      },
    ],
  },
  {
    title: { en: "How we use it", hi: "हम इसका उपयोग कैसे करते हैं" },
    items: [
      {
        en: "Only to warn people about scams and to improve Sachet. We never sell data and never call anyone a criminal: we only say what was reported.",
        hi: "सिर्फ लोगों को धोखाधड़ी से सावधान करने और Sachet को बेहतर बनाने के लिए। हम डेटा कभी नहीं बेचते और किसी को अपराधी नहीं कहते: हम सिर्फ बताते हैं कि क्या शिकायत हुई।",
      },
      {
        en: "Links you check may be sent to Google Safe Browsing to see if Google knows they are dangerous.",
        hi: "आपके जांचे गए लिंक Google Safe Browsing को भेजे जा सकते हैं, यह देखने के लिए कि Google उन्हें खतरनाक मानता है या नहीं।",
      },
      {
        en: "Website names you check may be looked up in public records of when websites were registered, to see how new the website is.",
        hi: "आपके जांचे गए वेबसाइट नाम उन सार्वजनिक रिकॉर्ड में देखे जा सकते हैं जिनमें वेबसाइट के रजिस्टर होने की तारीख होती है, यह जानने के लिए कि वेबसाइट कितनी नई है।",
      },
      {
        en: "If the AI check is switched on: message text you check, after removing the personal details we can find, may be sent to Anthropic's Claude AI for a second opinion. Sachet keeps only its yes/no answer, for up to 7 days.",
        hi: "अगर AI जांच चालू है: आपके जांचे गए मैसेज का टेक्स्ट, उसमें मिलने वाली निजी जानकारी हटाने के बाद, दूसरी राय के लिए Anthropic के Claude AI को भेजा जा सकता है। Sachet सिर्फ उसका हां/ना जवाब, अधिकतम 7 दिन रखता है।",
      },
    ],
  },
  {
    title: { en: "Delete your data", hi: "अपना डेटा मिटाएं" },
    items: [
      {
        en: "On Telegram or WhatsApp, send /delete to the Sachet bot. On this website, use the button below. Your reports and check history are removed right away.",
        hi: "Telegram या WhatsApp पर Sachet बॉट को /delete भेजें। इस वेबसाइट पर नीचे दिया बटन दबाएं। आपकी शिकायतें और जांच का इतिहास तुरंत मिटा दिया जाएगा।",
      },
    ],
  },
];

export default function PrivacyPage() {
  const { lang } = useLang();
  const [deleted, setDeleted] = useState<string | null>(null);

  async function deleteMyData() {
    try {
      const r = await api.deleteMyData();
      setDeleted(
        lang === "en"
          ? `Deleted ${r.reports} report(s) and ${r.checks} check(s) from this browser.`
          : `इस ब्राउज़र की ${r.reports} शिकायत और ${r.checks} जांच मिटा दी गईं।`,
      );
    } catch {
      setDeleted(
        lang === "en"
          ? "Could not delete right now. Please try again."
          : "अभी मिटा नहीं पाए। दोबारा कोशिश करें।",
      );
    }
  }

  return (
    <div className="page">
      <h1>{lang === "en" ? "Your privacy" : "आपकी गोपनीयता"}</h1>
      <p className="lead">
        {lang === "en"
          ? "What Sachet keeps, what it never keeps, and how to delete your data."
          : "Sachet क्या रखता है, क्या कभी नहीं रखता, और अपना डेटा कैसे मिटाएं।"}
      </p>
      {SECTIONS.map((s) => (
        <section key={s.title.en} className="card prose">
          <h2>{s.title[lang]}</h2>
          <ul>
            {s.items.map((i) => (
              <li key={i.en}>{i[lang]}</li>
            ))}
          </ul>
        </section>
      ))}
      <button className="button button-plain" onClick={deleteMyData}>
        {lang === "en" ? "Delete my data from this browser" : "इस ब्राउज़र से मेरा डेटा मिटाएं"}
      </button>
      {deleted && <p className="ok">{deleted}</p>}
    </div>
  );
}
