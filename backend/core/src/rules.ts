import type { ScamType, Text2 } from "./types.js";

// V1 scam rules. Each rule lists patterns in English, Hindi (Devanagari) and
// Hinglish. "strong" patterns are phrases that almost only appear in scams
// (2 points); "weak" ones are topic words that also appear in normal
// messages (1 point). Rules are data, so tuning them never needs new code.
//
// All patterns run on lower-cased text; keep them lower-case.

export type ScamRule = {
  type: ScamType;
  name: Text2;
  strong: RegExp[];
  weak: RegExp[];
  advice: Text2;
};

export const SCAM_RULES: ScamRule[] = [
  {
    type: "investment",
    name: { en: "investment / trading tips scam", hi: "निवेश / ट्रेडिंग टिप्स धोखाधड़ी" },
    strong: [
      /guarant(?:ee|eed) (?:returns?|profits?|income|allotment)|(?:returns?|profits?|allotment).{0,20}guarant/,
      /\d{1,3}\s*%\s*(?:daily|per day|a day|weekly|roz|rozana|प्रतिदिन|रोज़?)/,
      /(?:double|triple|2x|3x|10x) (?:your )?(?:money|investment|paisa|amount)|paisa double|पैसा (?:डबल|दोगुना)/,
      /(?:stock|share|ipo|trading|crypto|forex|f&o|option)s? (?:tips?|groups?|signals?|calls?)/,
      /vip (?:group|tips|signals|members?)/,
      /गारंटीड (?:रिटर्न|मुनाफा)/,
    ],
    weak: [
      /\b(?:invest(?:ment)?|nivesh)\b|निवेश/,
      /\b(?:stock market|share market|ipo|trading app|crypto|bitcoin|usdt|forex)\b|शेयर बाजार/,
      /\b(?:profit|munafa|returns?)\b|मुनाफा/,
    ],
    advice: {
      en: "Real investment advisers are SEBI-registered. Never pay into a personal UPI ID or join 'tips' groups that promise fixed returns.",
      hi: "असली निवेश सलाहकार SEBI में रजिस्टर्ड होते हैं। किसी की निजी UPI ID पर पैसे न भेजें और तय मुनाफे का वादा करने वाले 'टिप्स' ग्रुप से दूर रहें।",
    },
  },
  {
    type: "digital_arrest",
    name: { en: "digital arrest scam", hi: "डिजिटल अरेस्ट धोखाधड़ी" },
    strong: [
      /digital arrest|डिजिटल अरेस्ट/,
      /arrest warrant|warrant (?:issued|against)|गिरफ्तारी वारंट|giraftari/,
      /money laundering|मनी लॉन्ड्रिंग|hawala|हवाला/,
      /(?:case|fir|complaint) (?:is )?(?:registered|filed|lodged) against you|आपके खिलाफ (?:केस|मामला|एफआईआर)/,
      /(?:don'?t|do not) (?:tell|inform) (?:anyone|your family|anybody)|kisi ko (?:bhi )?(?:mat|na) bata|किसी को (?:भी )?(?:मत|न) बता/,
      // TRAI / telecom variant: "your number will be blocked for illegal activity".
      /(?:number|sim|mobile).{0,20}(?:will be |is being )?(?:blocked|disconnected|suspended).{0,50}(?:illegal|crime|police|cyber|complaint)/,
    ],
    weak: [
      /\b(?:cbi|ncb|narcotics|crime branch|cyber cell|enforcement directorate|trai|mumbai police|delhi police)\b|सीबीआई/,
      /\b(?:police|पुलिस)\b|पुलिस/,
      /video call|skype|वीडियो कॉल/,
      /\b(?:aadhaar|aadhar)\b|आधार/,
    ],
    advice: {
      en: "Police and CBI never arrest anyone over a video call or ask for money to 'clear' a case. Hang up and call 1930.",
      hi: "पुलिस या CBI कभी वीडियो कॉल पर गिरफ्तार नहीं करती और केस 'खत्म' करने के पैसे नहीं मांगती। कॉल काटें और 1930 पर कॉल करें।",
    },
  },
  {
    type: "parcel",
    name: { en: "courier / customs parcel scam", hi: "कूरियर / कस्टम पार्सल धोखाधड़ी" },
    strong: [
      /(?:parcel|package|shipment|courier) (?:is |has been )?(?:held|seized|stuck|on hold|blocked|returned)|पार्सल (?:रोका|जब्त|रुका)/,
      /(?:drugs|mdma|illegal items|fake passports?) (?:found|were found|in your (?:parcel|package))|पार्सल में (?:ड्रग्स|नशीले)/,
      /customs (?:duty|fee|clearance|charges?)|कस्टम (?:ड्यूटी|शुल्क)/,
      /(?:(?:address|delivery) (?:is )?(?:incomplete|failed|not found)|incomplete address).{0,40}(?:update|pay|click)/,
    ],
    weak: [
      /\b(?:parcel|courier|package|shipment|consignment)\b|पार्सल|कूरियर/,
      /\b(?:fedex|dhl|blue ?dart|india post|dtdc|delhivery)\b/,
      /\bcustoms?\b|कस्टम/,
    ],
    advice: {
      en: "Courier companies and customs never ask for fees by UPI or over a phone call. Check the tracking number only on the official website.",
      hi: "कूरियर कंपनियां या कस्टम कभी UPI या फोन कॉल पर शुल्क नहीं मांगते। ट्रैकिंग नंबर सिर्फ आधिकारिक वेबसाइट पर जांचें।",
    },
  },
  {
    type: "kyc",
    name: { en: "KYC / account blocked scam", hi: "KYC / खाता बंद धोखाधड़ी" },
    strong: [
      /kyc.{0,25}(?:expire|pending|update|suspend|block|incomplete)|केवाईसी|kyc अपडेट/,
      /(?:account|a\/c|acct|card|sim|wallet|yono|net ?banking).{0,30}(?:will be |has been |is )?(?:blocked|suspended|deactivated|closed|band|freeze|frozen)|खाता.{0,20}(?:बंद|ब्लॉक)/,
      /pan.{0,20}(?:link|update|not linked)|पैन.{0,15}लिंक/,
    ],
    weak: [
      /\bkyc\b/,
      /\b(?:sbi|hdfc|icici|axis|pnb|kotak|yono|bank)\b|बैंक/,
      /\b(?:update|verify|verification)\b/,
    ],
    advice: {
      en: "Banks never send KYC links by SMS or WhatsApp. Update KYC only at your branch or in the bank's official app.",
      hi: "बैंक कभी SMS या WhatsApp पर KYC लिंक नहीं भेजते। KYC सिर्फ ब्रांच में या बैंक के आधिकारिक ऐप से अपडेट करें।",
    },
  },
  {
    type: "electricity",
    name: { en: "electricity bill scam", hi: "बिजली बिल धोखाधड़ी" },
    strong: [
      /(?:electricity|power|bijli|light|connection).{0,40}(?:will be )?(?:cut|disconnect|kaat|kat)|बिजली.{0,30}(?:कट|काट)/,
      /(?:previous|last) month(?:'s)? bill (?:was )?not (?:been )?updated/,
      /(?:electricity|bijli|eb) officer|बिजली (?:अधिकारी|ऑफिसर)/,
    ],
    weak: [
      /\b(?:electricity|bijli|electric|power supply)\b|बिजली/,
      /\bbill\b|बिल/,
      /\btonight\b|aaj raat|आज रात/,
    ],
    advice: {
      en: "Check and pay your bill only on the official electricity board website or app. Boards don't send 'officer' numbers by SMS.",
      hi: "बिल सिर्फ बिजली बोर्ड की आधिकारिक वेबसाइट या ऐप पर देखें और भरें। बोर्ड SMS पर किसी 'अधिकारी' का नंबर नहीं भेजता।",
    },
  },
  {
    type: "task_job",
    name: { en: "task / part-time job scam", hi: "टास्क / पार्ट-टाइम जॉब धोखाधड़ी" },
    strong: [
      /(?:like|subscribe|rate|review|follow).{0,30}(?:videos?|youtube|hotels?|products?|posts?|pages?).{0,50}(?:earn|paid|income|kamao|₹|rs)/,
      /(?:part[- ]?time|work from home|ghar baithe|घर बैठे).{0,50}(?:job|earn|kamai|income|कमाई|₹)/,
      /(?:pre-?paid|merchant|vip) tasks?|tasks?.{0,25}(?:recharge|deposit|invest)/,
      /earn.{0,25}(?:daily|per day|a day|roz|from home)|(?:daily|roz) (?:income|kamai)/,
    ],
    weak: [
      /\b(?:job|naukri|hiring|vacancy|hr)\b|नौकरी/,
      /\btasks?\b|टास्क/,
      /\b(?:earn(?:ing)?|kamao|kamai|salary)\b|कमाएं|कमाई/,
      /\btelegram\b/,
    ],
    advice: {
      en: "Any job that asks you to pay or 'recharge' first is a scam. Real employers never charge you to work.",
      hi: "जो नौकरी पहले पैसे या 'रिचार्ज' मांगे, वह धोखा है। असली कंपनियां काम देने के पैसे नहीं लेतीं।",
    },
  },
  {
    type: "upi_refund",
    name: { en: "fake refund / UPI collect scam", hi: "फर्जी रिफंड / UPI कलेक्ट धोखाधड़ी" },
    strong: [
      /(?:enter|put|daal|daalo|डालें|डाल).{0,25}(?:upi )?(?:pin|पिन).{0,40}(?:receive|get|refund|credit|paise milenge|मिलेंगे)/,
      /pin.{0,20}(?:to receive|for receiving|to get (?:the )?(?:money|refund))/,
      // Hinglish puts the verb after the object: "pin daalo, paise milenge".
      /(?:pin|पिन) (?:daalo|dalo|daal do|enter karo|डालो|डालें).{0,30}(?:paise|paisa|milenge|refund|पैसे|मिलेंगे)/,
      /(?:collect|payment|money) request.{0,50}(?:refund|cashback|receive|accept)/,
      /(?:refund|cashback).{0,50}(?:accept|approve).{0,25}request/,
    ],
    weak: [/\b(?:refund|cashback)\b|रिफंड|कैशबैक/, /\bupi\b/, /\brequest\b/],
    advice: {
      en: "You never need your UPI PIN to receive money. Entering the PIN always sends money out of your account.",
      hi: "पैसे पाने के लिए UPI PIN की कभी जरूरत नहीं होती। PIN डालने से हमेशा आपके खाते से पैसे जाते हैं।",
    },
  },
  {
    type: "lottery",
    name: { en: "lottery / prize / KBC scam", hi: "लॉटरी / इनाम / KBC धोखाधड़ी" },
    strong: [
      /you(?:'ve| have)? won|aap(?:ne)? (?:jeet|jite)|आपने .{0,25}जीत/,
      /\b(?:kbc|kaun banega crorepati|lucky draw|lottery|jackpot)\b|लॉटरी|केबीसी/,
      /(?:processing|registration|delivery|gst|tax|clearance) (?:fee|charges?)/,
    ],
    weak: [
      /\b(?:prize|inaam|winner|congratulations|badhai)\b|इनाम|बधाई/,
      /\b(?:gift|reward|lucky)\b/,
    ],
    advice: {
      en: "A prize from a contest you never entered is a scam. Real prizes never ask for a fee first.",
      hi: "जिस प्रतियोगिता में आपने हिस्सा नहीं लिया, उसका इनाम धोखा है। असली इनाम के लिए पहले फीस नहीं ली जाती।",
    },
  },
  {
    type: "loan_app",
    name: { en: "instant loan app scam", hi: "इंस्टेंट लोन ऐप धोखाधड़ी" },
    strong: [
      /loan.{0,30}(?:in )?\d+\s*(?:min|mins|minutes|मिनट)|instant loan|turant loan|तुरंत लोन/,
      /(?:no|without|bina) (?:documents?|cibil|kagaz|paperwork)|बिना (?:कागज|दस्तावेज)/,
    ],
    weak: [
      /\b(?:loan|lone|karz)\b|लोन|कर्ज/,
      /\b(?:approved|pre-?approved|sanctioned)\b/,
      /\.apk\b/,
    ],
    advice: {
      en: "Borrow only from RBI-registered lenders, and never install an .apk file sent in a chat.",
      hi: "सिर्फ RBI में रजिस्टर्ड संस्थाओं से लोन लें, और चैट में भेजी गई .apk फाइल कभी इंस्टॉल न करें।",
    },
  },
  {
    type: "fake_support",
    name: { en: "fake customer care / OTP scam", hi: "फर्जी कस्टमर केयर / OTP धोखाधड़ी" },
    strong: [
      /\b(?:anydesk|teamviewer|quick ?support|rustdesk|airdroid|screen ?share)\b/,
      /customer (?:care|support|service).{0,40}(?:call|contact|whatsapp|number)/,
    ],
    weak: [/customer (?:care|support)|helpline|toll[- ]?free|कस्टमर केयर/, /\botp\b|ओटीपी/],
    advice: {
      en: "Never share an OTP or install screen-sharing apps on a stranger's request. Find customer care numbers only on the company's official website or app.",
      hi: "किसी अनजान के कहने पर OTP न बताएं और स्क्रीन-शेयरिंग ऐप इंस्टॉल न करें। कस्टमर केयर नंबर सिर्फ कंपनी की आधिकारिक वेबसाइट या ऐप से लें।",
    },
  },
];
