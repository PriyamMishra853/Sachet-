import { HELPLINE, formatVerdictCard, type Channel, type Lang, type Text2 } from "@sachet/core";
import type { Store } from "@sachet/db";
import type { Cache } from "../cache.js";
import { hashUser } from "../hash.js";
import type { Checker } from "../services/checker.js";

// Chat logic shared by the Telegram and WhatsApp bots. It knows nothing
// about either app: it takes text or a button press and returns replies.

export type Button = { id: string; title: string };
export type BotReply = { text: string; buttons?: Button[] };
export type Incoming = {
  channel: Extract<Channel, "telegram" | "whatsapp">;
  /** Telegram chat ID or WhatsApp phone number. Hashed before storage. */
  userId: string;
  /** Unique per incoming message, so a retried delivery is reported once. */
  messageKey: string;
};

// What we keep in the cache (never in the database) and for how long.
const LANG_TTL = 180 * 24 * 3600;
const LAST_TEXT_TTL = 3600; // so "Report" can report the message just checked
export const FOLLOWUP_TTL = 48 * 3600; // raw chat ID kept only until the follow-up is sent
// Each check can call Google Safe Browsing and writes a row, so one chat
// can't flood the bot. Far above what a person forwarding messages sends.
export const BOT_CHECKS_PER_MINUTE = 20;

