/** Invalid patient search query (missing keys, name too short, etc.). */
export class PatientSearchQueryError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "PatientSearchQueryError";
  }
}
