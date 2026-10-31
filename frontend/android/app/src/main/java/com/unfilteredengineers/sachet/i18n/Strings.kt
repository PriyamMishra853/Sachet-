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
    val navReport = Text2("Report a scam", "शिकायत करें")
    val brandTagline = Text2("Free scam check", "मुफ़्त धोखाधड़ी जांच")
    val heroEyebrow = Text2("Free · No sign-up · Hindi and English", "मुफ़्त · बिना साइन-अप · हिंदी और अंग्रेज़ी")
    val heroTitle = Text2(
        "Got a suspicious message? Check it before you pay.",
        "शक वाला मैसेज आया है? पैसे भेजने से पहले जांच लें।",
    )
    val heroLead = Text2(
        "Paste the message, or the phone number, UPI ID or link in it. In a few seconds Sachet tells you if it looks like a fraud, and what to do next.",
        "मैसेज पेस्ट करें, या उसमें दिया फोन नंबर, UPI ID या लिंक डालें। कुछ ही सेकंड में Sachet बताएगा कि यह धोखाधड़ी लगती है या नहीं, और आगे क्या करें।",
    )
    val trustNever = Text2(
        "Sachet never calls you or asks for your OTP, PIN or bank details.",
        "Sachet न कभी कॉल करता है, न आपका OTP, PIN या बैंक विवरण मांगता है।",
    )
    val trustNotKept = Text2(
        "The message you check is not saved. Only reports are kept, with personal details removed.",
        "आपका जांचा गया मैसेज सेव नहीं होता। सिर्फ शिकायतें रखी जाती हैं, निजी जानकारी हटाकर।",
    )
    val trustPeople = Text2(
        "Warnings come from reports by people like you and from public lists of fraud websites.",
        "चेतावनियां आप जैसे लोगों की शिकायतों और धोखाधड़ी वाली वेबसाइटों की सार्वजनिक सूचियों से आती हैं।",
    )
    val formQuestion = Text2("What do you want to check?", "आप क्या जांचना चाहते हैं?")
    val fieldMessage = Text2("Paste the full message", "पूरा मैसेज पेस्ट करें")
    val fieldPhone = Text2("Phone number", "फोन नंबर")
    val fieldUpi = Text2("UPI ID", "UPI ID")
    val fieldUrl = Text2("Link or website", "लिंक या वेबसाइट")
    val senderToggle = Text2("Add who sent it (optional)", "भेजने वाला जोड़ें (वैकल्पिक)")
    val senderHelp = Text2(
        "The name or number at the top of the SMS. It helps spot fake bank and government messages.",
        "SMS में सबसे ऊपर दिखने वाला नाम या नंबर। इससे नकली बैंक और सरकारी मैसेज पहचानने में मदद मिलती है।",
    )
    val scamsTitle = Text2("Common scams in India", "भारत में आम धोखाधड़ी")
    val scamsLead = Text2(
        "Most frauds follow a few scripts. If a message sounds like one of these, stop and check it first.",
        "ज़्यादातर धोखाधड़ी कुछ तय तरीकों से होती है। अगर कोई मैसेज इनमें से किसी जैसा लगे, तो रुकें और पहले जांचें।",
    )
    val helpTitle = Text2("Already paid a scammer?", "धोखेबाज़ को पैसे भेज चुके हैं?")
    val helpBody = Text2(
        "Call 1930, the national cyber fraud helpline, right away. The sooner you call, the better the chance to stop the money. You can also report at cybercrime.gov.in.",
        "तुरंत 1930 पर कॉल करें, यह राष्ट्रीय साइबर धोखाधड़ी हेल्पलाइन है। जितनी जल्दी कॉल करेंगे, पैसे रोकने की संभावना उतनी ज़्यादा होगी। आप cybercrime.gov.in पर भी शिकायत कर सकते हैं।",
    )
    val reportOnline = Text2("Report at cybercrime.gov.in", "cybercrime.gov.in पर शिकायत करें")
    val bandSubHigh = Text2(
        "This looks like a scam. Do not pay or share any code.",
        "यह धोखाधड़ी लगती है। पैसे न भेजें और कोई कोड न बताएं।",
    )
    val bandSubMedium = Text2(
        "This may be a scam. Check carefully before you do anything.",
        "यह धोखाधड़ी हो सकती है। कुछ भी करने से पहले ध्यान से जांचें।",
    )
    val bandSubLow = Text2("Little risk found.", "कम जोखिम मिला।")
    val bandSubUnknown = Text2(
        "Nobody has reported this yet. That does not mean it is safe.",
        "अभी तक किसी ने इसकी शिकायत नहीं की है। इसका मतलब यह नहीं कि यह सुरक्षित है।",
    )
    val scamTypeLabel = Text2("Type of scam", "धोखाधड़ी का प्रकार")
    val statsTitle = Text2("So far", "अब तक")
    val privacyTitle = Text2("Your privacy", "आपकी गोपनीयता")
    val privacyLead = Text2(
        "What Sachet keeps, what it never keeps, and how to delete your data.",
        "Sachet क्या रखता है, क्या कभी नहीं रखता, और अपना डेटा कैसे मिटाएं।",
    )
    val navPrivacy = Text2("Privacy", "गोपनीयता")
    val checkTitle = Text2("Is this a scam?", "क्या यह धोखाधड़ी है?")
    val checkIntro = Text2(
        "Paste a message, or enter a phone number, UPI ID or link. You'll get an answer in about a second.",
        "मैसेज पेस्ट करें, या फोन नंबर, UPI ID या लिंक डालें। लगभग एक सेकंड में जवाब मिलेगा।",
    )
    val shareTip = Text2(
        "Tip: in WhatsApp or SMS, long-press a message, tap Share, and pick Sachet to check it straight away. You can share a screenshot too.",
        "सुझाव: WhatsApp या SMS में मैसेज को दबाकर रखें, शेयर दबाएं, और Sachet चुनें; तुरंत जांच हो जाएगी। आप स्क्रीनशॉट भी शेयर कर सकते हैं।",
    )
    val screenshotButton = Text2("Check a screenshot instead", "इसकी जगह स्क्रीनशॉट जांचें")
    val readingScreenshot = Text2("Reading the screenshot…", "स्क्रीनशॉट पढ़ रहे हैं…")
    val screenshotNote = Text2(
        "The picture is read on your phone and never uploaded. Only the text in it is checked.",
        "तस्वीर आपके फोन पर ही पढ़ी जाती है और कभी अपलोड नहीं होती। सिर्फ उसका टेक्स्ट जांचा जाता है।",
    )
    val screenshotNoText = Text2(
        "Couldn't find any text in this picture. Paste the message instead.",
        "इस तस्वीर में कोई टेक्स्ट नहीं मिला। मैसेज पेस्ट करके जांचें।",
    )
    val screenshotFailed = Text2(
        "Couldn't read this picture. If you just installed Sachet, wait a minute and try again.",
        "यह तस्वीर पढ़ नहीं पाए। अगर अभी Sachet इंस्टॉल किया है, तो एक मिनट रुककर फिर कोशिश करें।",
    )
    val tabMessage = Text2("Message", "मैसेज")
    val tabPhone = Text2("Phone number", "फोन नंबर")
    val tabUpi = Text2("UPI ID", "UPI ID")
    val tabUrl = Text2("Link", "लिंक")
    val phMessage = Text2(
        "For example: Your electricity will be cut tonight. Call 98765 43210 to update your bill.",
        "जैसे: आज रात आपकी बिजली काट दी जाएगी। बिल अपडेट करने के लिए 98765 43210 पर कॉल करें।",
    )
    val phPhone = Text2("e.g. +91 98765 43210", "जैसे +91 98765 43210")
    val phUpi = Text2("e.g. name@ybl", "जैसे name@ybl")
    val phUrl = Text2("e.g. bit.ly/abc or sbi-kyc.xyz", "जैसे bit.ly/abc या sbi-kyc.xyz")
    val senderLabel = Text2("Who sent it?", "किसने भेजा?")
    val senderPlaceholder = Text2("e.g. VM-HDFCBK-S or 98765 43210", "जैसे VM-HDFCBK-S या 98765 43210")
    val sender = Text2("Sender", "भेजने वाला")
    val checkButton = Text2("Check now", "अभी जांचें")
    val checking = Text2("Checking…", "जांच हो रही है…")
    val why = Text2("Why we say this", "हम ऐसा क्यों कह रहे हैं")
    val whatToDo = Text2("What to do now", "अब क्या करें")
    val found = Text2("Found in the message", "मैसेज में मिला")
    val reportedBy = Text2("People who reported it", "शिकायत करने वाले लोग")
    val reportThis = Text2("Report this as a scam", "इसकी शिकायत करें")
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
    val paidQuestion = Text2("Have you already paid any money?", "क्या आपने पहले ही कोई पैसे भेज दिए हैं?")
    val paidYes = Text2("Yes, I paid", "हां, भेजे")
    val paidNo = Text2("No", "नहीं")
    val afterYes = Text2(
        "Act now: call 1930 or report at cybercrime.gov.in, and call your bank to block the payment. The sooner you report, the better the chance to freeze the money.",
        "अभी कदम उठाएं: 1930 पर कॉल करें या cybercrime.gov.in पर शिकायत करें, और पेमेंट रोकने के लिए अपने बैंक को कॉल करें। जितनी जल्दी शिकायत करेंगे, पैसे रोकने की संभावना उतनी ज्यादा होगी।",
    )
    val afterNo = Text2(
        "Well done! You stopped a scam. Share Sachet with your family so they can check too.",
        "बहुत बढ़िया! आपने एक धोखाधड़ी रोक दी। Sachet को अपने परिवार के साथ शेयर करें ताकि वे भी जांच सकें।",
    )
    val statsChecks = Text2("checks", "जांचें")
    val statsReports = Text2("scam reports", "धोखाधड़ी की शिकायतें")
    val statsProtected = Text2("kept from scammers", "धोखेबाज़ों से बचाए गए")
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
    val call1930 = Text2("Call 1930", "1930 पर कॉल करें")
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
        "Sachet checks phone numbers, UPI IDs, links and messages for scams, using reports from people like you and public lists of fraud websites. When it knows nothing about something, it says \"No reports yet\", never \"safe\". It is a free student project by Team UnfilteredEngineers (UIET, CSJM University Kanpur), not a government service.",
        "Sachet आप जैसे लोगों की शिकायतों और धोखाधड़ी वाली वेबसाइटों की सार्वजनिक सूचियों की मदद से फोन नंबर, UPI ID, लिंक और मैसेज में धोखाधड़ी की जांच करता है। जब उसे किसी चीज़ के बारे में कुछ पता नहीं होता, तो वह \"अभी तक कोई रिपोर्ट नहीं\" कहता है, कभी \"सुरक्षित\" नहीं। यह Team UnfilteredEngineers (UIET, CSJM विश्वविद्यालय कानपुर) का मुफ़्त छात्र प्रोजेक्ट है, सरकारी सेवा नहीं।",
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

