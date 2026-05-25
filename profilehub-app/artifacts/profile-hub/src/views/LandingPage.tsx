import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="text-2xl font-serif font-bold text-foreground">ProfileHub</div>
        <div className="space-x-4">
          <Button variant="ghost" asChild><Link href="/login">Log in</Link></Button>
          <Button asChild><Link href="/register">Get Started</Link></Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-3xl">
          <h1 className="text-6xl md:text-8xl font-serif font-medium leading-tight mb-8">
            The quiet confidence of a real portfolio.
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-xl">
            More than just links. Combine your projects, services, and identity into one beautiful, premium space that feels like you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="text-lg px-8" asChild>
              <Link href="/register">Start Building Free</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild>
              <Link href="/sara-al-hassan">View Demo Profile</Link>
            </Button>
          </div>
        </div>

        <div className="mt-32 aspect-video bg-muted rounded-2xl border flex items-center justify-center">
          <div className="text-muted-foreground">Product Preview Illustration</div>
        </div>
      </main>
    </div>
  );
}
