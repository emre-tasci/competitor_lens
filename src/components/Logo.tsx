/**
 * Product Terminali logo — "layered screens" mark.
 * Two offset rounded frames = a stack of app screens (the screenshot corpus).
 * Self-contained: red #dc0005 tile + white knockout, so it works as favicon too.
 * Brand red is intentionally hardcoded here — this asset *is* the brand color.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Product Terminali"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#dc0005" />
      {/* back screen — outline peeking out top-right */}
      <rect x="13" y="7" width="11.5" height="11.5" rx="2.6" stroke="white" strokeWidth="1.8" />
      {/* knockout gap so the front screen reads as sitting on top */}
      <rect x="6.4" y="10.4" width="14.7" height="14.7" rx="4" fill="#dc0005" />
      {/* front screen — solid */}
      <rect x="8" y="12" width="11.5" height="11.5" rx="2.6" fill="white" />
    </svg>
  );
}
