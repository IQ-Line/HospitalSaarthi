/** Strip non-digits and cap length (OTP, mobile, Aadhaar segments). */
export function digitsOnly(value: string, maxLen: number): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}
