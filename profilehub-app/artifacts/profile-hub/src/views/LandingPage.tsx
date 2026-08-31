import Link from "next/link";
import { ArrowUpRight, FileText, Sparkles } from "lucide-react";

import { ClaimUsername } from "@/components/landing/ClaimUsername";
import { INTRO_SKIP_SCRIPT, IntroVeil } from "@/components/IntroVeil";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getAppUrl } from "@/lib/env";
import { getTranslations } from "@/lib/i18n/server";
import type { Translate } from "@/lib/i18n";

import "./landing.css";

const DEMO_USERNAME = "ahmadfaour";

/** Real figures from a real analysis run, not invented marketing numbers. */
const OVERALL_SCORE = 80;
const SKILLS_FOUND = 69;
const SECTIONS_RATED = 7;

const SECTION_SCORES = [
  { key: "landing.scoreContact", score: 92 },
  { key: "landing.scoreSummary", score: 78 },
  { key: "landing.scoreExperience", score: 85 },
  { key: "landing.scoreSkills", score: 88 },
  { key: "landing.scoreImpact", score: 71 },
] as const;

const CAPABILITIES = [
  { number: "01", title: "landing.rowLinksTitle", body: "landing.rowLinksBody" },
  { number: "02", title: "landing.rowWorkTitle", body: "landing.rowWorkBody" },
  { number: "03", title: "landing.rowKnowTitle", body: "landing.rowKnowBody" },
] as const;

/**
 * Landing page.
 *
 * Two decisions drive the layout. The claim field is the hero, because the
 * fastest way to get someone to start is to let them start - not to describe
 * the product for three sections first. And the CV reading gets the most room,
 * because it is the one thing here no other page builder does; a six-card
 * feature grid says everything and is read by nobody.
 *
 * Styling lives in landing.css rather than in utility classes. The page runs on
 * its own palette, scoped to .site-shell, so it does not drag the rest of the
 * application off the warm token set in index.css.
 */
export default async function LandingPage() {
  const { t } = await getTranslations();
  const appHost = new URL(getAppUrl()).host;

  return (
    <div className="site-shell">
      {/* Must run before the veil below paints, so a returning visitor never
          sees a frame of an intro they already watched. */}
      <script dangerouslySetInnerHTML={{ __html: INTRO_SKIP_SCRIPT }} />
      <IntroVeil label={t("intro.loading")} />

      <div className="ambient ambient-one" aria-hidden />
      <div className="ambient ambient-two" aria-hidden />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="site-header wrap">
        <Link href="/" className="wordmark">
          <HubMark />
          ProfileHub
        </Link>

        <nav className="header-nav" aria-label={t("landing.navLabel")}>
          <a href="#intelligence">{t("landing.navCv")}</a>
          <a href="#capabilities">{t("landing.navCapabilities")}</a>
        </nav>

        <div className="header-actions">
          <LanguageToggle />
          <Link href="/login" className="login">
            {t("auth.login")}
          </Link>
          <Link href="/register" className="button button-small">
            {t("landing.createProfile")}
            <ArrowUpRight className="arrow" size={14} aria-hidden />
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="hero wrap" id="top">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              {t("landing.eyebrow")}
            </p>

            <h1>
              {t("landing.h1a")}
              <br />
              <em>{t("landing.h1b")}</em>
            </h1>

            <p className="hero-lede">{t("landing.heroLead")}</p>

            <ClaimUsername appHost={appHost} />

            <Link href={`/${DEMO_USERNAME}`} className="profile-link">
              <ArrowUpRight className="arrow link-arrow" size={15} aria-hidden />
              {t("landing.seeLive")}
              <span className="link-note" dir="ltr">
                /{DEMO_USERNAME}
              </span>
            </Link>
          </div>

          <ProfileCard t={t} />
        </section>

        <section className="signal-strip wrap">
          <span>{t("landing.signalA")}</span>
          <span className="signal-line" />
          <span>{t("landing.signalB")}</span>
        </section>

        {/* ── CV reading: the differentiator, given the room ─────────────── */}
        <section className="intelligence wrap" id="intelligence">
          <div className="section-intro">
            <p className="eyebrow">
              <span className="eyebrow-dot warm" />
              {t("landing.cvEyebrow")}
            </p>

            <h2>
              {t("landing.cvTitle")}
              <br />
              <em>{t("landing.cvTitleEm")}</em>
            </h2>

            <p>{t("landing.cvLead")}</p>

            <p className="section-index" aria-hidden>
              02 <span>/ 04</span>
            </p>
          </div>

          <CvReadout t={t} />
        </section>

        {/* ── Three capabilities, stated once and large ──────────────────── */}
        <section className="capabilities wrap" id="capabilities">
          <div className="cap-heading">
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              {t("landing.capEyebrow")}
            </p>

            <h2>
              {t("landing.capTitle")}
              <br />
              <em>{t("landing.capTitleEm")}</em>
            </h2>
          </div>

          <ul className="cap-list">
            {CAPABILITIES.map((capability) => (
              <li className="cap-item" key={capability.number}>
                <span className="cap-number" aria-hidden>
                  {capability.number}
                </span>

                <div>
                  <h3>{t(capability.title)}</h3>
                  <p>{t(capability.body)}</p>
                </div>

                <ArrowUpRight className="arrow cap-arrow" size={20} aria-hidden />
              </li>
            ))}
          </ul>
        </section>

        {/* ── Close ──────────────────────────────────────────────────────── */}
        <section className="closing wrap">
          <p className="eyebrow">
            <span className="eyebrow-dot warm" />
            {t("landing.closeEyebrow")}
          </p>

          <h2>
            {t("landing.closeTitle")}
            <br />
            <em>{t("landing.closeTitleEm")}</em>
          </h2>

          <p>{t("landing.closeBody")}</p>

          <div className="closing-actions">
            <Link href="/register" className="button">
              {t("landing.createProfile")}
              <ArrowUpRight className="arrow" size={14} aria-hidden />
            </Link>

            <Link href={`/${DEMO_USERNAME}`} className="profile-link">
              <ArrowUpRight className="arrow link-arrow" size={15} aria-hidden />
              {t("landing.viewDemo")}
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer wrap">
        <Link href="/" className="wordmark">
          <HubMark />
          ProfileHub
        </Link>

        <p>{t("landing.footerTagline")}</p>

        <div className="footer-links">
          <Link href={`/${DEMO_USERNAME}`}>{t("landing.viewDemo")}</Link>
          <Link href="/register">{t("landing.createProfile")}</Link>
          <Link href="/login">{t("auth.login")}</Link>
          <Link href="/forgot-password">{t("auth.resetPassword")}</Link>
          <span>© {new Date().getFullYear()} ProfileHub</span>
        </div>
      </footer>
    </div>
  );
}

