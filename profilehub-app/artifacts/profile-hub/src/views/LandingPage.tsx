import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileUp,
  Link2,
  Sparkles,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClaimUsername } from "@/components/landing/ClaimUsername";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getAppUrl } from "@/lib/env";
import { getTranslations } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";

const DEMO_USERNAME = "ahmadfaour";

/**
 * Landing page.
 *
 * Two decisions drive the layout. The claim field is the hero, because the
 * fastest way to get someone to start is to let them start - not to describe
 * the product for three sections first. And the CV moment gets the most space,
 * because it is the one thing here that no other page builder does; a
 * six-card feature grid says everything and is read by nobody.
 *
 * The product is shown at full size rather than behind a scrim. A screenshot at
 * 40% opacity is decoration, not evidence.
 */
export default async function LandingPage() {
  const { t } = await getTranslations();
  const appHost = new URL(getAppUrl()).host;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-3 md:px-8">
          <Link href="/" className="font-serif text-lg font-bold sm:text-xl">
            ProfileHub
          </Link>

          <div className="flex min-w-0 items-center gap-1">
            <LanguageToggle />

            {/* Below sm the row has space for one action; the primary one wins,
                and Log in stays reachable from the closing section. */}
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/login">{t("auth.login")}</Link>
            </Button>

            <Button size="sm" className="whitespace-nowrap" asChild>
              <Link href="/register">{t("landing.createProfile")}</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero: the action, not a description ──────────────────────── */}
        <section className="relative overflow-hidden border-b bg-neutral-950 text-neutral-50 dark:bg-neutral-950">
          {/* Texture only - no photograph to load, and it survives any viewport. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 12%, #38bdf8 0, transparent 42%), radial-gradient(circle at 82% 78%, #a78bfa 0, transparent 46%)",
            }}
          />

          <div className="relative mx-auto grid max-w-6xl gap-14 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {t("landing.eyebrow")}
              </p>

              <h1 className="mt-6 font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                {t("landing.h1a")}
                <br />
                <span className="text-sky-400">{t("landing.h1b")}</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-300">
                {t("landing.heroLead")}
              </p>

              <div className="mt-9">
                <ClaimUsername appHost={appHost} />
              </div>

              <Link
                href={`/${DEMO_USERNAME}`}
                className="mt-6 inline-flex items-center gap-2 text-sm text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
              >
                {t("landing.seeLive")}
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
              </Link>
            </div>

            {/* The product, unobscured and at readable size. */}
            <ProfileMock t={t} />
          </div>
        </section>

        {/* ── The differentiator, given the room it deserves ───────────── */}
        <section className="border-b px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                {t("landing.cvEyebrow")}
              </p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
                {t("landing.cvTitle")}
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                {t("landing.cvLead")}
              </p>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              <CvStep
                icon={<Upload className="h-5 w-5" aria-hidden />}
                step="01"
                title={t("landing.cvStep1")}
                body={t("landing.cvStep1Body")}
              />
              <CvStep
                icon={<FileUp className="h-5 w-5" aria-hidden />}
                step="02"
                title={t("landing.cvStep2")}
                body={t("landing.cvStep2Body")}
              />
              <CvStep
                icon={<BarChart3 className="h-5 w-5" aria-hidden />}
                step="03"
                title={t("landing.cvStep3")}
                body={t("landing.cvStep3Body")}
                highlight
              />
            </div>

            <ScoreReadout t={t} />
          </div>
        </section>

        {/* ── Three capabilities, stated once and large ────────────────── */}
        <section className="border-b bg-muted/30 px-5 py-20 md:px-8">
          <div className="mx-auto max-w-6xl space-y-14">
            <CapabilityRow
              icon={<Link2 className="h-5 w-5" aria-hidden />}
              titleKey="landing.rowLinksTitle"
              bodyKey="landing.rowLinksBody"
              t={t}
            />
            <CapabilityRow
              icon={<Sparkles className="h-5 w-5" aria-hidden />}
              titleKey="landing.rowWorkTitle"
              bodyKey="landing.rowWorkBody"
              t={t}
            />
            <CapabilityRow
              icon={<BarChart3 className="h-5 w-5" aria-hidden />}
              titleKey="landing.rowKnowTitle"
              bodyKey="landing.rowKnowBody"
              t={t}
            />
          </div>
        </section>

        {/* ── Close ────────────────────────────────────────────────────── */}
        <section className="px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-4xl leading-tight md:text-5xl">
              {t("landing.closeTitle")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("landing.closeBody")}</p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/register">
                  {t("landing.createProfile")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={`/${DEMO_USERNAME}`}>{t("landing.viewDemo")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-5 py-12 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <p className="font-serif text-lg font-bold">ProfileHub</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("landing.footerTagline")}</p>
          </div>

          <div className="flex gap-14 text-sm">
            <div>
              <p className="font-medium">{t("landing.footerProduct")}</p>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li>
                  <Link href={`/${DEMO_USERNAME}`} className="hover:text-foreground hover:underline">
                    {t("landing.viewDemo")}
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-foreground hover:underline">
                    {t("landing.createProfile")}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-medium">{t("landing.footerAccount")}</p>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li>
                  <Link href="/login" className="hover:text-foreground hover:underline">
                    {t("auth.login")}
                  </Link>
                </li>
                <li>
                  <Link href="/forgot-password" className="hover:text-foreground hover:underline">
                    {t("auth.resetPassword")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-6xl text-xs text-muted-foreground">
          © {new Date().getFullYear()} ProfileHub
        </p>
      </footer>
    </div>
  );
}

