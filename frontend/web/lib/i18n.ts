// Every piece of text on the site, in English and Hindi.
export type Lang = "en" | "hi";

export const t = {
  tagline: { en: "Stop the scam before the payment", hi: "पेमेंट से पहले धोखाधड़ी रोकें" },
  navCheck: { en: "Check", hi: "जांचें" },
  navReport: { en: "Report a scam", hi: "शिकायत करें" },
  navPrivacy: { en: "Privacy", hi: "गोपनीयता" },
  navAbout: { en: "About", hi: "परिचय" },
  brandTagline: { en: "Free scam check", hi: "मुफ़्त धोखाधड़ी जांच" },
  heroEyebrow: {
    en: "Free · No sign-up · Hindi and English",
    hi: "मुफ़्त · बिना साइन-अप · हिंदी और अंग्रेज़ी",
  },
  heroTitle: {
    en: "Got a suspicious message? Check it before you pay.",
    hi: "शक वाला मैसेज आया है? पैसे भेजने से पहले जांच लें।",
  },
  heroLead: {
    en: "Paste the message, or the phone number, UPI ID or link in it. In a few seconds Sachet tells you if it looks like a fraud, and what to do next.",
    hi: "मैसेज पेस्ट करें, या उसमें दिया फोन नंबर, UPI ID या लिंक डालें। कुछ ही सेकंड में Sachet बताएगा कि यह धोखाधड़ी लगती है या नहीं, और आगे क्या करें।",
  },
  trustNever: {
    en: "Sachet never calls you or asks for your OTP, PIN or bank details.",
    hi: "Sachet न कभी कॉल करता है, न आपका OTP, PIN या बैंक विवरण मांगता है।",
  },
  trustNotKept: {
    en: "The message you check is not saved. Only reports are kept, with personal details removed.",
    hi: "आपका जांचा गया मैसेज सेव नहीं होता। सिर्फ शिकायतें रखी जाती हैं, निजी जानकारी हटाकर।",
  },
  trustPeople: {
    en: "Warnings come from reports by people like you and from public lists of fraud websites.",
    hi: "चेतावनियां आप जैसे लोगों की शिकायतों और धोखाधड़ी वाली वेबसाइटों की सार्वजनिक सूचियों से आती हैं।",
  },
  formQuestion: { en: "What do you want to check?", hi: "आप क्या जांचना चाहते हैं?" },
  fieldMessage: { en: "Paste the full message", hi: "पूरा मैसेज पेस्ट करें" },
  fieldPhone: { en: "Phone number", hi: "फोन नंबर" },
  fieldUpi: { en: "UPI ID", hi: "UPI ID" },
  fieldUrl: { en: "Link or website", hi: "लिंक या वेबसाइट" },
  senderToggle: { en: "Add who sent it (optional)", hi: "भेजने वाला जोड़ें (वैकल्पिक)" },
  senderHelp: {
    en: "The name or number at the top of the SMS. It helps spot fake bank and government messages.",
    hi: "SMS में सबसे ऊपर दिखने वाला नाम या नंबर। इससे नकली बैंक और सरकारी मैसेज पहचानने में मदद मिलती है।",
  },
  howTitle: { en: "How it works", hi: "यह कैसे काम करता है" },
  how1Title: { en: "Paste what you received", hi: "जो मिला है, वह पेस्ट करें" },
  how1: {
    en: "A message from SMS or WhatsApp, a phone number, a UPI ID or a link.",
    hi: "SMS या WhatsApp का मैसेज, फोन नंबर, UPI ID या लिंक।",
  },
  how2Title: { en: "Sachet checks it", hi: "Sachet इसकी जांच करता है" },
  how2: {
    en: "Against reports from other people, lists of known fraud websites, and the warning signs of common scams.",
    hi: "दूसरे लोगों की शिकायतों, जानी-मानी धोखाधड़ी वाली वेबसाइटों की सूचियों, और आम धोखाधड़ी के चेतावनी संकेतों से मिलाकर।",
  },
  how3Title: { en: "You know what to do", hi: "आपको पता चलता है कि क्या करें" },
  how3: {
    en: "A clear answer with the next steps. If you have already paid, call 1930 right away.",
    hi: "आगे के कदमों के साथ साफ़ जवाब। अगर पैसे भेज चुके हैं, तो तुरंत 1930 पर कॉल करें।",
  },
  scamsTitle: { en: "Common scams in India", hi: "भारत में आम धोखाधड़ी" },
  scamsLead: {
    en: "Most frauds follow a few scripts. If a message sounds like one of these, stop and check it first.",
    hi: "ज़्यादातर धोखाधड़ी कुछ तय तरीकों से होती है। अगर कोई मैसेज इनमें से किसी जैसा लगे, तो रुकें और पहले जांचें।",
  },
  helpTitle: { en: "Already paid a scammer?", hi: "धोखेबाज़ को पैसे भेज चुके हैं?" },
  helpBody: {
    en: "Call 1930, the national cyber fraud helpline, right away. The sooner you call, the better the chance to stop the money. You can also report at cybercrime.gov.in.",
    hi: "तुरंत 1930 पर कॉल करें, यह राष्ट्रीय साइबर धोखाधड़ी हेल्पलाइन है। जितनी जल्दी कॉल करेंगे, पैसे रोकने की संभावना उतनी ज़्यादा होगी। आप cybercrime.gov.in पर भी शिकायत कर सकते हैं।",
  },
  footerAbout: {
    en: "Sachet is a free tool that checks messages, phone numbers, UPI IDs and links for scams. It is a student project, not a government service.",
    hi: "Sachet एक मुफ़्त टूल है जो मैसेज, फोन नंबर, UPI ID और लिंक में धोखाधड़ी की जांच करता है। यह एक छात्र प्रोजेक्ट है, सरकारी सेवा नहीं।",
  },
  bandSubHigh: {
    en: "This looks like a scam. Do not pay or share any code.",
    hi: "यह धोखाधड़ी लगती है। पैसे न भेजें और कोई कोड न बताएं।",
  },
  bandSubMedium: {
    en: "This may be a scam. Check carefully before you do anything.",
    hi: "यह धोखाधड़ी हो सकती है। कुछ भी करने से पहले ध्यान से जांचें।",
  },
  bandSubLow: { en: "Little risk found.", hi: "कम जोखिम मिला।" },
  bandSubUnknown: {
    en: "Nobody has reported this yet. That does not mean it is safe.",
    hi: "अभी तक किसी ने इसकी शिकायत नहीं की है। इसका मतलब यह नहीं कि यह सुरक्षित है।",
  },
  scamTypeLabel: { en: "Type of scam", hi: "धोखाधड़ी का प्रकार" },
  checkTitle: { en: "Is this a scam?", hi: "क्या यह धोखाधड़ी है?" },
  checkIntro: {
    en: "Paste a message, or enter a phone number, UPI ID or link. You'll get an answer in about a second.",
    hi: "मैसेज पेस्ट करें, या फोन नंबर, UPI ID या लिंक डालें। लगभग एक सेकंड में जवाब मिलेगा।",
  },
  tabMessage: { en: "Message", hi: "मैसेज" },
  tabPhone: { en: "Phone number", hi: "फोन नंबर" },
  tabUpi: { en: "UPI ID", hi: "UPI ID" },
  tabUrl: { en: "Link", hi: "लिंक" },
  phMessage: {
    en: "For example: Your electricity will be cut tonight. Call 98765 43210 to update your bill.",
    hi: "जैसे: आज रात आपकी बिजली काट दी जाएगी। बिल अपडेट करने के लिए 98765 43210 पर कॉल करें।",
  },
  phPhone: { en: "e.g. +91 98765 43210", hi: "जैसे +91 98765 43210" },
  phUpi: { en: "e.g. name@ybl", hi: "जैसे name@ybl" },
  phUrl: { en: "e.g. bit.ly/abc or sbi-kyc.xyz", hi: "जैसे bit.ly/abc या sbi-kyc.xyz" },
  senderLabel: { en: "Who sent it?", hi: "किसने भेजा?" },
  senderPlaceholder: {
    en: "e.g. VM-HDFCBK-S or 98765 43210",
    hi: "जैसे VM-HDFCBK-S या 98765 43210",
  },
  sender: { en: "Sender", hi: "भेजने वाला" },
  checkButton: { en: "Check now", hi: "अभी जांचें" },
  checking: { en: "Checking…", hi: "जांच हो रही है…" },
  why: { en: "Why we say this", hi: "हम ऐसा क्यों कह रहे हैं" },
  whatToDo: { en: "What to do now", hi: "अब क्या करें" },
  found: { en: "Found in the message", hi: "मैसेज में मिला" },
  reportedBy: { en: "People who reported it", hi: "शिकायत करने वाले लोग" },
  reportThis: { en: "Report this as a scam", hi: "इसकी शिकायत करें" },
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
  call1930: { en: "Call 1930", hi: "1930 पर कॉल करें" },
  afterNo: {
    en: "Well done! You stopped a scam. Share Sachet with your family so they can check too.",
    hi: "बहुत बढ़िया! आपने एक धोखाधड़ी रोक दी। Sachet को अपने परिवार के साथ शेयर करें ताकि वे भी जांच सकें।",
  },
  statsChecks: { en: "checks", hi: "जांचें" },
  statsReports: { en: "scam reports", hi: "धोखाधड़ी की शिकायतें" },
  statsProtected: { en: "kept from scammers", hi: "धोखेबाज़ों से बचाए गए" },
  statsTitle: { en: "So far", hi: "अब तक" },
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
  reportOnline: { en: "Report at cybercrime.gov.in", hi: "cybercrime.gov.in पर शिकायत करें" },
  unknown: { en: "Not sure", hi: "पता नहीं" },
  appealLink: {
    en: "Is this your own number, UPI ID or website? Ask us to review it",
    hi: "क्या यह आपका अपना नंबर, UPI ID या वेबसाइट है? हमसे दोबारा जांच करने को कहें",
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
    en: "Keep Sachet on your phone's home screen. Then in WhatsApp or SMS, long-press a message, tap Share, and pick Sachet to check it.",
    hi: "Sachet को अपने फोन की होम स्क्रीन पर रखें। फिर WhatsApp या SMS में मैसेज को दबाकर रखें, शेयर दबाएं, और Sachet चुनें।",
  },
  installButton: { en: "Add to home screen", hi: "होम स्क्रीन पर जोड़ें" },
  installIos: {
    en: "On iPhone: tap the Share button in Safari, then 'Add to Home Screen' to keep Sachet one tap away.",
    hi: "iPhone पर: Safari में शेयर बटन दबाएं, फिर 'Add to Home Screen' चुनें, ताकि Sachet एक टैप दूर रहे।",
  },
} as const;

