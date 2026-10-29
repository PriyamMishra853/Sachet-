"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";

// Chrome's install event is not in TypeScript's DOM types yet.
type InstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

// Android Chrome: a button that opens the install prompt.
// iPhone Safari has no prompt, so we show the manual steps instead.
export function InstallButton() {
  const { tr } = useLang();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep it for our button instead of Chrome's mini-bar
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  if (prompt) {
    return (
      <section className="card install">
        <p>{tr("installWhy")}</p>
        <button
          className="secondary"
          onClick={async () => {
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === "accepted") setInstalled(true);
            setPrompt(null); // the event can only be used once
          }}
        >
          {tr("installButton")}
        </button>
      </section>
    );
  }

  if (isIos) {
    return (
      <section className="card install">
        <p>{tr("installIos")}</p>
      </section>
    );
  }

  return null;
}

// Registers the offline service worker. Only in production builds: in
// development it would fight with hot reloading.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
