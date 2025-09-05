/**
 * HTTP Status Codes Constants
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Error
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

/**
 * Check if status code is success (2xx)
 */
export const isSuccessStatus = statusCode => {
  return statusCode >= 200 && statusCode < 300;
};

/**
 * Check if status code is client error (4xx)
 */
export const isClientError = statusCode => {
  return statusCode >= 400 && statusCode < 500;
};

/**
 * Check if status code is server error (5xx)
 */
export const isServerError = statusCode => {
  return statusCode >= 500 && statusCode < 600;
};
