"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { combineShared } from "../../lib/share";
import { CheckForm } from "../components/CheckForm";
import { useLang } from "../components/LangProvider";

// Android opens this page when someone picks Sachet in the Share menu.
// The shared message arrives in the URL and is checked straight away.
function SharedCheck() {
  const params = useSearchParams();
  // Read once: the URL is cleaned below and must not empty the form.
  const [text] = useState(() =>
    combineShared({
      title: params.get("title"),
      text: params.get("text"),
      url: params.get("url"),
    }),
  );
  // The message can hold personal details; take it out of the address bar
  // and browser history as soon as it has been read.
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", "/share");
  }, []);
  return <CheckForm initialText={text} autoRun={Boolean(text)} />;
}

export default function SharePage() {
  const { tr } = useLang();
  return (
    <div className="page">
      <h1>{tr("checkTitle")}</h1>
      {/* useSearchParams needs a Suspense boundary so the page can be prerendered. */}
      <Suspense>
        <SharedCheck />
      </Suspense>
    </div>
  );
}