const T = {
  welcome: {
    en: "Namaste! I'm Sachet. Forward me any suspicious message, phone number, UPI ID or link, and I'll tell you if it looks like a scam.\n\nForwarding an SMS? Put the sender on the first line, like:\nFrom: VM-HDFCBK-S\n\nCommands: /report to report a scam, /lang to switch language, /privacy to see what we store, /delete to delete your data.",
    hi: "नमस्ते! मैं Sachet हूं। कोई भी शक वाला मैसेज, फोन नंबर, UPI ID या लिंक मुझे भेजें, मैं बताऊंगा कि यह धोखाधड़ी जैसा लगता है या नहीं।\n\nSMS फॉरवर्ड कर रहे हैं? पहली लाइन में भेजने वाला लिखें, जैसे:\nभेजने वाला: VM-HDFCBK-S\n\nकमांड: /report शिकायत के लिए, /lang भाषा बदलने के लिए, /privacy यह जानने के लिए कि हम क्या सेव करते हैं, /delete अपना डेटा मिटाने के लिए।",
  },
  chooseLang: { en: "Choose your language:", hi: "अपनी भाषा चुनें:" },
  langSet: { en: "Language set to English.", hi: "भाषा हिंदी कर दी गई है।" },
  reportButton: { en: "🚩 Report scam", hi: "🚩 शिकायत करें" },
  reportNothing: {
    en: "Send /report followed by the scam message, or tap 🚩 Report under a result.",
    hi: "/report के बाद धोखाधड़ी वाला मैसेज भेजें, या किसी नतीजे के नीचे 🚩 शिकायत करें दबाएं।",
  },
  reported: {
    en: "Thank you. Your report is saved and will warn the next person who checks this.",
    hi: "धन्यवाद। आपकी शिकायत सेव हो गई है और यह अगली बार जांच करने वाले को सावधान करेगी।",
  },
  reportedAgain: {
    en: "You already reported this. Thank you!",
    hi: "आप इसकी शिकायत पहले ही कर चुके हैं। धन्यवाद!",
  },
  deleted: {
    en: "Done. Your reports and check history are deleted.",
    hi: "हो गया। आपकी शिकायतें और जांच का इतिहास मिटा दिया गया है।",
  },
  followup: {
    en: "Yesterday you checked a message that looked risky. Did you pay any money?",
    hi: "कल आपने एक जोखिम भरा मैसेज जांचा था। क्या आपने कोई पैसे भेजे?",
  },
  paidYes: { en: "Yes, I paid", hi: "हां, भेजे" },
  paidNo: { en: "No", hi: "नहीं" },
  afterYes: {
    en: "Please act now: call 1930 or report at cybercrime.gov.in, and call your bank to block the payment. The sooner you report, the better the chance to freeze the money.",
    hi: "कृपया अभी कदम उठाएं: 1930 पर कॉल करें या cybercrime.gov.in पर शिकायत करें, और पेमेंट रोकने के लिए अपने बैंक को कॉल करें। जितनी जल्दी शिकायत करेंगे, पैसे रोकने की संभावना उतनी ज्यादा होगी।",
  },
  afterNo: {
    en: "Well done! You stopped a scam. Share Sachet with your family so they can check too.",
    hi: "बहुत बढ़िया! आपने एक धोखाधड़ी रोक दी। Sachet को अपने परिवार के साथ शेयर करें ताकि वे भी जांच सकें।",
  },
  slowDown: {
    en: "You're sending messages very fast. Please wait a minute and try again.",
    hi: "आप बहुत तेज़ी से मैसेज भेज रहे हैं। कृपया एक मिनट रुककर फिर कोशिश करें।",
  },
  // Short form of the website's privacy notice (DPDP Act). Keep the three in sync.
  privacy: {
    en: [
      "Privacy, in short:",
      "• We save the phone numbers, UPI IDs and websites people check or report, so we can warn others.",
      "• Reported messages are saved after removing names, OTPs, emails, Aadhaar, PAN, card and account numbers we can find.",
      '• We never save your phone number or chat ID, only a scrambled code (a salted hash) so your reports count once. If a check looks risky, your chat ID is kept for up to 48 hours to ask "Did you pay?", then deleted.',
      "• Links you check may be sent to Google Safe Browsing to see if Google knows they are dangerous.",
      "• Website names may be looked up in public domain registration records (RDAP) to see how new the website is.",
      "• If the AI check is on, message text (with personal details removed) may be sent to Anthropic's Claude AI for a second opinion.",
      "• We never sell data and never call anyone a criminal: we only say what was reported.",
      "",
      "Send /delete to delete your reports and check history.",
    ].join("\n"),
    hi: [
      "गोपनीयता, संक्षेप में:",
      "• लोग जिन फोन नंबर, UPI ID और वेबसाइट की जांच या शिकायत करते हैं, उन्हें हम सेव करते हैं, ताकि दूसरों को सावधान कर सकें।",
      "• शिकायत वाले मैसेज में मिलने वाले नाम, OTP, ईमेल, आधार, पैन, कार्ड और खाता नंबर हटाकर ही उन्हें सेव किया जाता है।",
      '• हम आपका फोन नंबर या चैट ID कभी सेव नहीं करते, सिर्फ एक बदला हुआ कोड (salted hash) रखते हैं ताकि आपकी शिकायत एक ही बार गिनी जाए। अगर जांच जोखिम भरी लगे, तो "क्या आपने पैसे भेजे?" पूछने के लिए आपकी चैट ID अधिकतम 48 घंटे रखी जाती है, फिर मिटा दी जाती है।',
      "• आपके जांचे गए लिंक Google Safe Browsing को भेजे जा सकते हैं, यह देखने के लिए कि Google उन्हें खतरनाक मानता है या नहीं।",
      "• वेबसाइट के नाम सार्वजनिक डोमेन रजिस्ट्रेशन रिकॉर्ड (RDAP) में देखे जा सकते हैं, यह जानने के लिए कि वेबसाइट कितनी नई है।",
      "• अगर AI जांच चालू है, तो मैसेज का टेक्स्ट (निजी जानकारी हटाकर) दूसरी राय के लिए Anthropic के Claude AI को भेजा जा सकता है।",
      "• हम डेटा कभी नहीं बेचते और किसी को अपराधी नहीं कहते: हम सिर्फ बताते हैं कि क्या शिकायत हुई।",
      "",
      "अपनी शिकायतें और जांच का इतिहास मिटाने के लिए /delete भेजें।",
    ].join("\n"),
  },
  rateLimited: {
    en: "You've sent many reports this hour. Please try again later.",
    hi: "आपने इस घंटे बहुत सारी शिकायतें भेजी हैं। कृपया बाद में कोशिश करें।",
  },
} satisfies Record<string, Text2>;

const LANG_BUTTONS: Button[] = [
  { id: "lang:en", title: "English" },
  { id: "lang:hi", title: "हिंदी" },
];

