"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Loader2, X } from "lucide-react";

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

  const rejected = state.kind === "taken" || state.kind === "invalid";
  const fieldTone = state.kind === "available" ? " is-available" : rejected ? " is-rejected" : "";

  return (
    <div>
      <form
        className="claim-form"
        data-interactive="username-claim"
        onSubmit={(event) => {
          event.preventDefault();
          claim();
        }}
      >
        <div className={`claim-input${fieldTone}`}>
          <span dir="ltr">{appHost}/</span>

          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("landing.claimPlaceholder")}
            aria-label={t("landing.claimLabel")}
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            maxLength={30}
            data-testid="claim-username-input"
          />

          <span className="claim-state">
            {state.kind === "checking" ? (
              <Loader2 className="animate-spin" size={15} aria-hidden />
            ) : state.kind === "available" ? (
              <Check size={15} color="#16a34a" aria-hidden />
            ) : rejected ? (
              <X size={15} color="#c2410c" aria-hidden />
            ) : null}
          </span>
        </div>

        <button
          className="button"
          type="submit"
          disabled={state.kind !== "available"}
          data-testid="claim-username-submit"
        >
          {state.kind === "available"
            ? t("landing.claimIt", { name: state.username })
            : t("landing.claim")}
          <ArrowUpRight className="arrow" size={14} aria-hidden />
        </button>
      </form>

      <p
        className={`claim-message${
          state.kind === "available" ? " is-good" : rejected ? " is-bad" : ""
        }`}
        aria-live="polite"
      >
        {state.kind === "available"
          ? t("landing.claimAvailable")
          : state.kind === "taken"
            ? t("landing.claimTaken")
            : state.kind === "invalid"
              ? state.reason
              : t("landing.claimHint")}
      </p>
    </div>
  );
}
