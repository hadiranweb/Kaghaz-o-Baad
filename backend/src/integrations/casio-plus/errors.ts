export class CasioDispatchError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = 'CasioDispatchError';
  }
}
