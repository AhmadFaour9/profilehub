"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/client";

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available"; username: string }
  | { kind: "taken"; username: string }
  | { kind: "invalid"; reason: string };

/**
 * The landing page's primary action: type a name, see instantly whether it is
 * free, and go straight to signup with it.
 *
 * A visitor decides in seconds instead of reading three sections first, and the
 * name they picked survives into registration through the query string rather
 * than being typed twice.
 */
export function ClaimUsername({ appHost }: { appHost: string }) {
  const { t } = useLocale();
  const router = useRouter();

  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const latest = useRef(0);

  useEffect(() => {
    const candidate = value.trim().toLowerCase();

    if (!candidate) {
      setState({ kind: "idle" });
      return;
    }

    setState({ kind: "checking" });

    // Debounced: one request per pause, not one per keystroke.
    const timer = setTimeout(async () => {
      const ticket = ++latest.current;

      try {
        const response = await fetch(
          `/api/username/available?username=${encodeURIComponent(candidate)}`
        );
        const body = await response.json();

        // A slower earlier request must not overwrite a newer answer.
        if (ticket !== latest.current) return;

        if (!response.ok) {
          setState({ kind: "idle" });
          return;
        }
        if (!body.valid) {
          setState({ kind: "invalid", reason: body.reason ?? "" });
          return;
        }
        setState(
          body.available
            ? { kind: "available", username: body.username }
            : { kind: "taken", username: body.username }
        );
      } catch {
        if (ticket === latest.current) setState({ kind: "idle" });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [value]);

  const claim = () => {
    if (state.kind !== "available") return;
    router.push(`/register?username=${encodeURIComponent(state.username)}`);
  };

  return (
    <div className="w-full max-w-xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          claim();
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div
          className={`flex flex-1 items-center gap-1 rounded-xl border-2 bg-background/80 px-4 py-3 backdrop-blur transition-colors ${
            state.kind === "available"
              ? "border-emerald-500/60"
              : state.kind === "taken" || state.kind === "invalid"
                ? "border-destructive/50"
                : "border-border focus-within:border-primary/60"
          }`}
        >
          <span className="shrink-0 select-none text-sm text-muted-foreground" dir="ltr">
            {appHost}/
          </span>

          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("landing.claimPlaceholder")}
            aria-label={t("landing.claimLabel")}
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            maxLength={30}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
            data-testid="claim-username-input"
          />

          <span className="w-5 shrink-0">
            {state.kind === "checking" ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            ) : state.kind === "available" ? (
              <Check className="h-4 w-4 text-emerald-600" aria-hidden />
            ) : state.kind === "taken" || state.kind === "invalid" ? (
              <X className="h-4 w-4 text-destructive" aria-hidden />
            ) : null}
          </span>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={state.kind !== "available"}
          className="gap-2 shrink-0"
          data-testid="claim-username-submit"
        >
          {state.kind === "available"
            ? t("landing.claimIt", { name: state.username })
            : t("landing.claim")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Button>
      </form>

      <p className="mt-2 min-h-5 text-sm" aria-live="polite">
        {state.kind === "available" ? (
          <span className="text-emerald-600">{t("landing.claimAvailable")}</span>
        ) : state.kind === "taken" ? (
          <span className="text-destructive">{t("landing.claimTaken")}</span>
        ) : state.kind === "invalid" ? (
          <span className="text-destructive">{state.reason}</span>
        ) : (
          <span className="text-muted-foreground">{t("landing.claimHint")}</span>
        )}
      </p>
    </div>
  );
}
