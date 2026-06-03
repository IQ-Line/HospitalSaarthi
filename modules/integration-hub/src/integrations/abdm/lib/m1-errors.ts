/** Domain / validation errors surfaced from M1 use-cases to HTTP layer. */
export class AbdmUseCaseError extends Error {
  readonly httpStatus: number;
  readonly clientCode: string;

  constructor(message: string, httpStatus: number, clientCode = "BAD_REQUEST") {
    super(message);
    this.name = "AbdmUseCaseError";
    this.httpStatus = httpStatus;
    this.clientCode = clientCode;
  }
}