// One line each, in everyday words: what the scammer says. Same as the website.
val SCAM_TYPE_HINTS: Map<String, Text2> = mapOf(
    "investment" to Text2(
        "A 'tips group' promises big profits from shares or crypto, then asks you to invest more and more.",
        "एक 'टिप्स ग्रुप' शेयर या क्रिप्टो से बड़े मुनाफ़े का वादा करता है, फिर बार-बार और पैसा लगवाता है।",
    ),
    "digital_arrest" to Text2(
        "Someone posing as police, CBI or customs says you are under 'digital arrest' and must pay to clear your name.",
        "कोई पुलिस, CBI या कस्टम अफसर बनकर कहता है कि आप 'डिजिटल अरेस्ट' में हैं और नाम साफ़ करने के लिए पैसे दें।",
    ),
    "parcel" to Text2(
        "Your parcel is 'held at customs' or has 'illegal items', and you must pay to release it.",
        "आपका पार्सल 'कस्टम में रुका' है या उसमें 'गैरकानूनी सामान' है, और छुड़ाने के लिए पैसे देने होंगे।",
    ),
    "kyc" to Text2(
        "Your bank account or SIM will be 'blocked today' unless you update KYC through a link.",
        "आपका बैंक खाता या SIM 'आज बंद' हो जाएगा, जब तक आप किसी लिंक से KYC अपडेट नहीं करते।",
    ),
    "electricity" to Text2(
        "Your power will be 'cut tonight' unless you call a number or pay a pending bill.",
        "आपकी बिजली 'आज रात कट' जाएगी, जब तक आप किसी नंबर पर कॉल या बकाया बिल नहीं भरते।",
    ),
    "task_job" to Text2(
        "Earn money for liking videos or writing reviews, then pay a 'fee' to unlock what you earned.",
        "वीडियो लाइक करने या रिव्यू लिखने के पैसे मिलेंगे, फिर कमाई निकालने के लिए 'फीस' भरनी होगी।",
    ),
    "upi_refund" to Text2(
        "A 'refund' that needs you to scan a QR code or enter your UPI PIN. Entering your PIN always sends money.",
        "एक 'रिफंड' जिसके लिए QR कोड स्कैन करना या UPI PIN डालना हो। PIN डालने से पैसे हमेशा जाते हैं, आते नहीं।",
    ),
    "lottery" to Text2(
        "You have won a lottery, KBC prize or a car, but must first pay a tax or fee.",
        "आपने लॉटरी, KBC इनाम या कार जीती है, पर पहले टैक्स या फीस भरनी होगी।",
    ),
    "loan_app" to Text2(
        "An instant loan app takes access to your contacts and photos, then threatens and harasses you.",
        "इंस्टेंट लोन ऐप आपके कॉन्टैक्ट और फोटो की अनुमति लेता है, फिर धमकाता और परेशान करता है।",
    ),
    "fake_support" to Text2(
        "A fake 'customer care' number asks for your OTP or to install a screen-sharing app.",
        "नकली 'कस्टमर केयर' नंबर आपका OTP मांगता है या स्क्रीन-शेयरिंग ऐप इंस्टॉल करवाता है।",
    ),
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
        Text2(
            "If you ask for a review of your own number, UPI ID or website (on the website): your reason, and the contact you give until the review is decided.",
            "अगर आप (वेबसाइट पर) अपने नंबर, UPI ID या वेबसाइट की जांच का अनुरोध करते हैं: आपकी बताई वजह, और फैसला होने तक आपका दिया संपर्क।",
        ),
    ),
    Text2("What we never store", "हम क्या कभी सेव नहीं करते") to listOf(
        Text2(
            "Screenshots you check: the picture is read on your phone by Google's ML Kit and never uploaded. Only the text found in it is checked, like a pasted message. ML Kit sends Google usage statistics, not the picture or its text.",
            "आपके जांचे गए स्क्रीनशॉट: तस्वीर आपके फोन पर ही Google के ML Kit से पढ़ी जाती है और कभी अपलोड नहीं होती। उसमें मिला टेक्स्ट ही पेस्ट किए मैसेज की तरह जांचा जाता है। ML Kit Google को इस्तेमाल के आंकड़े भेजता है, तस्वीर या उसका टेक्स्ट नहीं।",
        ),
        Text2(
            "Your phone number, contacts, SMS or call log: the app has no permission to read them. It keeps only a random ID on this phone so your reports are counted once, and the server stores just a scrambled code made from it, which can't be turned back into the ID.",
            "आपका फोन नंबर, कॉन्टैक्ट, SMS या कॉल लॉग: ऐप को इन्हें पढ़ने की अनुमति ही नहीं है। यह इस फोन पर सिर्फ एक रैंडम ID रखता है ताकि आपकी शिकायत एक ही बार गिनी जाए, और सर्वर उससे बना सिर्फ एक बदला हुआ कोड रखता है, जिससे ID वापस नहीं निकाली जा सकती।",
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
        Text2(
            "Website names you check may be looked up in public records of when websites were registered, to see how new the website is.",
            "आपके जांचे गए वेबसाइट नाम उन सार्वजनिक रिकॉर्ड में देखे जा सकते हैं जिनमें वेबसाइट के रजिस्टर होने की तारीख होती है, यह जानने के लिए कि वेबसाइट कितनी नई है।",
        ),
        Text2(
            "If the AI check is switched on: message text you check, after removing the personal details we can find, may be sent to Anthropic's Claude AI for a second opinion. Sachet keeps only its yes/no answer, for up to 7 days.",
            "अगर AI जांच चालू है: आपके जांचे गए मैसेज का टेक्स्ट, उसमें मिलने वाली निजी जानकारी हटाने के बाद, दूसरी राय के लिए Anthropic के Claude AI को भेजा जा सकता है। Sachet सिर्फ उसका हां/ना जवाब, अधिकतम 7 दिन रखता है।",
        ),
    ),
)
