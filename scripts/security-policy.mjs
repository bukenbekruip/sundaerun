// Pages cannot set arbitrary HTTP security headers. This compatible meta policy
// applies only to production web HTML, not Vite HMR or generated offline HTML.
export const productionPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
].join("; ");

export function withSecurityPolicy(html) {
  return html.replace(
    /(<meta\s+charset=[^>]+>)/i,
    `$1\n    <meta http-equiv="Content-Security-Policy" content="${productionPolicy}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
  );
}