// One line each, in everyday words: what the scammer says.
export const SCAM_TYPE_HINTS: Record<string, { en: string; hi: string }> = {
  investment: {
    en: "A 'tips group' promises big profits from shares or crypto, then asks you to invest more and more.",
    hi: "एक 'टिप्स ग्रुप' शेयर या क्रिप्टो से बड़े मुनाफ़े का वादा करता है, फिर बार-बार और पैसा लगवाता है।",
  },
  digital_arrest: {
    en: "Someone posing as police, CBI or customs says you are under 'digital arrest' and must pay to clear your name.",
    hi: "कोई पुलिस, CBI या कस्टम अफसर बनकर कहता है कि आप 'डिजिटल अरेस्ट' में हैं और नाम साफ़ करने के लिए पैसे दें।",
  },
  parcel: {
    en: "Your parcel is 'held at customs' or has 'illegal items', and you must pay to release it.",
    hi: "आपका पार्सल 'कस्टम में रुका' है या उसमें 'गैरकानूनी सामान' है, और छुड़ाने के लिए पैसे देने होंगे।",
  },
  kyc: {
    en: "Your bank account or SIM will be 'blocked today' unless you update KYC through a link.",
    hi: "आपका बैंक खाता या SIM 'आज बंद' हो जाएगा, जब तक आप किसी लिंक से KYC अपडेट नहीं करते।",
  },
  electricity: {
    en: "Your power will be 'cut tonight' unless you call a number or pay a pending bill.",
    hi: "आपकी बिजली 'आज रात कट' जाएगी, जब तक आप किसी नंबर पर कॉल या बकाया बिल नहीं भरते।",
  },
  task_job: {
    en: "Earn money for liking videos or writing reviews, then pay a 'fee' to unlock what you earned.",
    hi: "वीडियो लाइक करने या रिव्यू लिखने के पैसे मिलेंगे, फिर कमाई निकालने के लिए 'फीस' भरनी होगी।",
  },
  upi_refund: {
    en: "A 'refund' that needs you to scan a QR code or enter your UPI PIN. Entering your PIN always sends money.",
    hi: "एक 'रिफंड' जिसके लिए QR कोड स्कैन करना या UPI PIN डालना हो। PIN डालने से पैसे हमेशा जाते हैं, आते नहीं।",
  },
  lottery: {
    en: "You have won a lottery, KBC prize or a car, but must first pay a tax or fee.",
    hi: "आपने लॉटरी, KBC इनाम या कार जीती है, पर पहले टैक्स या फीस भरनी होगी।",
  },
  loan_app: {
    en: "An instant loan app takes access to your contacts and photos, then threatens and harasses you.",
    hi: "इंस्टेंट लोन ऐप आपके कॉन्टैक्ट और फोटो की अनुमति लेता है, फिर धमकाता और परेशान करता है।",
  },
  fake_support: {
    en: "A fake 'customer care' number asks for your OTP or to install a screen-sharing app.",
    hi: "नकली 'कस्टमर केयर' नंबर आपका OTP मांगता है या स्क्रीन-शेयरिंग ऐप इंस्टॉल करवाता है।",
  },
};

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
