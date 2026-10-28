import Link from "next/link";
import type { ReactNode } from "react";
import type { Settings } from "@/lib/types";

export interface LegalSection {
  title: string;
  body: ReactNode;
}

export function LegalPage({
  badge,
  title,
  subtitle,
  updated,
  intro,
  sections,
  settings,
}: {
  badge: string;
  title: string;
  subtitle: string;
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
  settings: Settings;
}) {
  const wa = settings.whatsapp_phone.replace(/\D/g, "");

  return (
    <div className="container-page py-10">
      <header className="mx-auto mb-8 max-w-3xl text-center">
        <span className="badge bg-brand/12 text-brand-strong">{badge}</span>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>
        <p className="mt-3 text-xs font-semibold text-muted">সর্বশেষ আপডেট: {updated}</p>
      </header>

      <div className="mx-auto max-w-3xl space-y-4">
        <div className="card p-6 text-sm leading-relaxed text-muted">{intro}</div>

        {sections.map((section, index) => (
          <section key={section.title} className="card p-6">
            <h2 className="text-lg font-extrabold text-fg">
              {index + 1}. {section.title}
            </h2>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">{section.body}</div>
          </section>
        ))}

        <section className="card p-6">
          <h2 className="text-lg font-extrabold text-fg">যোগাযোগ / Contact</h2>
          <div className="mt-3 space-y-2 text-sm text-muted">
            <p>
              <strong className="text-fg">{settings.store_name}</strong> — {settings.address}
            </p>
            <p>
              Email:{" "}
              <a className="font-semibold text-brand-strong underline" href={`mailto:${settings.email}`}>
                {settings.email}
              </a>
            </p>
            <p>
              Phone:{" "}
              <a className="font-semibold text-brand-strong underline" href={`tel:${settings.phone}`}>
                {settings.phone}
              </a>
            </p>
            <p>
              WhatsApp:{" "}
              <a
                className="font-semibold text-brand-strong underline"
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {settings.whatsapp_phone}
              </a>
            </p>
          </div>
        </section>

        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-4 text-xs text-muted">
          <Link href="/" className="hover:text-brand-strong">
            হোম
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-brand-strong">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-brand-strong">
            Terms of Service
          </Link>
          <span>·</span>
          <Link href="/data-deletion" className="hover:text-brand-strong">
            Data Deletion
          </Link>
        </nav>
      </div>
    </div>
  );
}
