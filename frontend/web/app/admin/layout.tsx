import type { Metadata } from "next";
import type { ReactNode } from "react";

// The operator page: not linked from the site and kept out of search engines.
// The API checks the token on every call; this page only holds it in memory.
export const metadata: Metadata = {
  title: "Sachet — Reviews",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
