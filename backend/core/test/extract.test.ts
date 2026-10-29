import { describe, expect, it } from "vitest";
import { extract } from "../src/index.js";

type Expect = { phones?: string[]; upis?: string[]; domains?: string[]; amounts?: number[] };

// Synthetic messages written in the style of real Indian scam texts.
// Numbers and IDs are made up. Replace/extend with real ones in data/test-messages.
const CASES: [string, Expect][] = [
  [
    "Your parcel is held by customs. Pay ₹2,999 to customs.clear@ybl within 2 hours.",
    { upis: ["customs.clear@ybl"], amounts: [2999] },
  ],
  [
    "Dear customer your SBI KYC expired. Update now: http://sbi-kyc-update.xyz/login",
    { domains: ["sbi-kyc-update.xyz"] },
  ],
  [
    "CBI officer calling. Call back on +91 98765-43210 immediately or face arrest.",
    { phones: ["+919876543210"] },
  ],
  [
    "Electricity will be disconnected tonight 9:30pm. Contact officer 9123456780",
    { phones: ["+919123456780"] },
  ],
  [
    "Earn Rs 5000 daily by liking YouTube videos! Join https://t.me/joinchat/abcXYZ",
    { domains: ["t.me"], amounts: [5000] },
  ],
  [
    "Congratulations! You won KBC lottery of 25 lakh rupees. Processing fee ₹15,000. WhatsApp 7012345678",
    { phones: ["+917012345678"], amounts: [2_500_000, 15_000] },
  ],
  ["Loan in 5 minutes, no documents. Download bit.ly/qloan-apk", { domains: ["bit.ly"] }],
  [
    "Refund of Rs.1,499 is pending. Accept the request on refund.desk@paytm and enter UPI PIN.",
    { upis: ["refund.desk@paytm"], amounts: [1499] },
  ],
  [
    "Guaranteed 10% daily returns! Join our VIP stock tips group: https://chat.whatsapp.com/Gx12AbC",
    { domains: ["whatsapp.com"] },
  ],
  [
    "Amazon customer care: call 1800-123-4567 or install AnyDesk from anydesk.com",
    { domains: ["anydesk.com"] },
  ],
  [
    "आपका बिजली कनेक्शन आज रात काट दिया जाएगा। तुरंत ९८७६५४३२१० पर कॉल करें",
    { phones: ["+919876543210"] },
  ],
  [
    "Bhai 2999 rupaye bhej do is UPI pe: helpdesk.kyc@okaxis",
    { upis: ["helpdesk.kyc@okaxis"], amounts: [2999] },
  ],
  ["Pay here upi://pay?pa=Lucky.Draw@ybl&pn=KBC&am=999", { upis: ["lucky.draw@ybl"] }],
  ["Visit hxxps://paytm-reward[.]in/claim now", { domains: ["paytm-reward.in"] }],
  ["Two numbers: 98765 43210 and 0091 91234 56780", { phones: ["+919876543210", "+919123456780"] }],
  ["Same number twice 9876543210, 98765-43210", { phones: ["+919876543210"] }],
  ["Mail me at ramesh.kumar@gmail.com for details", { upis: [], domains: [] }],
  ["Meeting at 10.30 on 26-10-2026, room 204", { phones: [], domains: [], amounts: [] }],
  ["Mr.Sharma will come at 5", { domains: [] }],
  ["Install KYC_update.apk sent on WhatsApp", { domains: [] }],
  [
    "Your Aadhaar 1234 5678 9012 is linked to money laundering. Pay 50,000/- now",
    { phones: [], amounts: [50_000] },
  ],
  ["Your OTP is 482913. Do not share it with anyone.", { phones: [], amounts: [] }],
  ["Check (https://www.indiapost.gov.in/track).", { domains: ["indiapost.gov.in"] }],
  [
    "Earn ₹1.5 lakh monthly. Contact HR on wa.me/919988776655",
    { domains: ["wa.me"], amounts: [150_000] },
  ],
  [
    "Invest 10k get 50k in 7 days, pay INR 10,000 to profit.king@ibl",
    { upis: ["profit.king@ibl"], amounts: [10_000] },
  ],
  ["Customs duty Rs. 4,500 for FedEx parcel AWB 7845123690", { amounts: [4500] }],
  [
    "Click https://login.hdfcbank-secure.top/a?b=1 and https://login.hdfcbank-secure.top/a?b=1",
    { domains: ["hdfcbank-secure.top"] },
  ],
  ["Server http://103.21.45.67/pay.php", { domains: ["103.21.45.67"] }],
  [
    "Hello beta, kaise ho? Ghar kab aa rahe ho?",
    { phones: [], upis: [], domains: [], amounts: [] },
  ],
  [
    "Call +1 (650) 253-0000 for your US visa refund of 2 crore",
    { phones: ["+16502530000"], amounts: [20_000_000] },
  ],
];

describe("extract", () => {
  it.each(CASES)("%s", (text, want) => {
    const got = extract(text);
    if (want.phones) expect(got.phones).toEqual(want.phones);
    if (want.upis) expect(got.upis).toEqual(want.upis);
    if (want.domains) expect(got.links.map((l) => l.domain)).toEqual(want.domains);
    if (want.amounts) expect(got.amounts).toEqual(want.amounts);
  });

  it("keeps the full URL of each link for Safe Browsing", () => {
    const { links } = extract("go to HTTPS://Login.SBI-kyc.xyz/Path now");
    expect(links).toEqual([
      {
        domain: "sbi-kyc.xyz",
        hostname: "login.sbi-kyc.xyz",
        url: "https://login.sbi-kyc.xyz/Path",
        isIp: false,
      },
    ]);
  });

  it("returns empty lists for empty text", () => {
    expect(extract("")).toEqual({ phones: [], upis: [], links: [], amounts: [] });
  });
});
