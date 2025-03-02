import { trace, traceAsync } from "../tracing";
import { ConfigurationError, OBPApiError } from "./errors";
import { API_BASE_URL } from "./config";

/**
 * Client for Direct Login authentication and API requests to Open Banking Project
 */
export class DirectLoginClient {
    private token: string | null = null;
    private clientContext: Record<string, string> = {};

    constructor(private baseUrl: string) {
        // Set client context for tracing
        this.clientContext = {
            clientType: typeof window !== "undefined" ? "browser" : "server",
            baseUrl: this.baseUrl
        };

        // Initialize token from cookie if available (client-side only)
        if (typeof window !== "undefined") {
            // Initialize asynchronously to avoid blocking
            trace.debug("Initializing client-side token", this.clientContext);
            setTimeout(async () => {
                await this.initializeFromCookie();
            }, 0);
        }
    }

    // Check if token is set
    public hasToken(): boolean {
        return this.token !== null && this.token !== undefined && this.token !== '';
    }

    // Initialize token from cookie
    private async initializeFromCookie(): Promise<void> {
        try {
            // Check if we already have a token in memory
            if (this.token) {
                trace.debug("Token already loaded in memory", this.clientContext);
                return;
            }

            // Using dynamic import for js-cookie to avoid server-side issues
            const Cookies = require('js-cookie');
            const savedToken = Cookies.get("obp_token");

            if (savedToken) {
                this.token = savedToken;
                trace.info(
                    "Token loaded from cookie",
                    { ...this.clientContext, tokenPrefix: savedToken.substring(0, 5) + "..." }
                );
                return;
            } else {
                trace.info("No token found in client-side cookie", this.clientContext);

                // Always verify HttpOnly cookie regardless of client-side cookie
                const hasHttpOnlyCookie = await this.verifyTokenWithTestRequest();
                if (hasHttpOnlyCookie) {
                    trace.info("Successfully verified HttpOnly cookie token", this.clientContext);
                    return;
                }

                trace.debug("No authentication token found in cookies", this.clientContext);
            }
        } catch (error) {
            trace.error("Failed to load token from cookie", error as Error, this.clientContext);

            // Always check for HttpOnly cookie in case of errors
            try {
                const hasHttpOnlyCookie = await this.verifyTokenWithTestRequest();
                if (hasHttpOnlyCookie) {
                    trace.info("Recovered authentication with HttpOnly cookie after error", this.clientContext);
                }
            } catch (httpCookieError) {
                trace.error("Failed to recover with HttpOnly cookie", httpCookieError as Error, this.clientContext);
            }
        }
    }

