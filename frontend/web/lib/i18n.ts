// Every piece of text on the site, in English and Hindi.
export type Lang = "en" | "hi";

export const t = {
  tagline: { en: "Stop the scam before the payment", hi: "पेमेंट से पहले धोखाधड़ी रोकें" },
  navCheck: { en: "Check", hi: "जांचें" },
  navReport: { en: "Report", hi: "शिकायत" },
  navPrivacy: { en: "Privacy", hi: "गोपनीयता" },
  navAbout: { en: "About", hi: "परिचय" },
  checkTitle: { en: "Is this a scam?", hi: "क्या यह धोखाधड़ी है?" },
  checkIntro: {
    en: "Paste a message, or enter a phone number, UPI ID or link. You'll get an answer in about a second.",
    hi: "मैसेज पेस्ट करें, या फोन नंबर, UPI ID या लिंक डालें। लगभग एक सेकंड में जवाब मिलेगा।",
  },
  tabMessage: { en: "Message", hi: "मैसेज" },
  tabPhone: { en: "Phone", hi: "फोन" },
  tabUpi: { en: "UPI ID", hi: "UPI ID" },
  tabUrl: { en: "Link", hi: "लिंक" },
  phMessage: { en: "Paste the full message here…", hi: "पूरा मैसेज यहां पेस्ट करें…" },
  phPhone: { en: "e.g. +91 98765 43210", hi: "जैसे +91 98765 43210" },
  phUpi: { en: "e.g. name@ybl", hi: "जैसे name@ybl" },
  phUrl: { en: "e.g. bit.ly/abc", hi: "जैसे bit.ly/abc" },
  senderLabel: { en: "Sender (optional)", hi: "भेजने वाला (वैकल्पिक)" },
  senderPlaceholder: {
    en: "SMS name like VM-HDFCBK-S, or the number",
    hi: "SMS का नाम जैसे VM-HDFCBK-S, या नंबर",
  },
  sender: { en: "Sender", hi: "भेजने वाला" },
  checkButton: { en: "Check now", hi: "अभी जांचें" },
  checking: { en: "Checking…", hi: "जांच हो रही है…" },
  why: { en: "Why", hi: "क्यों" },
  whatToDo: { en: "What to do", hi: "क्या करें" },
  found: { en: "Found in the message", hi: "मैसेज में मिला" },
  reportedBy: { en: "Reports", hi: "शिकायतें" },
  reportThis: { en: "🚩 Report this as a scam", hi: "🚩 इसकी शिकायत करें" },
  reportThanks: {
    en: "Thank you. Your report will warn the next person who checks this.",
    hi: "धन्यवाद। आपकी शिकायत अगली बार जांच करने वाले को सावधान करेगी।",
  },
  reportDuplicate: {
    en: "You already reported this. Thank you!",
    hi: "आप इसकी शिकायत पहले ही कर चुके हैं। धन्यवाद!",
  },
  errorGeneric: {
    en: "Something went wrong. Please try again.",
    hi: "कुछ गलत हो गया। कृपया दोबारा कोशिश करें।",
  },
  errorOffline: {
    en: "Can't reach Sachet right now. Check your internet and try again.",
    hi: "अभी Sachet से जुड़ नहीं पा रहे। इंटरनेट जांचें और दोबारा कोशिश करें।",
  },
  paidQuestion: {
    en: "Have you already paid any money?",
    hi: "क्या आपने पहले ही कोई पैसे भेज दिए हैं?",
  },
  paidYes: { en: "Yes, I paid", hi: "हां, भेजे" },
  paidNo: { en: "No", hi: "नहीं" },
  afterYes: {
    en: "Act now: call 1930 or report at cybercrime.gov.in, and call your bank to block the payment. The sooner you report, the better the chance to freeze the money.",
    hi: "अभी कदम उठाएं: 1930 पर कॉल करें या cybercrime.gov.in पर शिकायत करें, और पेमेंट रोकने के लिए अपने बैंक को कॉल करें। जितनी जल्दी शिकायत करेंगे, पैसे रोकने की संभावना उतनी ज्यादा होगी।",
  },
  call1930: { en: "📞 Call 1930", hi: "📞 1930 पर कॉल करें" },
  afterNo: {
    en: "Well done! You stopped a scam. Share Sachet with your family so they can check too.",
    hi: "बहुत बढ़िया! आपने एक धोखाधड़ी रोक दी। Sachet को अपने परिवार के साथ शेयर करें ताकि वे भी जांच सकें।",
  },
  statsChecks: { en: "checks", hi: "जांचें" },
  statsReports: { en: "scam reports", hi: "धोखाधड़ी की शिकायतें" },
  statsProtected: { en: "kept from scammers", hi: "धोखेबाज़ों से बचाए गए" },
  reportTitle: { en: "Report a scam", hi: "धोखाधड़ी की शिकायत करें" },
  reportIntro: {
    en: "Your report warns the next person. Add the scammer's number, UPI ID or link, and the message if you have it.",
    hi: "आपकी शिकायत अगले व्यक्ति को सावधान करती है। धोखेबाज़ का नंबर, UPI ID या लिंक, और मैसेज हो तो वह भी डालें।",
  },
  reportWhat: { en: "Number, UPI ID or link", hi: "नंबर, UPI ID या लिंक" },
  reportType: { en: "Type of scam (optional)", hi: "धोखाधड़ी का प्रकार (वैकल्पिक)" },
  reportText: { en: "The message (optional)", hi: "मैसेज (वैकल्पिक)" },
  reportAmount: { en: "Money asked for, in ₹ (optional)", hi: "मांगी गई रकम, ₹ में (वैकल्पिक)" },
  reportSubmit: { en: "Send report", hi: "शिकायत भेजें" },
  reportPrivacy: {
    en: "Don't include your own name, OTP or bank details. We remove personal details we can find before saving.",
    hi: "अपना नाम, OTP या बैंक विवरण न डालें। सेव करने से पहले हम मिलने वाली निजी जानकारी हटा देते हैं।",
  },
  lostMoney: {
    en: "Lost money? Call 1930 now or report at cybercrime.gov.in",
    hi: "पैसे गए? अभी 1930 पर कॉल करें या cybercrime.gov.in पर शिकायत करें",
  },
  unknown: { en: "Not sure", hi: "पता नहीं" },
  appealLink: {
    en: "Is this your own number, UPI ID or website? Ask for a review",
    hi: "क्या यह आपका अपना नंबर, UPI ID या वेबसाइट है? जांच का अनुरोध करें",
  },
  appealTitle: { en: "Ask for a review", hi: "जांच का अनुरोध करें" },
  appealIntro: {
    en: "Is your own number, UPI ID or website marked as a scam by mistake? Tell us why. A person reads the reports and decides. Until then, Sachet shows that a review is open.",
    hi: "क्या आपका अपना नंबर, UPI ID या वेबसाइट गलती से धोखाधड़ी बताया गया है? हमें वजह बताएं। एक व्यक्ति शिकायतें पढ़कर फैसला करेगा। तब तक Sachet दिखाएगा कि जांच चल रही है।",
  },
  appealWhat: { en: "Your number, UPI ID or website", hi: "आपका नंबर, UPI ID या वेबसाइट" },
  appealReason: { en: "Why are the reports wrong?", hi: "शिकायतें गलत क्यों हैं?" },
  appealReasonHint: {
    en: "For example: what your business is, and what may have led to the reports.",
    hi: "जैसे: आपका काम क्या है, और शिकायतें किस वजह से हुई होंगी।",
  },
  appealContact: {
    en: "Email or phone to reach you (optional)",
    hi: "आपसे संपर्क के लिए ईमेल या फोन (वैकल्पिक)",
  },
  appealContactNote: {
    en: "Only used to ask you about this review, and deleted once it is decided.",
    hi: "सिर्फ इस जांच के बारे में पूछने के लिए, और फैसला होते ही मिटा दिया जाता है।",
  },
  appealSubmit: { en: "Ask for a review", hi: "जांच का अनुरोध भेजें" },
  appealDone: {
    en: "Thank you. Your request is in. A person will review it, and checks now show that a review is open.",
    hi: "धन्यवाद। आपका अनुरोध मिल गया है। एक व्यक्ति इसकी जांच करेगा, और अब जांच में दिखेगा कि समीक्षा चल रही है।",
  },
  appealNotListed: {
    en: "Sachet has no reports about this, so there is nothing to review.",
    hi: "Sachet पर इसकी कोई शिकायत नहीं है, इसलिए जांच के लिए कुछ नहीं है।",
  },
  appealAlreadyOpen: {
    en: "A review for this is already open. We'll decide it soon.",
    hi: "इसकी जांच पहले से चल रही है। हम जल्द फैसला करेंगे।",
  },
  installWhy: {
    en: "Install Sachet on your phone. Then in WhatsApp or SMS, long-press a message → Share → Sachet to check it.",
    hi: "Sachet को फोन में इंस्टॉल करें। फिर WhatsApp या SMS में मैसेज को दबाकर रखें → शेयर → Sachet, और जांच हो जाएगी।",
  },
  installButton: { en: "📲 Install app", hi: "📲 ऐप इंस्टॉल करें" },
  installIos: {
    en: "On iPhone: tap the Share button in Safari, then 'Add to Home Screen' to keep Sachet one tap away.",
    hi: "iPhone पर: Safari में शेयर बटन दबाएं, फिर 'Add to Home Screen' चुनें, ताकि Sachet एक टैप दूर रहे।",
  },
} as const;

export const SCAM_TYPE_NAMES: Record<string, { en: string; hi: string }> = {
  investment: { en: "Investment / trading tips", hi: "निवेश / ट्रेडिंग टिप्स" },
  digital_arrest: { en: "Digital arrest", hi: "डिजिटल अरेस्ट" },
  parcel: { en: "Courier / customs parcel", hi: "कूरियर / कस्टम पार्सल" },
  kyc: { en: "KYC / account blocked", hi: "KYC / खाता बंद" },
  electricity: { en: "Electricity bill", hi: "बिजली बिल" },
  task_job: { en: "Task / part-time job", hi: "टास्क / पार्ट-टाइम जॉब" },
  upi_refund: { en: "Fake refund / UPI collect", hi: "फर्जी रिफंड / UPI कलेक्ट" },
  lottery: { en: "Lottery / prize / KBC", hi: "लॉटरी / इनाम / KBC" },
  loan_app: { en: "Instant loan app", hi: "इंस्टेंट लोन ऐप" },
  fake_support: { en: "Fake customer care / OTP", hi: "फर्जी कस्टमर केयर / OTP" },
};
