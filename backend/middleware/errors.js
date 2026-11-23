import { ZodError } from 'zod';
import { HttpError } from '../utils/errors.js';
export function errorHandler(error, _req, res, _next) {
  let status = 500, message = 'Internal server error.';
  if (error instanceof HttpError) { status = error.status; message = error.message; }
  else if (error instanceof ZodError) { status = 400; message = 'Invalid input.'; }
  else if (error.code === 11000) { status = 409; message = 'A record with these unique details already exists.'; }
  else if (error.name === 'VersionError') { status = 409; message = 'This record changed. Refresh before saving again.'; }
  else if (['ValidationError', 'CastError'].includes(error.name)) { status = 400; message = 'Invalid record data.'; }
  else if (error.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON.'; }
  else if (error.type === 'entity.too.large') { status = 413; message = 'Request body is too large.'; }
  if (status === 500) console.error('An internal API error occurred.');
  res.status(status).json({ success: false, message,
    ...(error instanceof ZodError ? { errors: error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) } : {}),
  });
}
