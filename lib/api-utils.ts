import { trace, traceAsync } from "./tracing";

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

/**
 * Standard error handling for API routes
 */
export const handleApiError = (error: unknown): ApiResponse => {
    trace.error("API route error", error);

    let message = "Internal server error";

    if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === "string") {
        message = error;
    }

    // Handle specific error types
    if (typeof error === "object" && error !== null) {
        if ("status" in error && typeof error.status === "number") {
            if (error.status === 401) {
                message = "Authentication required";
            } else if (error.status === 403) {
                message = "Access denied";
            } else if (error.status === 404) {
                message = "Resource not found";
            }
        }
    }

    return { success: false, error: message };
};

/**
 * Get authentication token from request or cookies
 */
export const getAuthToken = (request: Request): { token: string | null; source: string } => {
    // Try authorization header first
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("DirectLogin token=")) {
        trace.debug("Using token from Authorization header");
        // Extract token from "DirectLogin token="..."" format
        const match = authHeader.match(/DirectLogin token="([^"]+)"/);
        if (match && match[1]) {
            return { token: match[1], source: "header" };
        }
    }

    // Try to get token from cookies
    const cookieHeader = request.headers.get("Cookie");
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
        const tokenCookie = cookies.find(cookie => cookie.startsWith('obp_token='));

        if (tokenCookie) {
            const tokenValue = tokenCookie.substring('obp_token='.length);
            if (tokenValue) {
                trace.debug("Using token from cookie");
                return { token: tokenValue, source: "cookie" };
            }
        }
    }

    trace.debug("No authentication token found");
    return { token: null, source: "none" };
};

/**
 * Get headers with authentication for OBP API requests
 */
export const getApiHeaders = (token: string | null): HeadersInit => {
    const headers: HeadersInit = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers.Authorization = `DirectLogin token="${token}"`;
    }

    return headers;
};

/**
 * Standard wrapper for API route handlers with error handling and tracing
 */
export const createApiHandler = <T, P extends Record<string, string> = {}>(
    handler: (
        request: Request,
        params: P,
        authToken: string | null
    ) => Promise<T>
) => {
    return async (request: Request, { params }: { params: P }): Promise<ApiResponse> => {
        return traceAsync(
            `API ${request.method} ${request.url}`,
            async () => {
                try {
                    const { token } = getAuthToken(request);

                    // Trace API call with redacted token for security
                    trace.info(`${request.method} ${request.url}`, {
                        params,
                        hasToken: !!token
                    });

                    const result = await handler(request, params, token);

                    return { success: true, data: result };
                } catch (error) {
                    return handleApiError(error);
                }
            }
        );
    };
};

/**
 * Create an error object with HTTP status
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public status: number = 500,
        public details?: string
    ) {
        super(message);
        this.name = "ApiError";
    }
}

/**
 * Standard OBP API endpoints
 */
export const OBP_ENDPOINTS = {
    // Base API URL from environment or default to sandbox
    baseUrl: process.env.API_BASE_URL || "https://apisandbox.openbankproject.com",

    // API version from environment or default
    version: process.env.OBP_API_VERSION || "v5.1.0",

    // Build full endpoint URL
    buildUrl: (path: string): string => {
        const baseUrl = OBP_ENDPOINTS.baseUrl;
        const version = OBP_ENDPOINTS.version;
        return `${baseUrl}/obp/${version}${path}`;
    },

    // Common endpoint paths
    banks: () => OBP_ENDPOINTS.buildUrl("/banks"),
    bank: (bankId: string) => OBP_ENDPOINTS.buildUrl(`/banks/${bankId}`),
    accounts: (bankId: string) => OBP_ENDPOINTS.buildUrl(`/banks/${bankId}/accounts/private`),
    transactions: (bankId: string, accountId: string, viewId: string) =>
        OBP_ENDPOINTS.buildUrl(`/banks/${bankId}/accounts/${accountId}/${viewId}/transactions`),

    // Transaction operation endpoints
    createTransactionRequest: (bankId: string, accountId: string, viewId: string, transactionRequestType: string) =>
        OBP_ENDPOINTS.buildUrl(`/banks/${bankId}/accounts/${accountId}/${viewId}/transaction-request-types/${transactionRequestType}/transaction-requests`),

    // CounterpartyId is required for SEPA, COUNTERPARTY transfer types
    createTransaction: (bankId: string, accountId: string, viewId: string) =>
        OBP_ENDPOINTS.buildUrl(`/banks/${bankId}/accounts/${accountId}/${viewId}/transactions`),

    // For top-ups (used for adding funds to an account)
    createTransfer: (bankId: string) =>
        OBP_ENDPOINTS.buildUrl(`/banks/${bankId}/internal-transfers`)
};