/** The ProfileHub mark, inline so the header costs no extra request. */
function HubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <path
        d="M12 12H4.72727C3.22104 12 2 10.779 2 9.27273V4.72727C2 3.22104 3.22104 2 4.72727 2H9.27273C10.779 2 12 3.22104 12 4.72727V12Z"
        fill="#2E9EFF"
      />
      <path
        d="M20 2C21.1046 2 22 2.89543 22 4V7C22 8.10457 21.1046 9 20 9H17C15.8954 9 15 8.10457 15 7V4C15 2.89543 15.8954 2 17 2H20Z"
        fill="#0C79D8"
      />
      <path
        d="M7 15C8.10457 15 9 15.8954 9 17V20C9 21.1046 8.10457 22 7 22H4C2.89543 22 2 21.1046 2 20V17C2 15.8954 2.89543 15 4 15H7Z"
        fill="#0C79D8"
      />
      <path
        d="M22 19.2727C22 20.779 20.779 22 19.2727 22H14.7273C13.221 22 12 20.779 12 19.2727V12H19.2727C20.779 12 22 13.221 22 14.7273V19.2727Z"
        fill="#68C4FF"
      />
    </svg>
  );
}

/**
 * The demo profile at the size a visitor actually sees it. A screenshot behind
 * a scrim is decoration; this is the product.
 */
function ProfileCard({ t }: { t: Translate }) {
  return (
    <div className="hero-visual">
      <div className="orbit orbit-a" aria-hidden />
      <div className="orbit orbit-b" aria-hidden />

      <p className="float-label label-top" aria-hidden>
        01 <span>{t("landing.labelIdentity")}</span>
      </p>
      <p className="float-label label-bottom" aria-hidden>
        02 <span>{t("landing.labelAnalytics")}</span>
      </p>

      <article className="profile-card">
        <div className="card-top">
          <span className="mini-brand">
            <HubMark />
            ProfileHub
          </span>
          <span className="status">
            <i aria-hidden />
            {t("landing.cardStatus")}
          </span>
        </div>

        <p className="avatar" aria-hidden>
          AF
        </p>

        <p className="card-kicker">{t("landing.cardKicker")}</p>

        <h2>
          Ahmad
          <br />
          <span>Faour</span>
        </h2>

        <p className="card-bio">{t("landing.cardBio")}</p>

        <div className="card-rule" />

        <div className="card-bottom">
          <span dir="ltr">profilehub.com/ahmad</span>
          <span className="circle-arrow">
            <ArrowUpRight className="arrow" size={13} aria-hidden />
          </span>
        </div>
      </article>
    </div>
  );
}

/** The CV analysis, shown with the numbers a real run produces. */
function CvReadout({ t }: { t: Translate }) {
  return (
    <div className="cv-interface">
      <div className="cv-head">
        <div className="cv-file">
          <FileText size={22} aria-hidden />
          <div>
            <strong dir="ltr">Ahmad_Faour_CV.pdf</strong>
            <small>{t("landing.cvFileMeta")}</small>
          </div>
        </div>

        <span className="scan-state">
          <i aria-hidden />
          {t("landing.cvScanComplete")}
        </span>
      </div>

      <div className="score-row">
        <div className="score-ring">
          <div>
            <strong>{OVERALL_SCORE}</strong>
            <span>{t("landing.cvScoreLabel")}</span>
          </div>
        </div>

        <div className="score-copy">
          <p className="overline">{t("landing.cvReadiness")}</p>
          <h3>{t("landing.cvReadinessTitle")}</h3>
          <p>{t("landing.cvSectionsMapped")}</p>
        </div>
      </div>

      <ul className="score-list">
        {SECTION_SCORES.map((section) => (
          <li className="score-item" key={section.key}>
            <div>
              <span>{t(section.key)}</span>
              <b>{section.score}</b>
            </div>

            <span
              className="progress-track"
              role="progressbar"
              aria-label={t(section.key)}
              aria-valuenow={section.score}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className="progress-fill" style={{ width: `${section.score}%` }} />
            </span>
          </li>
        ))}
      </ul>

      <p className="found-row">
        <span>
          <b>{SKILLS_FOUND}</b> {t("landing.cvSkillsFound")}
        </span>
        <span>
          <b>{SECTIONS_RATED}</b> {t("landing.cvSectionsRated")}
        </span>
        <Sparkles className="spark" size={18} aria-hidden />
      </p>
    </div>
  );
}
