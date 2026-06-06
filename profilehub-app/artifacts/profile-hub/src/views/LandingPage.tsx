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

const features = [
  {
    title: "Smart Links",
    description: "Publish action links for booking, resumes, portfolios, demos, newsletters, and downloads.",
    icon: Link2,
  },
  {
    title: "Projects",
    description: "Show selected work with screenshots, tags, GitHub repositories, and live project URLs.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Services",
    description: "Package offers with clear pricing, duration, call-to-action links, and active visibility.",
    icon: SquareStack,
  },
  {
    title: "Analytics",
    description: "Track profile views, link clicks, top-performing links, and conversion signals.",
    icon: BarChart3,
  },
  {
    title: "GitHub import",
    description: "Turn repositories into portfolio projects without rebuilding every project card by hand.",
    icon: Github,
  },
  {
    title: "QR code",
    description: "Share a scannable profile URL on resumes, slides, business cards, and social posts.",
    icon: QrCode,
  },
];

const smartLinkExamples = ["Book a Consultation", "Resume PDF", "Portfolio", "Calendly", "Product Demo"];

export default function LandingPage() {
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
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Create your profile</Link>
            </Button>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-end px-5 pb-20 pt-28 md:min-h-[calc(92vh-84px)] md:px-8 md:pb-24">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background/75 px-3 py-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              One profile for links, work, services, analytics, and sharing.
            </div>
            <h1 className="max-w-4xl text-5xl font-medium leading-tight tracking-normal md:text-7xl">
              Turn your professional presence into one polished public profile.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
              ProfileHub helps founders, engineers, creators, consultants, and teams publish a credible profile that converts attention into action.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/register">
                  Create your profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/AhmadFaour1">View demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section id="features" className="border-b bg-background px-5 py-20 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-serif md:text-5xl">Everything your profile needs to do real work.</h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Keep identity, links, projects, services, analytics, GitHub import, and QR sharing in one clean publishing workflow.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-lg border bg-card p-6">
                  <feature.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b px-5 py-20 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Smart Links</p>
              <h2 className="mt-3 text-4xl font-serif md:text-5xl">Make every important action obvious.</h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Smart Links are the primary public link system for high-intent actions like booking calls, sending resumes, opening case studies, and downloading files.
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
                    <p className="text-sm opacity-75">Public profile</p>
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
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Projects</p>
              <h2 className="mt-3 text-3xl font-serif">A portfolio that stays current.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Import repositories, add screenshots, and publish selected work without mixing it into simple link lists.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Services</p>
              <h2 className="mt-3 text-3xl font-serif">Sell what you do clearly.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Package offers with descriptions, price labels, duration, and direct CTAs for qualified inquiries.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Analytics</p>
              <h2 className="mt-3 text-3xl font-serif">Know what gets attention.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Measure views, clicks, and top-performing links so your public profile improves over time.
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-lg border bg-card p-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-serif md:text-4xl">Ready to publish a profile people can act on?</h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                Create your profile, connect your work, and share one professional URL everywhere.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">Create your profile</Link>
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
