import { getCookConfigPath } from '../config/app-paths.js';

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

export function formatCookError(error: CookError): string {
  if (error.code !== 'EXPANSION_LIMIT_EXCEEDED') {
    return error.message;
  }

  return [
    'Expansion limit exceeded.',
    '',
    error.message,
    '',
    'Cook stopped before rendering or writing files because the expanded batch became too large.',
    `If you are sure this is intentional, raise the limit in ${getCookConfigPath()}.`,
    'Warning: increasing these limits can create very large batches and may produce a lot of filesystem changes.',
    '',
    'Relevant config keys:',
    '  max_dishes = 500',
    '  max_rendered_paths = 50000'
  ].join('\n');
}
