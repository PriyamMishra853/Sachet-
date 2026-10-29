import type { MetadataRoute } from "next";

// Web app manifest: makes Sachet installable ("Add to Home screen") and,
// through share_target, puts it in Android's Share menu. Long-press a
// message in WhatsApp or SMS -> Share -> Sachet opens /share with the text.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sachet — Is this a scam?",
    short_name: "Sachet",
    description:
      "Check a message, phone number, UPI ID or link for scams before you pay. Hindi and English.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f5",
    theme_color: "#0f5132",
    lang: "en-IN",
    categories: ["security", "utilities", "finance"],
    icons: [
      { src: "/pwa-icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // GET keeps it simple: the shared text arrives as URL parameters, so no
    // service worker is needed to receive it.
    share_target: {
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
    shortcuts: [{ name: "Report a scam", short_name: "Report", url: "/report" }],
  } as MetadataRoute.Manifest;
}
