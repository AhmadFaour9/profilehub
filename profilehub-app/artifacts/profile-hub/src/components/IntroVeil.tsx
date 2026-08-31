"use client";

import { useEffect, useState } from "react";

import "./intro-veil.css";

export const INTRO_SESSION_KEY = "ph-intro-seen";

/**
 * Inline, pre-paint check for "already seen this session".
 *
 * It has to run before the veil paints, otherwise someone returning from
 * /login gets a flash of the intro they already sat through. Rendered as a
 * blocking script rather than an effect for that reason - an effect runs after
 * the first paint, which is one paint too late.
 */
export const INTRO_SKIP_SCRIPT = `try{if(sessionStorage.getItem(${JSON.stringify(
  INTRO_SESSION_KEY
)})==="1")document.documentElement.dataset.intro="seen"}catch(e){}`;

/** How long the veil stays up at minimum, so the animation is not a stutter. */
const MINIMUM_MS = 1250;
const MINIMUM_REDUCED_MS = 220;

/** Exit transition, kept in step with intro-veil.css. */
const EXIT_MS = 620;
const EXIT_REDUCED_MS = 160;

/**
 * Nothing may leave a visitor stranded behind the veil. If a font or an image
 * never resolves, this fires anyway and the page is revealed regardless.
 */
const HARD_CAP_MS = 3400;

type Phase = "in" | "out" | "gone";

/**
 * The loading intro: the ProfileHub mark assembles itself while the page
 * behind it finishes loading, then lifts away.
 *
 * Shown once per session. An intro is a first impression, and a first
 * impression replayed on every navigation is just a delay.
 *
 * The markup is server-rendered and the animation is pure CSS, so it is
 * already playing during the window this exists to cover - before the
 * JavaScript bundle has arrived. React's only job here is ending it.
 */
export function IntroVeil({ label }: { label: string }) {
  const [phase, setPhase] = useState<Phase>("in");

  useEffect(() => {
    // The pre-paint script already hid it; drop the node and do nothing else.
    if (document.documentElement.dataset.intro === "seen") {
      setPhase("gone");
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimum = reduced ? MINIMUM_REDUCED_MS : MINIMUM_MS;
    const exit = reduced ? EXIT_REDUCED_MS : EXIT_MS;
    const startedAt = performance.now();

    let settled = false;
    const timers: number[] = [];

    const finish = () => {
      if (settled) return;
      settled = true;

      const remaining = Math.max(0, minimum - (performance.now() - startedAt));

      timers.push(
        window.setTimeout(() => {
          setPhase("out");
          // Written on the way out, not on arrival: a reload part-way through
          // should still show the intro it interrupted.
          try {
            sessionStorage.setItem(INTRO_SESSION_KEY, "1");
          } catch {
            // Private browsing or blocked storage. The intro simply replays.
          }
          document.documentElement.dataset.intro = "seen";
          timers.push(window.setTimeout(() => setPhase("gone"), exit));
        }, remaining)
      );
    };

    if (document.readyState === "complete") {
      finish();
    } else {
      window.addEventListener("load", finish, { once: true });
    }
    timers.push(window.setTimeout(finish, HARD_CAP_MS));

    return () => {
      window.removeEventListener("load", finish);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      className={`intro-veil${phase === "out" ? " is-out" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid="intro-veil"
    >
      <div className="intro-stage">
        <span className="intro-mark" aria-hidden>
          <i className="intro-tile tile-a" />
          <i className="intro-tile tile-b" />
          <i className="intro-tile tile-c" />
          <i className="intro-tile tile-d" />
        </span>

        <p className="intro-word" aria-hidden>
          ProfileHub
        </p>

        <span className="intro-rail" aria-hidden>
          <i />
        </span>
      </div>
    </div>
  );
}
