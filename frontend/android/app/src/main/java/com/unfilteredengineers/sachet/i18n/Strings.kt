package com.unfilteredengineers.sachet.i18n

import kotlinx.serialization.Serializable

// Every piece of text in the app, in English and Hindi. Kept in step with the
// website's lib/i18n.ts, so both say the same thing.

enum class Lang(val code: String) { EN("en"), HI("hi") }

/** The same text in both languages. The API sends reasons and advice in this shape too. */
@Serializable
data class Text2(val en: String, val hi: String) {
    fun of(lang: Lang): String = if (lang == Lang.HI) hi else en
}

object T {
    val tagline = Text2("Stop the scam before the payment", "पेमेंट से पहले धोखाधड़ी रोकें")
    val navCheck = Text2("Check", "जांचें")
    val navReport = Text2("Report", "शिकायत")
    val navPrivacy = Text2("Privacy", "गोपनीयता")
    val checkTitle = Text2("Is this a scam?", "क्या यह धोखाधड़ी है?")
    val checkIntro = Text2(
        "Paste a message, or enter a phone number, UPI ID or link. You'll get an answer in about a second.",
        "मैसेज पेस्ट करें, या फोन नंबर, UPI ID या लिंक डालें। लगभग एक सेकंड में जवाब मिलेगा।",
    )
    val shareTip = Text2(
        "Tip: in WhatsApp or SMS, long-press a message → Share → Sachet to check it straight away.",
        "सुझाव: WhatsApp या SMS में मैसेज को दबाकर रखें → शेयर → Sachet, और तुरंत जांच हो जाएगी।",
    )
    val tabMessage = Text2("Message", "मैसेज")
    val tabPhone = Text2("Phone", "फोन")
    val tabUpi = Text2("UPI ID", "UPI ID")
    val tabUrl = Text2("Link", "लिंक")
    val phMessage = Text2("Paste the full message here…", "पूरा मैसेज यहां पेस्ट करें…")
    val phPhone = Text2("e.g. +91 98765 43210", "जैसे +91 98765 43210")
    val phUpi = Text2("e.g. name@ybl", "जैसे name@ybl")
    val phUrl = Text2("e.g. bit.ly/abc", "जैसे bit.ly/abc")
    val senderLabel = Text2("Sender (optional)", "भेजने वाला (वैकल्पिक)")
    val senderPlaceholder = Text2("SMS name like VM-HDFCBK-S, or the number", "SMS का नाम जैसे VM-HDFCBK-S, या नंबर")
    val sender = Text2("Sender", "भेजने वाला")
    val checkButton = Text2("Check now", "अभी जांचें")
    val checking = Text2("Checking…", "जांच हो रही है…")
    val why = Text2("Why", "क्यों")
    val whatToDo = Text2("What to do", "क्या करें")
    val found = Text2("Found in the message", "मैसेज में मिला")
    val reportedBy = Text2("Reports", "शिकायतें")
    val reportThis = Text2("🚩 Report this as a scam", "🚩 इसकी शिकायत करें")
    val reportThanks = Text2(
        "Thank you. Your report will warn the next person who checks this.",
        "धन्यवाद। आपकी शिकायत अगली बार जांच करने वाले को सावधान करेगी।",
    )
    val reportDuplicate = Text2(
        "You already reported this. Thank you!",
        "आप इसकी शिकायत पहले ही कर चुके हैं। धन्यवाद!",
    )
    val errorGeneric = Text2(
        "Something went wrong. Please try again.",
        "कुछ गलत हो गया। कृपया दोबारा कोशिश करें।",
    )
    val errorOffline = Text2(
        "Can't reach Sachet right now. Check your internet and try again.",
        "अभी Sachet से जुड़ नहीं पा रहे। इंटरनेट जांचें और दोबारा कोशिश करें।",
    )
    val reportTitle = Text2("Report a scam", "धोखाधड़ी की शिकायत करें")
    val reportIntro = Text2(
        "Your report warns the next person. Add the scammer's number, UPI ID or link, and the message if you have it.",
        "आपकी शिकायत अगले व्यक्ति को सावधान करती है। धोखेबाज़ का नंबर, UPI ID या लिंक, और मैसेज हो तो वह भी डालें।",
    )
    val reportWhat = Text2("Number, UPI ID or link", "नंबर, UPI ID या लिंक")
    val reportType = Text2("Type of scam (optional)", "धोखाधड़ी का प्रकार (वैकल्पिक)")
    val reportText = Text2("The message (optional)", "मैसेज (वैकल्पिक)")
    val reportAmount = Text2("Money asked for, in ₹ (optional)", "मांगी गई रकम, ₹ में (वैकल्पिक)")
    val reportSubmit = Text2("Send report", "शिकायत भेजें")
    val reportPrivacy = Text2(
        "Don't include your own name, OTP or bank details. We remove personal details we can find before saving.",
        "अपना नाम, OTP या बैंक विवरण न डालें। सेव करने से पहले हम मिलने वाली निजी जानकारी हटा देते हैं।",
    )
    val lostMoney = Text2(
        "Lost money? Call 1930 now or report at cybercrime.gov.in",
        "पैसे गए? अभी 1930 पर कॉल करें या cybercrime.gov.in पर शिकायत करें",
    )
    val call1930 = Text2("📞 Call 1930", "📞 1930 पर कॉल करें")
    val openCybercrime = Text2("cybercrime.gov.in", "cybercrime.gov.in")
    val unknown = Text2("Not sure", "पता नहीं")
    val deleteButton = Text2("Delete my data", "मेरा डेटा मिटाएं")
    val deleteConfirmTitle = Text2("Delete your data?", "अपना डेटा मिटाएं?")
    val deleteConfirmBody = Text2(
        "Your reports and check history from this phone will be removed. This can't be undone.",
        "इस फोन से की गई आपकी शिकायतें और जांच का इतिहास मिटा दिया जाएगा। इसे वापस नहीं लाया जा सकता।",
    )
    val cancel = Text2("Cancel", "रद्द करें")
    val delete = Text2("Delete", "मिटाएं")
    val deleteFailed = Text2(
        "Could not delete right now. Please try again.",
        "अभी मिटा नहीं पाए। दोबारा कोशिश करें।",
    )
    fun deleted(reports: Int, checks: Int) = Text2(
        "Deleted $reports report(s) and $checks check(s) from this phone.",
        "इस फोन की $reports शिकायत और $checks जांच मिटा दी गईं।",
    )
    val aboutTitle = Text2("About Sachet", "Sachet के बारे में")
    val aboutBody = Text2(
        "Sachet checks phone numbers, UPI IDs, links and messages for scams, using reports from people like you, phishing lists and Google Safe Browsing. When it knows nothing about something, it says \"No reports yet\", never \"safe\".",
        "Sachet आप जैसे लोगों की शिकायतों, फ़िशिंग सूचियों और Google Safe Browsing की मदद से फोन नंबर, UPI ID, लिंक और मैसेज में धोखाधड़ी की जांच करता है। जब उसे किसी चीज़ के बारे में कुछ पता नहीं होता, तो वह \"अभी तक कोई शिकायत नहीं\" कहता है, कभी \"सुरक्षित\" नहीं।",
    )
}

