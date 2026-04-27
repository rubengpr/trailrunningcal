export class ValidationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}
