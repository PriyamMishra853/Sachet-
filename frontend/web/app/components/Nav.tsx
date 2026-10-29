"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangToggle, useLang } from "./LangProvider";

export function Header() {
  const { tr } = useLang();
  const path = usePathname();
  const links = [
    { href: "/", label: tr("navCheck") },
    { href: "/report", label: tr("navReport") },
    { href: "/privacy", label: tr("navPrivacy") },
    { href: "/about", label: tr("navAbout") },
  ];
  return (
    <header className="site-header">
      <div className="bar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>
            !
          </span>
          Sachet
        </Link>
        <LangToggle />
      </div>
      <nav aria-label="Main">
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Footer() {
  const { tr } = useLang();
  return (
    <footer className="site-footer">
      <a href="tel:1930" className="helpline">
        📞 {tr("lostMoney")}
      </a>
      <p className="muted">Sachet · {tr("tagline")}</p>
    </footer>
  );
}
