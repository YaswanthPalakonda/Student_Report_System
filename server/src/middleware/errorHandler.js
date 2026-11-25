import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred.';
  let details;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error?.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'The request body is not valid JSON.';
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'The request data is invalid.';
    details = {
      fields: Object.values(error.errors).map(validationError => ({
        field: validationError.path,
        message: validationError.message
      }))
    };
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = 'The provided identifier is invalid.';
  } else if (error?.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';

    if (error.keyPattern?.email) {
      message = 'Email already exists.';
    } else if (error.keyPattern?.teacher) {
      message = 'This teacher assignment already exists.';
    } else {
      message = 'A duplicate resource already exists.';
    }

    details = { keys: Object.keys(error.keyPattern || {}) };
  }

  if (statusCode >= 500) {
    console.error(`[api] ${req.method} ${req.originalUrl} failed:`, error);
  }

  const payload = {
    error: {
      code,
      message
    }
  };

  if (details) {
    payload.error.details = details;
  }

  if (!env.isProduction && statusCode >= 500) {
    payload.error.debug = error.message;
  }

  res.status(statusCode).json(payload);
}
