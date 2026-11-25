export class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }
}

export function invalidCredentials() {
  return new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
}

export function unauthenticated() {
  return new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');
}

export function forbidden(message = 'You do not have permission to perform this action.') {
  return new ApiError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'The requested resource was not found.') {
  return new ApiError(404, 'NOT_FOUND', message);
}

export function conflict(message, details) {
  return new ApiError(409, 'CONFLICT', message, details);
}
