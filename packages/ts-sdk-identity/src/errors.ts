export class IdentityVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityVerificationError";
  }
}
