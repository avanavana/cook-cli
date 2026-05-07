export class CookError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'CookError';
  }
}

export function isCookError(error: unknown): error is CookError {
  return error instanceof CookError;
}
