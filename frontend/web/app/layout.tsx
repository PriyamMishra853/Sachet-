import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorkerRegistration } from "./components/InstallButton";
import { LangProvider } from "./components/LangProvider";
import { Footer, Header } from "./components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sachet — Is this a scam?",
  description:
    "Check a phone number, UPI ID, link or message for scams in about a second. Hindi and English.",
  applicationName: "Sachet",
  // iPhone home-screen icon and full-screen mode (iOS ignores most of the manifest).
  appleWebApp: { capable: true, title: "Sachet", statusBarStyle: "default" },
  icons: { icon: "/pwa-icons/192", apple: "/pwa-icons/180" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f5132",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LangProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </LangProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
