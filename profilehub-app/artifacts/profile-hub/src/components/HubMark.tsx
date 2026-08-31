/**
 * The ProfileHub mark.
 *
 * Inline rather than an <img> so it costs no request, inherits the surrounding
 * size, and can be animated a piece at a time - the intro veil takes it apart
 * and reassembles it.
 *
 * The four tiles keep their own colours in both themes. A brand mark that
 * changes colour with the page is a different mark.
 */
export function HubMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
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
 * Mark plus name, linking home. The auth pages and the dashboard each had a
 * different idea of what the brand looked like - or none at all.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-medium tracking-tight ${className}`}>
      <HubMark className="h-[1.2em] w-[1.2em] shrink-0" />
      ProfileHub
    </span>
  );
}
