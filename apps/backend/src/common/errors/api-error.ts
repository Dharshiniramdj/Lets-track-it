export interface FieldValidationError {
  field: string;
  message: string;
  rule?: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;
  public readonly details?: FieldValidationError[];

  constructor(statusCode: number, message: string, errorType = 'API_ERROR', details?: FieldValidationError[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public static badRequest(message: string, details?: FieldValidationError[]): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  public static unauthorized(message = 'Unauthorized: Access token missing, invalid or expired'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  public static forbidden(message = 'Forbidden: Insufficient permissions'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  public static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  public static unprocessableEntity(message: string, details: FieldValidationError[]): ApiError {
    return new ApiError(422, message, 'UNPROCESSABLE_ENTITY', details);
  }

  public retryAfter?: number;

  public static tooManyRequests(message = 'Too many requests. Please try again later.', retryAfter?: number): ApiError {
    const err = new ApiError(429, message, 'TOO_MANY_REQUESTS');
    err.retryAfter = retryAfter;
    return err;
  }

  public static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, 'INTERNAL_SERVER_ERROR');
  }

  public toResponse() {
    return {
      status: this.statusCode,
      error: this.errorType,
      message: this.message,
      errors: this.details || [],
      timestamp: new Date().toISOString()
    };
  }
}
