export class ApiError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
export const badRequest = (m = "Invalid request") => new ApiError(400, m);
export const unauthorized = (m = "Please sign in") => new ApiError(401, m);
export const forbidden = (m = "You don't have access") => new ApiError(403, m);
export const notFound = (m = "Not found") => new ApiError(404, m);
export const conflict = (m = "Already exists") => new ApiError(409, m);
export const gone = (m = "This note is no longer available") => new ApiError(410, m);
