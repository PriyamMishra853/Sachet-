// Google Safe Browsing v4 Lookup API: asks Google whether URLs are on its
// phishing/malware lists. Free for non-commercial use; switch to Google Web
// Risk before Sachet earns money.

export interface SafeBrowsing {
  /** Returns the subset of `urls` that Google flags. Never throws. */
  check(urls: string[]): Promise<Set<string>>;
}

const ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";

export function createSafeBrowsing(opts: {
  apiKey?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  onError?: (err: unknown) => void;
}): SafeBrowsing {
  const { apiKey, fetchFn = fetch, timeoutMs = 800, onError = () => {} } = opts;

  return {
    async check(urls) {
      if (!apiKey || urls.length === 0) return new Set();
      try {
        // The key goes in a header, not the URL: URLs end up in error messages and proxy logs.
        const res = await fetchFn(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          // A slow answer is worse than no answer: the user is waiting.
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify({
            client: { clientId: "sachet", clientVersion: "0.1.0" },
            threatInfo: {
              threatTypes: [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION",
              ],
              platformTypes: ["ANY_PLATFORM"],
              threatEntryTypes: ["URL"],
              threatEntries: urls.map((url) => ({ url })),
            },
          }),
        });
        if (!res.ok) throw new Error(`Safe Browsing answered ${res.status}`);
        const body = (await res.json()) as { matches?: { threat?: { url?: string } }[] };
        return new Set((body.matches ?? []).flatMap((m) => (m.threat?.url ? [m.threat.url] : [])));
      } catch (err) {
        // Fail open: the check still runs on our own data and the rules.
        onError(err);
        return new Set();
      }
    },
  };
}
