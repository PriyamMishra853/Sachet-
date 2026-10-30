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
  const items = [
    { value: inr.format(stats.checks), label: tr("statsChecks") },
    { value: inr.format(stats.reports), label: tr("statsReports") },
    ...(stats.moneyProtectedInr > 0
      ? [{ value: `₹${inr.format(stats.moneyProtectedInr)}`, label: tr("statsProtected") }]
      : []),
  ];
  return (
    <div className="stats" aria-live="polite">
      <h2 className="section-title">{tr("statsTitle")}</h2>
      <dl className="stats-row">
        {items.map((i) => (
          <div key={i.label}>
            <dt>{i.label}</dt>
            <dd>{i.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
