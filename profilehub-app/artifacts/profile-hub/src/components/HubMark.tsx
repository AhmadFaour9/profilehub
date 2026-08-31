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
 * Mark plus name, sized from the surrounding text. The auth pages and the
 * dashboard each had a different idea of what the brand looked like - or none
 * at all.
 */
export function Wordmark({
  className = "",
  surface = "auto",
}: {
  className?: string;
  surface?: Surface;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-medium tracking-tight ${className}`}>
      <HubMark className="h-[1.6em] w-[1.6em] shrink-0" surface={surface} />
      ProfileHub
    </span>
  );
}
