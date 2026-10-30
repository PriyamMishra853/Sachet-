"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, Phone } from "./Icons";
import { LangToggle, useLang } from "./LangProvider";

function useLinks() {
  const { tr } = useLang();
  return [
    { href: "/", label: tr("navCheck") },
    { href: "/report", label: tr("navReport") },
    { href: "/privacy", label: tr("navPrivacy") },
    { href: "/about", label: tr("navAbout") },
  ];
}

export function Header() {
  const { tr } = useLang();
  const path = usePathname();
  const links = useLinks();
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="Sachet home">
          <Logo />
          <span className="brand-name">Sachet</span>
          <span className="brand-tagline">{tr("brandTagline")}</span>
        </Link>
        <nav aria-label="Main" className="main-nav">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <LangToggle />
      </div>
    </header>
  );
}

export function Footer() {
  const { tr } = useLang();
  const links = useLinks();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="helpline-band">
          <div>
            <p className="helpline-title">{tr("helpTitle")}</p>
            <p className="helpline-body">{tr("helpBody")}</p>
          </div>
          <div className="helpline-actions">
            <a href="tel:1930" className="button button-danger">
              <Phone size={18} /> {tr("call1930")}
            </a>
            <a
              href="https://cybercrime.gov.in"
              className="button button-plain"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr("reportOnline")}
            </a>
          </div>
        </div>

        <div className="footer-grid">
          <div>
            <p className="footer-brand">
              <Logo size={22} /> Sachet
            </p>
            <p className="muted small">{tr("footerAbout")}</p>
            <p className="muted small">{tr("trustNever")}</p>
          </div>
          <nav aria-label="Footer" className="footer-nav">
            {links.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
