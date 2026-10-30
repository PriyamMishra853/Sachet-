"use client";

import { CheckForm } from "./components/CheckForm";
import { ImpactStats } from "./components/ImpactStats";
import { InstallButton } from "./components/InstallButton";
import { useLang } from "./components/LangProvider";

export default function CheckPage() {
  const { tr } = useLang();
  return (
    <>
      <h1>{tr("checkTitle")}</h1>
      <p className="lead">{tr("checkIntro")}</p>
      <CheckForm />
      <ImpactStats />
      <InstallButton />
    </>
  );
}
