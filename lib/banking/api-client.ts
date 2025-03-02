import { trace } from "../tracing";
import { getConsumerKey, API_BASE_URL, API_VERSION, OBP_ENDPOINTS } from "./config";
import { ConfigurationError, OBPApiError } from "./errors";
import { createDirectLoginClient } from "./direct-login-client";
import { transformAccounts, transformTransactions } from "./transformers";
import { OBPBank, OBPAccount, OBPTransaction, Account, Transaction } from "../types/obp-types";
import { getCookie, setCookie, clearCookie, handleApiResponse } from "../server/api-utils";

// Create the DirectLoginClient instance
const client = createDirectLoginClient();

/**
 * Open Banking Project API client
 */
export const obpApi = {
    /**
     * Login with username and password
     */
    login: async (username: string, password: string): Promise<string> => {
        try {
            trace.info("Attempting login", { username });
            const consumerKey = getConsumerKey();

            if (!consumerKey) {
                trace.info("No consumer key available, using server-side login API");
                // If we're on the client side, make a request to the server-side API
                if (typeof window !== "undefined") {
                    // Create a login endpoint in the Next.js API routes
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, password }),
                        credentials: 'include' // Include cookies in the request
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        trace.error("Login API error", new Error(errorData.message || "Authentication failed"));
                        throw new OBPApiError(errorData.message || "Authentication failed", response.status);
                    }

                    const data = await response.json();
                    trace.info("Login successful", { hasToken: !!data.token });

                    // Set the token in the client instance
                    client.setToken(data.token);
                    return data.token;
                } else {
                    // Server-side but missing consumer key
                    trace.error("Server-side login attempted without consumer key");
                    throw new ConfigurationError("Consumer Key is not set in the environment variables");
                }
            }

            trace.info("Using direct login with consumer key");
            const token = await client.login(username, password, consumerKey);
            return token;
        } catch (error) {
            trace.error("Login error", error as Error);
            if (error instanceof OBPApiError || error instanceof ConfigurationError) {
                throw error;
            }
            throw new OBPApiError("An unexpected error occurred during login");
        }
    },

    /**
     * Set token directly (useful for initializing from cookies or other sources)
     */
    setToken: (token: string): void => {
        client.setToken(token);
    },

    /**
     * Get list of available banks
     */
    getBanks: async (): Promise<OBPBank[]> => {
        try {
            // Use different endpoints for client-side and server-side
            const endpoint = typeof window !== "undefined"
                ? `/api/banks` // Client-side: use Next.js API route
                : `/obp/${API_VERSION}/banks`; // Server-side: use direct OBP API

            trace.debug("Getting banks");

            if (typeof window !== "undefined") {
                // For client-side, use fetch directly with credentials to ensure HttpOnly cookies are sent
                trace.debug("Fetching banks from API route");
                try {
                    const response = await fetch(endpoint, {
                        credentials: 'include',
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        }
                    });

                    if (!response.ok) {
                        if (response.status === 401) {
                            throw new OBPApiError("Not authenticated", 401);
                        }
                        throw new OBPApiError("Failed to fetch banks", response.status);
                    }

                    const data = await response.json();

                    // Process response data based on structure
                    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
                        const responseData = data.data;

                        if (responseData && typeof responseData === 'object' && 'banks' in responseData && Array.isArray(responseData.banks)) {
                            return responseData.banks;
                        } else if (Array.isArray(responseData)) {
                            return responseData;
                        } else {
                            trace.warn("Unexpected data structure inside API success wrapper", { dataType: typeof responseData });
                            return [];
                        }
                    } else if (data && typeof data === 'object' && 'banks' in data && Array.isArray(data.banks)) {
                        return data.banks;
                    } else if (Array.isArray(data)) {
                        return data;
                    } else {
                        trace.warn("Unexpected banks API response format", { dataType: typeof data });
                        return [];
                    }
                } catch (fetchError) {
                    trace.error("Fetch banks error", fetchError as Error);
                    if (fetchError instanceof OBPApiError) {
                        throw fetchError;
                    }
                    throw new OBPApiError("An unexpected error occurred while fetching banks");
                }
            } else {
                // For server-side, use the client request method
                trace.debug("Fetching banks directly from OBP API");
                const data = await client.request<{ banks: OBPBank[] }>(endpoint);
                return data.banks;
            }
        } catch (error) {
            trace.error("Get banks error", error as Error);
            if (error instanceof OBPApiError || error instanceof ConfigurationError) {
                throw error;
            }
            throw new OBPApiError("An unexpected error occurred while fetching banks");
        }
    },

    /**
     * Get accounts for a bank
     */
    getAccounts: async (bankId: string): Promise<OBPAccount[]> => {
        try {
            // Use different endpoints for client-side and server-side
            const endpoint = typeof window !== "undefined"
                ? `/api/accounts/${bankId}` // Client-side: use Next.js API route
                : `/obp/${API_VERSION}/banks/${bankId}/accounts`; // Server-side: use direct OBP API

            trace.debug(`Getting accounts for bank ${bankId}`);

            if (typeof window !== "undefined") {
                // For client-side, use fetch directly with credentials to ensure HttpOnly cookies are sent
                try {
                    const response = await fetch(endpoint, {
                        credentials: 'include',
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        }
                    });

                    if (!response.ok) {
                        if (response.status === 401) {
                            throw new OBPApiError("Not authenticated", 401);
                        }
                        throw new OBPApiError("Failed to fetch accounts", response.status);
                    }

                    const data = await response.json();

                    // Process response data based on structure
                    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
                        const responseData = data.data;

                        if (responseData && typeof responseData === 'object' && 'accounts' in responseData && Array.isArray(responseData.accounts)) {
                            return responseData.accounts;
                        } else if (Array.isArray(responseData)) {
                            return responseData;
                        } else {
                            trace.warn("Unexpected data structure inside API success wrapper", { dataType: typeof responseData });
                            return [];
                        }
                    } else if (data && data.accounts && Array.isArray(data.accounts)) {
                        return data.accounts;
                    } else if (data && Array.isArray(data)) {
                        // Some APIs might return the accounts array directly
                        return data;
                    } else {
                        trace.error("Unexpected API response format", { dataType: typeof data });
                        return []; // Return empty array instead of undefined
                    }
                } catch (fetchError) {
                    trace.error("Fetch accounts error", fetchError as Error);
                    throw fetchError;
                }
            } else {
                // For server-side, use the client request method
                const data = await client.request<any>(endpoint);

                // Check if data has the expected structure
                if (data && data.accounts && Array.isArray(data.accounts)) {
                    return data.accounts;
                } else if (data && Array.isArray(data)) {
                    // Some APIs might return the accounts array directly
                    return data;
                } else {
                    trace.error("Unexpected API response format", { dataType: typeof data });
                    return []; // Return empty array instead of undefined
                }
            }
        } catch (error) {
            trace.error("Get accounts error", error as Error, { bankId });
            if (error instanceof OBPApiError || error instanceof ConfigurationError) {
                throw error;
            }
            throw new OBPApiError("An unexpected error occurred while fetching accounts");
        }
    },

    /**
     * Get transactions for an account
     */
    getTransactions: async (bankId: string, accountId: string, viewId: string): Promise<OBPTransaction[]> => {
        try {
            // Use different endpoints for client-side and server-side
            const endpoint = typeof window !== "undefined"
                ? `/api/transactions/${bankId}/${accountId}/${viewId}` // Client-side: use Next.js API route
                : `/obp/${API_VERSION}/banks/${bankId}/accounts/${accountId}/${viewId}/transactions`; // Server-side: use direct OBP API

            trace.debug(`Getting transactions for bank ${bankId}, account ${accountId}, view ${viewId}`);

            if (typeof window !== "undefined") {
                // For client-side, use fetch directly with credentials
                try {
                    const response = await fetch(endpoint, {
                        credentials: 'include',
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        }
                    });

                    if (!response.ok) {
                        if (response.status === 401) {
                            throw new OBPApiError("Not authenticated", 401);
                        }
                        throw new OBPApiError("Failed to fetch transactions", response.status);
                    }

                    const data = await response.json();

                    // Process response data based on structure
                    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
                        const responseData = data.data;

                        if (responseData && typeof responseData === 'object' && 'transactions' in responseData && Array.isArray(responseData.transactions)) {
                            return responseData.transactions;
                        } else if (Array.isArray(responseData)) {
                            return responseData;
                        } else {
                            trace.warn("Unexpected data structure inside API success wrapper for transactions", { dataType: typeof responseData });
                            return [];
                        }
                    } else if (data && data.transactions && Array.isArray(data.transactions)) {
                        return data.transactions;
                    } else if (Array.isArray(data)) {
                        return data;
                    } else {
                        trace.warn("Unexpected transactions API response format", { dataType: typeof data });
                        return [];
                    }
                } catch (fetchError) {
                    trace.error("Fetch transactions error", fetchError as Error);
                    throw fetchError;
                }
            } else {
                // For server-side, use the client request method
                const data = await client.request<{ transactions: OBPTransaction[] }>(endpoint);
                return data.transactions;
            }
        } catch (error) {
            trace.error("Get transactions error", error as Error, { bankId, accountId, viewId });
            if (error instanceof OBPApiError || error instanceof ConfigurationError) {
                throw error;
            }
            throw new OBPApiError("An unexpected error occurred while fetching transactions");
        }
    },

    /**
     * Test API connection
     */
    testConnection: async (): Promise<{
        success: boolean;
        message: string;
        details?: string;
        version?: string;
        authenticated?: boolean;
    }> => {
        try {
            if (!API_BASE_URL) {
                return { success: false, message: "API_BASE_URL is not set" };
            }

            // For client-side, we test the connection through our Next.js API route
            const response = await fetch('/api/test-connection', {
                credentials: 'include' // Include cookies in the request
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                trace.error("API test failed", { status: response.status, data });
                return {
                    success: false,
                    message: data.message || `API test failed: ${response.status}`,
                    details: data.details,
                    authenticated: data.authenticated
                };
            }

            return {
                success: true,
                message: data.message,
                version: data.version,
                authenticated: data.authenticated
            };
        } catch (error) {
            trace.error("API test error", error as Error);
            return {
                success: false,
                message: `API test error: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    },

    /**
     * Get accounts with application-specific formatting
     */
    getFormattedAccounts: async (bankId: string): Promise<Account[]> => {
        const accounts = await obpApi.getAccounts(bankId);
        return transformAccounts(accounts);
    },

    /**
     * Get transactions with application-specific formatting
     */
    getFormattedTransactions: async (bankId: string, accountId: string, viewId: string): Promise<Transaction[]> => {
        const transactions = await obpApi.getTransactions(bankId, accountId, viewId);
        return transformTransactions(transactions);
    }
};

// Export other useful functions
export const testApiConnection = obpApi.testConnection;