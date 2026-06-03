/** NHA OTP body expects `YYYY-MM-DD HH:mm:ss` in IST (Asia/Kolkata).

Computed via UTC+5:30 offset — does NOT depend on server TZ. */
export function abdmOtpTimestampIst(): string {
  const istMs = Date.now() + 5.5 * 60 * 60 * 1000;
  const d = new Date(istMs);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  );
}
