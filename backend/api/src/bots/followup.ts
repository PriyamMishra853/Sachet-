import type { Channel, Lang } from "@sachet/core";
import type { Store } from "@sachet/db";
import type { Cache } from "../cache.js";
import { followupMessage, type BotReply } from "./conversation.js";

export type Sender = (userId: string, reply: BotReply) => Promise<void>;
export const FOLLOWUP_AFTER_HOURS = 20;

// "Did you pay?" the day after a risky check. The answer is how Sachet
// measures money protected. Runs on a timer in server.ts.
export async function runFollowups(deps: {
  store: Store;
  cache: Cache;
  senders: Partial<Record<Channel, Sender>>;
  now?: Date;
  log?: (msg: string, err?: unknown) => void;
}): Promise<number> {
  const { store, cache, senders, now = new Date(), log = () => {} } = deps;
  const due = await store.dueFollowups(
    new Date(now.getTime() - FOLLOWUP_AFTER_HOURS * 3600_000),
    100,
  );
  let sent = 0;
  for (const checkId of due) {
    // Mark first: if sending fails we skip this one rather than retry forever.
    await store.markFollowupSent(checkId);
    const pending = await cache.get(`fu:${checkId}`);
    if (!pending) continue; // web checks, or the 48-hour window passed
    const { channel, userId, lang } = JSON.parse(pending) as {
      channel: Channel;
      userId: string;
      lang: Lang;
    };
    const send = senders[channel];
    if (!send) continue;
    try {
      await send(userId, followupMessage(checkId, lang));
      await cache.del(`fu:${checkId}`);
      sent++;
    } catch (err) {
      log(`follow-up ${checkId} failed`, err);
    }
  }
  return sent;
}
