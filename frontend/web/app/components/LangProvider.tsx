"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { t, type Lang } from "../../lib/i18n";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sachet-lang");
      if (saved === "en" || saved === "hi") setLangState(saved);
    } catch {
      // Private mode etc.: stay in English.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("sachet-lang", l);
    } catch {
      // Not saved, but still switched for this visit.
    }
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const { lang, setLang } = useContext(LangContext);
  const tr = (key: keyof typeof t) => t[key][lang];
  return { lang, setLang, tr };
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      className="lang-toggle"
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      aria-label={lang === "en" ? "हिंदी में देखें" : "View in English"}
    >
      {lang === "en" ? "हिंदी" : "English"}
    </button>
  );
}