val SCAM_TYPE_NAMES: Map<String, Text2> = linkedMapOf(
    "investment" to Text2("Investment / trading tips", "निवेश / ट्रेडिंग टिप्स"),
    "digital_arrest" to Text2("Digital arrest", "डिजिटल अरेस्ट"),
    "parcel" to Text2("Courier / customs parcel", "कूरियर / कस्टम पार्सल"),
    "kyc" to Text2("KYC / account blocked", "KYC / खाता बंद"),
    "electricity" to Text2("Electricity bill", "बिजली बिल"),
    "task_job" to Text2("Task / part-time job", "टास्क / पार्ट-टाइम जॉब"),
    "upi_refund" to Text2("Fake refund / UPI collect", "फर्जी रिफंड / UPI कलेक्ट"),
    "lottery" to Text2("Lottery / prize / KBC", "लॉटरी / इनाम / KBC"),
    "loan_app" to Text2("Instant loan app", "इंस्टेंट लोन ऐप"),
    "fake_support" to Text2("Fake customer care / OTP", "फर्जी कस्टमर केयर / OTP"),
)

/** Plain-language privacy notice (DPDP Act). Keep in sync with what the API stores. */
val PRIVACY_SECTIONS: List<Pair<Text2, List<Text2>>> = listOf(
    Text2("What we store", "हम क्या सेव करते हैं") to listOf(
        Text2(
            "The phone numbers, UPI IDs and website names that people report or check, so we can warn others.",
            "लोग जिन फोन नंबर, UPI ID और वेबसाइट की शिकायत या जांच करते हैं, ताकि दूसरों को सावधान कर सकें।",
        ),
        Text2(
            "Reported message text, after removing names, OTPs, emails, Aadhaar, PAN, card and account numbers we can detect.",
            "शिकायत वाले मैसेज का टेक्स्ट, उसमें मिलने वाले नाम, OTP, ईमेल, आधार, पैन, कार्ड और खाता नंबर हटाने के बाद।",
        ),
        Text2(
            "For each check: the result (for example 'high risk'), the scam type, and the amount asked for, so we can count money protected.",
            "हर जांच के लिए: नतीजा (जैसे 'उच्च जोखिम'), धोखाधड़ी का प्रकार, और मांगी गई रकम, ताकि बचाए गए पैसों की गिनती हो सके।",
        ),
    ),
    Text2("What we never store", "हम क्या कभी सेव नहीं करते") to listOf(
        Text2(
            "Your phone number, contacts, SMS or call log: the app has no permission to read them. It keeps only a random ID on this phone so your reports are counted once, and the server stores just a scrambled code (a salted hash) of it.",
            "आपका फोन नंबर, कॉन्टैक्ट, SMS या कॉल लॉग: ऐप को इन्हें पढ़ने की अनुमति ही नहीं है। यह इस फोन पर सिर्फ एक रैंडम ID रखता है ताकि आपकी शिकायत एक ही बार गिनी जाए, और सर्वर उसका सिर्फ एक बदला हुआ कोड (salted hash) रखता है।",
        ),
    ),
    Text2("How we use it", "हम इसका उपयोग कैसे करते हैं") to listOf(
        Text2(
            "Only to warn people about scams and to improve Sachet. We never sell data and never call anyone a criminal: we only say what was reported.",
            "सिर्फ लोगों को धोखाधड़ी से सावधान करने और Sachet को बेहतर बनाने के लिए। हम डेटा कभी नहीं बेचते और किसी को अपराधी नहीं कहते: हम सिर्फ बताते हैं कि क्या शिकायत हुई।",
        ),
        Text2(
            "Links you check may be sent to Google Safe Browsing to see if Google knows they are dangerous.",
            "आपके जांचे गए लिंक Google Safe Browsing को भेजे जा सकते हैं, यह देखने के लिए कि Google उन्हें खतरनाक मानता है या नहीं।",
        ),
    ),
)
