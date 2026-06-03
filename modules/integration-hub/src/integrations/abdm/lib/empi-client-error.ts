/** EMPI upstream unavailable — callback handlers should surface 502 to NHA for retry. */
export class EmpiClientError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "EmpiClientError";
  }
}
