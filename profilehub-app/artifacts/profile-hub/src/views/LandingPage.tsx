import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Github,
  Link2,
  QrCode,
  Sparkles,
  SquareStack,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";

const features: { titleKey: MessageKey; descKey: MessageKey; icon: typeof Link2 }[] = [
  { titleKey: "landing.f.smartLinks", descKey: "landing.f.smartLinksDesc", icon: Link2 },
  { titleKey: "landing.f.projects", descKey: "landing.f.projectsDesc", icon: BriefcaseBusiness },
  { titleKey: "landing.f.services", descKey: "landing.f.servicesDesc", icon: SquareStack },
  { titleKey: "landing.f.analytics", descKey: "landing.f.analyticsDesc", icon: BarChart3 },
  { titleKey: "landing.f.github", descKey: "landing.f.githubDesc", icon: Github },
  { titleKey: "landing.f.qr", descKey: "landing.f.qrDesc", icon: QrCode },
];

const smartLinkExamples = ["Book a Consultation", "Resume PDF", "Portfolio", "Calendly", "Product Demo"];

export default async function LandingPage() {
  const { t } = await getTranslations();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative min-h-[92vh] overflow-hidden border-b">
        <Image
          src="/landing-product-preview.png"
          alt="ProfileHub dashboard and public profile preview"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-background/70" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="text-2xl font-serif font-bold text-foreground">
            ProfileHub
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">{t("auth.login")}</Link>
            </Button>
            <Button asChild>
              <Link href="/register">{t("landing.createProfile")}</Link>
            </Button>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-end px-5 pb-20 pt-28 md:min-h-[calc(92vh-84px)] md:px-8 md:pb-24">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background/75 px-3 py-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("landing.badge")}
            </div>
            <h1 className="max-w-4xl text-5xl font-medium leading-tight tracking-normal md:text-7xl">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
              {t("landing.heroSubtitle")}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/register">
                  {t("landing.createProfile")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/AhmadFaour1">{t("landing.viewDemo")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section id="features" className="border-b bg-background px-5 py-20 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-serif md:text-5xl">{t("landing.featuresTitle")}</h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                {t("landing.featuresSubtitle")}
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.titleKey} className="rounded-lg border bg-card p-6">
                  <feature.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-5 text-xl font-semibold">{t(feature.titleKey)}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">{t(feature.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b px-5 py-20 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t("landing.f.smartLinks")}</p>
              <h2 className="mt-3 text-4xl font-serif md:text-5xl">{t("landing.smartLinksTitle")}</h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                {t("landing.smartLinksBody")}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {smartLinkExamples.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-5">
              <div className="rounded-lg bg-primary p-5 text-primary-foreground">
                <div className="flex items-center justify-between border-b border-primary-foreground/20 pb-4">
                  <div>
                    <p className="text-sm opacity-75">{t("landing.publicProfile")}</p>
                    <h3 className="mt-1 text-2xl font-semibold">Ahmad Faour</h3>
                  </div>
                  <QrCode className="h-8 w-8" />
                </div>
                <div className="mt-5 space-y-3">
                  {["Portfolio", "GitHub import", "Book a consultation", "Latest project"].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-lg bg-background px-4 py-3 text-foreground">
                      <span className="font-medium">{item}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30 px-5 py-20 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t("landing.f.projects")}</p>
              <h2 className="mt-3 text-3xl font-serif">{t("landing.projectsTitle")}</h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                {t("landing.projectsBody")}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t("landing.f.services")}</p>
              <h2 className="mt-3 text-3xl font-serif">{t("landing.servicesTitle")}</h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                {t("landing.servicesBody")}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t("landing.f.analytics")}</p>
              <h2 className="mt-3 text-3xl font-serif">{t("landing.analyticsTitle")}</h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                {t("landing.analyticsBody")}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-lg border bg-card p-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-serif md:text-4xl">{t("landing.ctaTitle")}</h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                {t("landing.ctaBody")}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">{t("landing.createProfile")}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/AhmadFaour1">View demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