    // Verify token by making a test request
    private async verifyTokenWithTestRequest(): Promise<boolean> {
        try {
            // Add cache-busting parameter to avoid cached responses
            const cacheBuster = Date.now();

            // Make a simple request to the API to check if the HttpOnly cookie works
            const response = await fetch(`/api/test-connection?client=true&_=${cacheBuster}`, {
                method: 'GET',
                credentials: 'include', // Important: include cookies in the request
                headers: {
                    'Cache-Control': 'no-cache, no-store',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.authenticated) {
                    trace.info("Token verified via test request", this.clientContext);
                    this.token = "verified-via-http-only"; // Just a placeholder, actual token is in HttpOnly cookie

                    // Also add a flag in localStorage to help with state management
                    if (typeof window !== "undefined" && window.localStorage) {
                        window.localStorage.setItem('obp_authenticated', 'true');
                    }

                    return true;
                }
            }

            // If the first attempt failed, try another endpoint as a backup
            // Some endpoints may have different authentication requirements
            try {
                const banksResponse = await fetch(`/api/banks?_=${cacheBuster}`, {
                    credentials: 'include',
                    headers: {
                        'Cache-Control': 'no-cache, no-store',
                        'Pragma': 'no-cache'
                    },
                    cache: 'no-store'
                });

                if (banksResponse.ok) {
                    trace.info("Token verified via banks API endpoint", this.clientContext);
                    this.token = "verified-via-http-only";

                    if (typeof window !== "undefined" && window.localStorage) {
                        window.localStorage.setItem('obp_authenticated', 'true');
                    }

                    return true;
                }
            } catch (backupError) {
                trace.error("Failed backup verification attempt", backupError as Error, this.clientContext);
            }

            return false;
        } catch (error) {
            trace.error("Failed to verify token with test request", error as Error, this.clientContext);
            return false;
        }
    }

    // Set token and optionally save to cookie
    public setToken(token: string, saveToCookie = true): void {
        // Use void to discard the promise
        void this.setTokenAsync(token, saveToCookie);
    }

    // Async implementation of setToken
    private async setTokenAsync(token: string, saveToCookie = true): Promise<void> {
        if (!token) {
            trace.info("Clearing authentication token", this.clientContext);
            this.token = null;

            // Clear cookie if on client side
            if (typeof window !== "undefined") {
                try {
                    const Cookies = require('js-cookie');
                    Cookies.remove("obp_token");
                    Cookies.remove("obp_token", { path: '/' });
                    trace.debug("Token cookie removed", this.clientContext);

                    // Also remove any local storage items that might be used for authentication
                    if (window.localStorage) {
                        window.localStorage.removeItem('obp_authenticated');
                    }
                } catch (error) {
                    trace.error("Failed to remove token cookie", error as Error, this.clientContext);
                }
            }
            return;
        }

        this.token = token;
        trace.info("Token set", { ...this.clientContext, tokenPrefix: token.substring(0, 5) + "..." });

        // Save to cookie if requested and on client side
        if (saveToCookie && typeof window !== "undefined") {
            try {
                const Cookies = require('js-cookie');
                // Set secure cookie with proper options
                Cookies.set("obp_token", token, {
                    expires: 7, // 7 days expiry
                    sameSite: 'strict',
                    path: '/'
                });
                trace.debug("Token saved to cookie", this.clientContext);

                // Add a flag in localStorage to help with state management
                if (window.localStorage) {
                    window.localStorage.setItem('obp_authenticated', 'true');
                }
            } catch (error) {
                trace.error("Failed to save token to cookie", error as Error, this.clientContext);
            }
        }
    }

    // Login with username and password
    public async login(username: string, password: string, consumerKey: string): Promise<string> {
        try {
            trace.info("Attempting login", { ...this.clientContext, username });

            if (!consumerKey) {
                throw new ConfigurationError("Consumer key is not configured");
            }

            const authString = `DirectLogin username="${username}",password="${password}",consumer_key="${consumerKey}"`;
            const endpoint = `${this.baseUrl}/my/logins/direct`;

            trace.debug(`Making login request to ${endpoint}`, this.clientContext);
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    Authorization: authString,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                trace.error(
                    "Authentication failed",
                    new OBPApiError("Authentication failed", response.status, errorText),
                    { ...this.clientContext, status: response.status }
                );
                throw new OBPApiError("Authentication failed", response.status, errorText);
            }

            const data = await response.json();
            if (!data.token) {
                throw new OBPApiError("No token received in response");
            }

            trace.info("Login successful", this.clientContext);
            // Set token and save to cookie
            this.setToken(data.token);
            return data.token;
        } catch (error) {
            trace.error("Login failed", error as Error, this.clientContext);
            throw error;
        }
    }

