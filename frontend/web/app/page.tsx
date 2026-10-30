"use client";

import { SCAM_TYPE_HINTS, SCAM_TYPE_NAMES } from "../lib/i18n";
import { CheckForm } from "./components/CheckForm";
import { Check } from "./components/Icons";
import { ImpactStats } from "./components/ImpactStats";
import { InstallButton } from "./components/InstallButton";
import { useLang } from "./components/LangProvider";

export default function HomePage() {
  const { lang, tr } = useLang();
  const steps = [
    { title: tr("how1Title"), body: tr("how1") },
    { title: tr("how2Title"), body: tr("how2") },
    { title: tr("how3Title"), body: tr("how3") },
  ];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <p className="eyebrow">{tr("heroEyebrow")}</p>
            <h1>{tr("heroTitle")}</h1>
            <p className="lead">{tr("heroLead")}</p>
          </div>
          <div className="hero-form">
            <CheckForm />
          </div>
          <ul className="trust-list">
            {(["trustNever", "trustNotKept", "trustPeople"] as const).map((k) => (
              <li key={k}>
                <span className="trust-icon">
                  <Check size={16} />
                </span>
                {tr(k)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">{tr("howTitle")}</h2>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="step-number">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <h2 className="section-title">{tr("scamsTitle")}</h2>
          <p className="section-lead">{tr("scamsLead")}</p>
          <ul className="scam-grid">
            {Object.entries(SCAM_TYPE_NAMES).map(([id, name]) => (
              <li key={id}>
                <h3>{name[lang]}</h3>
                <p>{SCAM_TYPE_HINTS[id]?.[lang]}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <ImpactStats />
          <InstallButton />
        </div>
      </section>
    </>
  );
}
