"use client";

import { useEffect, useState } from "react";
import { api, type Stats } from "../../lib/api";
import { useLang } from "./LangProvider";

// Indian digit grouping: 1,00,000 not 100,000.
const inr = new Intl.NumberFormat("en-IN");

// "1,240 checks · 87 scam reports · ₹4,50,000 kept from scammers".
// Hidden until the numbers arrive, and if the API can't be reached.
export function ImpactStats() {
  const { tr } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.stats().then(setStats, () => {});
  }, []);

  if (!stats || stats.checks === 0) return null;
  return (
    <p className="stats" aria-live="polite">
      <span>
        <strong>{inr.format(stats.checks)}</strong> {tr("statsChecks")}
      </span>
      <span>
        <strong>{inr.format(stats.reports)}</strong> {tr("statsReports")}
      </span>
      {stats.moneyProtectedInr > 0 && (
        <span>
          <strong>₹{inr.format(stats.moneyProtectedInr)}</strong> {tr("statsProtected")}
        </span>
      )}
    </p>
  );
}
