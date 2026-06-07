import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-destructive/10 p-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-foreground">Profile not found</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                This profile may be unpublished, renamed, or no longer available.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
