/** Fallback emblem when a remote logo cannot be fetched (e.g. Gotenberg PDF render). */
export const DEFAULT_REPORT_LOGO_DATA_URL =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">' +
      '<rect fill="#9d174d" width="80" height="80" rx="8"/>' +
      '<text x="40" y="52" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">H</text>' +
      "</svg>",
  );
