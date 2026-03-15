/**
 * Custom error class for API errors.
 * Carries an HTTP status code so route handlers can return proper responses.
 */
export class ApiError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }

  /**
   * Creates a JSON Response object from this error
   */
  toResponse(): Response {
    return new Response(
      JSON.stringify({ success: false, error: this.message }),
      {
        status: this.statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // ─── Factory methods ────────────────────────────────

  static badRequest(message = "Bad Request") {
    return new ApiError(400, message);
  }

  static notFound(message = "Not Found") {
    return new ApiError(404, message);
  }

  static badGateway(message = "External service error") {
    return new ApiError(502, message);
  }

  static serviceUnavailable(message = "Service unavailable") {
    return new ApiError(503, message);
  }
}
