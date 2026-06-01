let webOrigin = "";

export function setReportWebOrigin(origin: string): void {
  webOrigin = origin.trim().replace(/\/$/, "");
}

export function resolveReportLogoUrl(logo: string | undefined | null): string {
  if (!logo || String(logo).trim() === "") return "/reportLogo.png";
  const url = String(logo).trim();
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (webOrigin) {
    return url.startsWith("/") ? `${webOrigin}${url}` : `${webOrigin}/${url}`;
  }
  return url;
}
