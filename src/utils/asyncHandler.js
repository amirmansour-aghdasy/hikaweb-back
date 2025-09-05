/**
 * Async Handler Wrapper
 * Wraps async functions to automatically catch and forward errors to error handler
 */
export const asyncHandler = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Try-Catch Helper
 * Alternative to asyncHandler for more explicit error handling
 */
export const tryCatch = fn => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
