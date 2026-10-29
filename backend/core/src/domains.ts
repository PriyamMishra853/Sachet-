// Domain lists used by the rules and by the seed-list import.

// Link shorteners hide where a link really goes. Not a scam by themselves,
// but a warning sign in a message that also asks for money.
export const SHORTENER_DOMAINS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "is.gd",
  "cutt.ly",
  "rb.gy",
  "shorturl.at",
  "tiny.cc",
  "ow.ly",
  "rebrand.ly",
  "s.id",
  "v.gd",
  "short.gy",
  "t.ly",
]);

// Brand names scammers put inside fake domains (sbi-kyc-update.xyz).
const BRAND_TOKENS = [
  "sbi",
  "hdfc",
  "icici",
  "axis",
  "kotak",
  "pnb",
  "bob",
  "paytm",
  "phonepe",
  "gpay",
  "googlepay",
  "bhim",
  "npci",
  "upi",
  "amazon",
  "flipkart",
  "uidai",
  "aadhaar",
  "aadhar",
  "incometax",
  "indiapost",
  "fedex",
  "dhl",
  "bluedart",
  "kbc",
  "rbi",
  "sebi",
  "epfo",
  "irctc",
];

// The real domains of those brands. A brand token on any other domain is a
// look-alike. Keep this list strict: only domains the brand actually owns.
const OFFICIAL_DOMAINS = new Set([
  "sbi.co.in",
  "onlinesbi.sbi",
  "sbi.bank.in",
  "hdfcbank.com",
  "hdfc.bank.in",
  "icicibank.com",
  "icici.bank.in",
  "axisbank.com",
  "axis.bank.in",
  "kotak.com",
  "pnbindia.in",
  "bankofbaroda.in",
  "paytm.com",
  "phonepe.com",
  "bhimupi.org.in",
  "npci.org.in",
  "amazon.in",
  "amazon.com",
  "flipkart.com",
  "uidai.gov.in",
  "incometax.gov.in",
  "indiapost.gov.in",
  "fedex.com",
  "dhl.com",
  "bluedart.com",
  "rbi.org.in",
  "sebi.gov.in",
  "epfindia.gov.in",
  "irctc.co.in",
]);

export function isShortener(domain: string): boolean {
  return SHORTENER_DOMAINS.has(domain);
}

/** Returns the brand a domain pretends to be, or null. */
export function lookalikeBrand(domain: string): string | null {
  if (OFFICIAL_DOMAINS.has(domain) || domain.endsWith(".gov.in")) return null;
  const label = domain.split(".")[0] ?? "";
  const words = label.split(/[^a-z0-9]+/);
  for (const brand of BRAND_TOKENS) {
    // Match whole hyphen-separated words ("sbi-kyc") or a brand glued to a
    // scammy word ("hdfcbank-secure", "paytmreward"); avoid short false hits
    // like "bob" inside "bobcat" by requiring 4+ letters for the glued case.
    if (words.includes(brand)) return brand;
    if (brand.length >= 4 && label.includes(brand)) return brand;
  }
  return null;
}

// Big platforms that host everyone's content. A phishing feed may list a
// URL on them (a Google Form, a GitHub file), but we must never mark the
// whole platform as high risk, so the seed import skips these domains.
export const PLATFORM_DOMAINS = new Set([
  "google.com",
  "googleusercontent.com",
  "goo.gl",
  "youtube.com",
  "github.com",
  "githubusercontent.com",
  // Shared file hosts: the whole host serves everyone's files, so the
  // public suffix list treats it as one site. Never mark it as a whole.
  "raw.githubusercontent.com",
  "gist.githubusercontent.com",
  "storage.googleapis.com",
  "firebasestorage.googleapis.com",
  "s3.amazonaws.com",
  "cdn.discordapp.com",
  "microsoft.com",
  "live.com",
  "office.com",
  "sharepoint.com",
  "onedrive.com",
  "1drv.ms",
  "dropbox.com",
  "amazonaws.com",
  "cloudfront.net",
  "azurewebsites.net",
  "windows.net",
  "cloudflare.com",
  "workers.dev",
  "facebook.com",
  "instagram.com",
  "whatsapp.com",
  "wa.me",
  "t.me",
  "telegram.org",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "apple.com",
  "icloud.com",
  "yahoo.com",
  "wixsite.com",
  "weebly.com",
  "000webhostapp.com",
  "duckdns.org",
  "ngrok.io",
  "ngrok-free.app",
  "discord.com",
  "discordapp.com",
  "mediafire.com",
]);
