import { ApiError } from '../utils/ApiError.js';

function formatZodIssues(error) {
  return error.issues.map(issue => ({
    field: issue.path.join('.') || '_root',
    message: issue.message
  }));
}

export function validateBody(schema) {
  return function bodyValidator(req, res, next) {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      next(
        new ApiError(422, 'VALIDATION_ERROR', 'The request data is invalid.', {
          fields: formatZodIssues(result.error)
        })
      );
      return;
    }

    req.validatedBody = result.data;
    next();
  };
}

export function parseQuery(schema, query) {
  const result = schema.safeParse(query ?? {});

  if (!result.success) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'The request query is invalid.', {
      fields: formatZodIssues(result.error)
    });
  }

  return result.data;
}