export function createConversation(deps: {
  checker: Checker;
  cache: Cache;
  store: Store;
  salt: string;
}) {
  const { checker, cache, store, salt } = deps;
  const userHash = (m: Incoming) => hashUser(salt, m.channel, m.userId);

  async function getLang(hash: string): Promise<Lang> {
    return ((await cache.get(`lang:${hash}`)) as Lang | null) ?? "en";
  }

  async function report(m: Incoming, text: string, lang: Lang): Promise<BotReply[]> {
    const r = await checker.report(
      { text, idempotencyKey: m.messageKey },
      { channel: m.channel, userHash: userHash(m) },
    );
    if (!r.ok) {
      if (r.error === "rate_limited") return [{ text: T.rateLimited[lang] }];
      return [{ text: T.reportNothing[lang] }];
    }
    return [{ text: (r.duplicate ? T.reportedAgain : T.reported)[lang] }];
  }

  return {
    async handleText(m: Incoming, rawText: string): Promise<BotReply[]> {
      const hash = userHash(m);
      const lang = await getLang(hash);
      const text = rawText.trim();
      const [first = "", ...rest] = text.split(/\s+/);
      const command = first.toLowerCase().replace(/@\w+$/, ""); // "/report@SachetBot" -> "/report"

      if (
        ["/start", "/help", "start", "hi", "hello", "help", "namaste"].includes(command) &&
        rest.length === 0
      ) {
        return [
          { text: `${T.welcome.en}\n\n${T.welcome.hi}` },
          { text: T.chooseLang[lang], buttons: LANG_BUTTONS },
        ];
      }
      if (["/lang", "language", "lang"].includes(command)) {
        return [{ text: T.chooseLang[lang], buttons: LANG_BUTTONS }];
      }
      if (["hindi", "हिंदी", "english"].includes(text.toLowerCase())) {
        const chosen: Lang = text.toLowerCase() === "english" ? "en" : "hi";
        await cache.set(`lang:${hash}`, chosen, LANG_TTL);
        return [{ text: T.langSet[chosen] }];
      }
      if (["/privacy", "privacy", "गोपनीयता"].includes(command) && rest.length === 0) {
        return [{ text: T.privacy[lang] }];
      }
      if (command === "/delete") {
        await store.deleteUserData(hash);
        await cache.del(`lang:${hash}`, `last:${hash}`);
        return [{ text: T.deleted[lang] }];
      }
      if (command === "/report" || command === "report") {
        const toReport = rest.join(" ") || (await cache.get(`last:${hash}`));
        if (!toReport) return [{ text: T.reportNothing[lang] }];
        return report(m, toReport, lang);
      }

      // An SMS forwarded to a chat loses its sender, so people can add it on
      // the first line: "From: VM-HDFCBK-S" (or "भेजने वाला: 98765 43210").
      const fromLine = /^(?:from|sender|भेजने वाला)\s*[:-]\s*(.{1,40})\n([\s\S]+)$/i.exec(text);
      const sender = fromLine?.[1]?.trim() ?? null;
      const body = fromLine?.[2]?.trim() || text;

      // Anything else is something to check. Over the limit, say so once and
      // then stay quiet, so a flood doesn't get a flood of replies.
      const minute = Math.floor(Date.now() / 60_000);
      const n = await cache.incr(`rl:botcheck:${hash}:${minute}`, 60);
      if (n > BOT_CHECKS_PER_MINUTE) {
        return n === BOT_CHECKS_PER_MINUTE + 1 ? [{ text: T.slowDown[lang] }] : [];
      }
      const { verdict, checkId } = await checker.checkMessage(
        body,
        { channel: m.channel, userHash: hash },
        sender,
      );
      // The whole text, "From:" line included: reporting it then also
      // reports the sender's number.
      await cache.set(`last:${hash}`, text, LAST_TEXT_TTL);
      if (checkId && (verdict.band === "high" || verdict.band === "medium")) {
        await cache.set(
          `fu:${checkId}`,
          JSON.stringify({ channel: m.channel, userId: m.userId, lang }),
          FOLLOWUP_TTL,
        );
      }
      return [
        {
          text: formatVerdictCard(verdict, lang),
          buttons: [{ id: "report", title: T.reportButton[lang] }],
        },
      ];
    },

    async handleButton(m: Incoming, id: string): Promise<BotReply[]> {
      const hash = userHash(m);
      if (id === "lang:en" || id === "lang:hi") {
        const chosen = id.slice(5) as Lang;
        await cache.set(`lang:${hash}`, chosen, LANG_TTL);
        return [{ text: T.langSet[chosen] }];
      }
      const lang = await getLang(hash);
      if (id === "report") {
        const last = await cache.get(`last:${hash}`);
        if (!last) return [{ text: T.reportNothing[lang] }];
        return report(m, last, lang);
      }
      const paid = /^paid:(yes|no):([0-9a-f-]{36})$/.exec(id);
      if (paid) {
        const answer = paid[1] as "yes" | "no";
        await store.setUserPaid(paid[2]!, hash, answer);
        return [
          { text: answer === "yes" ? `${T.afterYes[lang]}\n\n${HELPLINE[lang]}` : T.afterNo[lang] },
        ];
      }
      return [];
    },
  };
}

export type Conversation = ReturnType<typeof createConversation>;

export function followupMessage(checkId: string, lang: Lang): BotReply {
  return {
    text: T.followup[lang],
    buttons: [
      { id: `paid:yes:${checkId}`, title: T.paidYes[lang] },
      { id: `paid:no:${checkId}`, title: T.paidNo[lang] },
    ],
  };
}