    // Make API request with authentication
    public async request<T>(endpoint: string, method = "GET", data?: any): Promise<T> {
        // Track retries to prevent infinite loops
        let retryCount = 0;
        const maxRetries = 1;

        // For retry logic
        const executeRequest = async (): Promise<T> => {
            try {
                // Always try to initialize from cookie first if we don't have a token in memory
                if (!this.token && typeof window !== "undefined") {
                    await this.initializeFromCookie();

                    // If we still don't have a token, try to verify with a test request
                    if (!this.token) {
                        await this.verifyTokenWithTestRequest();
                    }
                }

                trace.debug(`API request: ${method} ${endpoint}`, { ...this.clientContext, hasData: !!data });

                // Prepare headers with cache busting
                const headers: HeadersInit = {
                    "Content-Type": "application/json",
                    // Add cache control headers to prevent stale responses
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache"
                };

                // Only add Authorization header if we have a token in memory
                // and it's not the placeholder value
                if (this.token && this.token !== "verified-via-http-only") {
                    headers.Authorization = `DirectLogin token="${this.token}"`;
                    trace.debug(
                        `Request with token: ${method} ${endpoint}`,
                        { ...this.clientContext, tokenPrefix: this.token.substring(0, 5) + "..." }
                    );
                } else if (this.token === "verified-via-http-only") {
                    trace.debug(`Request with HttpOnly cookie: ${method} ${endpoint}`, this.clientContext);
                } else {
                    trace.debug(`Request without token: ${method} ${endpoint}`, this.clientContext);
                }

                const url = `${this.baseUrl}${endpoint}`;
                trace.debug(`Fetching: ${url}`, { method, hasData: !!data });

                // Add a cache-busting parameter to the URL
                const urlWithCacheBuster = url.includes('?')
                    ? `${url}&_=${Date.now()}`
                    : `${url}?_=${Date.now()}`;

                const response = await fetch(urlWithCacheBuster, {
                    method,
                    headers,
                    body: data ? JSON.stringify(data) : undefined,
                    // Always include credentials to ensure HttpOnly cookies are sent
                    credentials: 'include',
                    cache: 'no-store'
                });

                if (!response.ok) {
                    // If unauthorized, clear token and try to recover
                    if (response.status === 401) {
                        trace.warn("Unauthorized API request, attempting recovery", this.clientContext);
                        this.token = null;

                        if (typeof window !== "undefined") {
                            try {
                                const Cookies = require('js-cookie');
                                Cookies.remove("obp_token");
                                Cookies.remove("obp_token", { path: '/' });

                                // Also clear localStorage flag
                                if (window.localStorage) {
                                    window.localStorage.removeItem('obp_authenticated');
                                }
                            } catch (error) {
                                trace.error("Failed to remove token cookie", error as Error, this.clientContext);
                            }
                        }

                        // Try to verify if we have an HttpOnly cookie that might work
                        const hasHttpOnlyCookie = await this.verifyTokenWithTestRequest();

                        if (hasHttpOnlyCookie) {
                            trace.info("Successfully recovered authentication via HttpOnly cookie", this.clientContext);

                            // If this is our first retry, attempt the request again with the recovered token
                            if (retryCount < maxRetries) {
                                retryCount++;
                                trace.info(`Retrying request with recovered authentication (attempt ${retryCount})`, this.clientContext);
                                return executeRequest();
                            }
                        } else {
                            // Last resort: try to refresh authentication through the test-connection endpoint
                            try {
                                trace.info("Attempting last-resort authentication recovery", this.clientContext);
                                const refreshResponse = await fetch(`/api/test-connection?refresh=true&_=${Date.now()}`, {
                                    credentials: 'include',
                                    headers: {
                                        'Cache-Control': 'no-cache, no-store',
                                        'Pragma': 'no-cache'
                                    },
                                    cache: 'no-store'
                                });

                                if (refreshResponse.ok) {
                                    const refreshData = await refreshResponse.json();
                                    if (refreshData.success && refreshData.authenticated) {
                                        this.token = "verified-via-http-only";
                                        if (retryCount < maxRetries) {
                                            retryCount++;
                                            return executeRequest();
                                        }
                                    }
                                }
                            } catch (refreshError) {
                                trace.error("Last-resort authentication failed", refreshError as Error, this.clientContext);
                            }
                        }

                        throw new OBPApiError("Not authenticated", 401);
                    } else {
                        const errorText = await response.text();
                        trace.error(
                            `API request failed: ${response.status}`,
                            new Error(errorText),
                            { ...this.clientContext, status: response.status, url }
                        );
                        throw new OBPApiError("Request failed", response.status, errorText);
                    }
                }

                const responseData = await response.json();
                trace.debug(
                    `Request successful: ${method} ${endpoint}`,
                    {
                        ...this.clientContext,
                        status: response.status,
                        dataSize: JSON.stringify(responseData).length
                    }
                );
                return responseData;
            } catch (error) {
                trace.error(`API request failed: ${method} ${endpoint}`, error as Error, this.clientContext);
                throw error;
            }
        };

        return executeRequest();
    }
}

// Create and export a singleton instance
export const createDirectLoginClient = (): DirectLoginClient => {
    if (!API_BASE_URL) {
        throw new ConfigurationError("API_BASE_URL is not configured");
    }
    return new DirectLoginClient(API_BASE_URL);
};