/** A profile card at the size a visitor actually sees, not a shrunken mockup. */
function ProfileMock({ t }: { t: (key: MessageKey) => string }) {
  const skills = ["Python", "PyTorch", "LangChain", "Docker", "FastAPI"];

  return (
    <div className="relative">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-sky-500/15 font-serif text-2xl text-sky-300">
            AF
          </div>
          <div className="min-w-0">
            <p className="truncate font-serif text-xl text-neutral-50">Ahmad Faour</p>
            <p className="truncate text-sm text-neutral-400">Senior AI Engineer</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-300"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          {["Book a consultation", "View portfolio", "Download résumé"].map((label) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-200"
            >
              <span>{label}</span>
              <ArrowRight className="h-4 w-4 text-neutral-500 rtl:rotate-180" aria-hidden />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-neutral-400">{t("landing.proofLead")}</p>
    </div>
  );
}

function CvStep({
  icon,
  step,
  title,
  body,
  highlight = false,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`@container rounded-xl border p-6 ${
        highlight ? "border-primary/40 bg-primary/5" : "bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-foreground">
          {icon}
        </span>
        <span className="font-serif text-3xl text-muted-foreground/40">{step}</span>
      </div>

      <h3 className="mt-5 text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

/** Real numbers from a real analysis rather than invented marketing figures. */
function ScoreReadout({ t }: { t: (key: MessageKey) => string }) {
  const sections = [
    { key: "contact", score: 92 },
    { key: "summary", score: 78 },
    { key: "experience", score: 85 },
    { key: "skills", score: 88 },
    { key: "impact", score: 71 },
  ];

  return (
    <div className="mt-6 grid gap-4 rounded-xl border bg-card p-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-6xl leading-none">80</span>
        <span className="text-sm text-muted-foreground">
          {t("landing.cvScoreLabel")}
          <br />
          <span className="text-xs">69 {t("landing.cvSkillsFound")}</span>
        </span>
      </div>

      <ul className="space-y-2">
        {sections.map((section) => (
          <li key={section.key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs capitalize text-muted-foreground">
              {section.key}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${section.score}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-end text-xs tabular-nums text-muted-foreground">
              {section.score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CapabilityRow({
  icon,
  titleKey,
  bodyKey,
  t,
}: {
  icon: React.ReactNode;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  t: (key: MessageKey) => string;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[auto_1fr] md:gap-10">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border bg-background text-primary">
        {icon}
      </span>

      <div className="max-w-3xl">
        <h3 className="font-serif text-3xl leading-tight md:text-4xl">{t(titleKey)}</h3>
        <p className="mt-3 text-lg leading-8 text-muted-foreground">{t(bodyKey)}</p>
      </div>
    </div>
  );
}
