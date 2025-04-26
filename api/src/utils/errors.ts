/**
 * Custom error class for resource not found errors (e.g., 404).
 */
export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';

        // This is necessary for correctly extending built-in classes like Error
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

// You can add other custom error classes here if needed, e.g.:
// export class AuthenticationError extends Error { ... }
// export class AuthorizationError extends Error { ... }
// export class BadRequestError extends Error { ... } 