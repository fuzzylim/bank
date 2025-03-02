import { ApiError } from "../api-utils";

/**
 * OBP API error - extends the base ApiError with OBP-specific error details
 */
export class OBPApiError extends ApiError {
    constructor(
        message: string,
        status: number = 500,
        public responseText?: string,
    ) {
        super(message, status, responseText);
        this.name = "OBPApiError";
    }
}

/**
 * Configuration error for the Open Banking API
 */
export class ConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConfigurationError";
    }
}