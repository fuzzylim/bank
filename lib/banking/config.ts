// Configuration helpers for the Open Banking API

// Get consumer key - server-side only
export const getConsumerKey = () => {
    if (typeof window === "undefined") {
        // Server-side
        return process.env.OBP_CONSUMER_KEY;
    } else {
        // Client-side
        return null; // Don't expose the consumer key on the client
    }
};

// API base URL based on environment
export const API_BASE_URL = (typeof window === "undefined"
    ? process.env.API_BASE_URL
    : process.env.NEXT_PUBLIC_API_BASE_URL) as string | undefined;

// API version based on environment
export const API_VERSION = (typeof window === "undefined"
    ? process.env.OBP_API_VERSION
    : "v5.1.0") as string | undefined;

// Get the API endpoint URL
export const getApiEndpoint = (path: string): string => {
    if (!API_BASE_URL) {
        throw new Error("API_BASE_URL is not configured");
    }

    const version = API_VERSION || "v5.1.0";
    return `${API_BASE_URL}/obp/${version}${path}`;
};

// Common OBP endpoints
export const OBP_ENDPOINTS = {
    banks: () => getApiEndpoint("/banks"),
    accounts: (bankId: string) => getApiEndpoint(`/banks/${bankId}/accounts`),
    transactions: (bankId: string, accountId: string, viewId: string) =>
        getApiEndpoint(`/banks/${bankId}/accounts/${accountId}/${viewId}/transactions`),
    directLogin: () => `${API_BASE_URL}/my/logins/direct`
};