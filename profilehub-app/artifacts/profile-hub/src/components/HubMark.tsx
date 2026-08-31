/**
 * The ProfileHub mark.
 *
 * Two files, not one. The mark's navy scores 1.2:1 against the dark theme's
 * background - it would simply disappear - so a light-toned variant ships
 * alongside it, keeping the accent node that the shape is built around.
 *
 * The swap is CSS rather than state: both are in the markup and the theme
 * hides one, so the right mark is in the very first paint instead of arriving
 * after hydration.
 */

type Surface = "auto" | "dark";

export function HubMark({
  className = "h-6 w-6",
  surface = "auto",
}: {
  className?: string;
  /** "dark" for a surface that is dark in both themes, like the demo card. */
  surface?: Surface;
}) {
  // Plain <img>: a fixed-size mark of a few kilobytes, where the optimizer
  // would add a request and change nothing.
  const light = (
    <img
      src="/logo.png"
      alt=""
      aria-hidden
      draggable={false}
      className={`${className} object-contain ${surface === "dark" ? "hidden" : "dark:hidden"}`}
    />
  );

  const onDark = (
    <img
      src="/logo-dark.png"
      alt=""
      aria-hidden
      draggable={false}
      className={`${className} object-contain ${surface === "dark" ? "" : "hidden dark:block"}`}
    />
  );

  return (
    <>
      {light}
      {onDark}
    </>
  );
}

/**
 * Mark plus name. The auth pages and the dashboard each had a different idea
 * of what the brand looked like - or none at all.
 *
 * Two lockups. In a row of chrome - a header, a sidebar - the name sits beside
 * the mark and takes its size from the surrounding text. Where the brand is
 * the only thing on the line, above a sign-in card, it stacks: the mark reads
 * as a mark at that size instead of as an ornament in front of a word, and the
 * name drops to a quiet caption. It is the same lockup the intro veil uses, so
 * the page someone lands on after the intro repeats what they just watched.
 */
export function Wordmark({
  className = "",
  surface = "auto",
  stacked = false,
}: {
  className?: string;
  surface?: Surface;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <span className={`inline-flex flex-col items-center gap-2 ${className}`}>
        <HubMark className="h-11 w-11" surface={surface} />
        <span className="text-[13px] font-medium tracking-[0.09em]">ProfileHub</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 font-medium tracking-tight ${className}`}>
      <HubMark className="h-[1.6em] w-[1.6em] shrink-0" surface={surface} />
      ProfileHub
    </span>
  );
}
