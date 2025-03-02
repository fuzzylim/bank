import { trace, traceAsync } from "./tracing";
import { APIError, ConfigurationError } from "./errors";
import { getConsumerKey, API_BASE_URL } from "./config";

class DirectLoginClient {
    private token: string | null = null;
    private clientContext: Record<string, string> = {};

    constructor(private baseUrl: string) {
        this.clientContext = {
            clientType: typeof window !== "undefined" ? "browser" : "server",
            baseUrl: this.baseUrl
        };

        if (typeof window !== "undefined") {
            trace.debug("Initializing client-side token", this.clientContext);
            setTimeout(async () => {
                await this.initializeFromCookie();
            }, 0);
        }
    }

    hasToken(): boolean {
        return this.token !== null && this.token !== undefined && this.token !== '';
    }

    private async initializeFromCookie(): Promise<void> {
        try {
            if (this.token) {
                trace.debug("Token already loaded in memory", this.clientContext);
                return;
            }

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

                const hasHttpOnlyCookie = await this.verifyTokenWithTestRequest();
                if (hasHttpOnlyCookie) {
                    trace.info("Successfully verified HttpOnly cookie token", this.clientContext);
                    return;
                }

                trace.debug("No authentication token found in cookies", this.clientContext);
            }
        } catch (error) {
            trace.error("Failed to load token from cookie", error as Error, this.clientContext);
        }
    }

    private async verifyTokenWithTestRequest(): Promise<boolean> {
        try {
            const response = await fetch('/api/test-connection?client=true', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.authenticated) {
                    trace.info("Token verified via test request", this.clientContext);
                    this.token = "verified-via-http-only";
                    return true;
                }
            }
            return false;
        } catch (error) {
            trace.error("Failed to verify token with test request", error as Error, this.clientContext);
            return false;
        }
    }

    setToken(token: string, saveToCookie = true): void {
        void this.setTokenAsync(token, saveToCookie);
    }

    private async setTokenAsync(token: string, saveToCookie = true): Promise<void> {
        if (!token) {
            trace.info("Clearing authentication token", this.clientContext);
            this.token = null;

            if (typeof window !== "undefined") {
                try {
                    const Cookies = require('js-cookie');
                    Cookies.remove("obp_token");
                    Cookies.remove("obp_token", { path: '/' });
                    trace.debug("Token cookie removed", this.clientContext);

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

        if (saveToCookie && typeof window !== "undefined") {
            try {
                const Cookies = require('js-cookie');
                Cookies.set("obp_token", token, {
                    expires: 7,
                    sameSite: 'strict',
                    path: '/'
                });
                trace.debug("Token saved to cookie", this.clientContext);

                if (window.localStorage) {
                    window.localStorage.setItem('obp_authenticated', 'true');
                }
            } catch (error) {
                trace.error("Failed to save token to cookie", error as Error, this.clientContext);
            }
        }
    }

    async login(username: string, password: string): Promise<string> {
        try {
            trace.info("Attempting login", { ...this.clientContext, username });

            const consumerKey = getConsumerKey();
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
                    new APIError("Authentication failed", response.status, errorText),
                    { ...this.clientContext, status: response.status }
                );
                throw new APIError("Authentication failed", response.status, errorText);
            }

            const data = await response.json();
            if (!data.token) {
                throw new APIError("No token received in response");
            }

            trace.info("Login successful", this.clientContext);
            this.setToken(data.token);
            return data.token;
        } catch (error) {
            trace.error("Login failed", error as Error, this.clientContext);
            throw error;
        }
    }

    async request<T>(endpoint: string, method = "GET", data?: any): Promise<T> {
        try {
            if (!this.token && typeof window !== "undefined") {
                await this.initializeFromCookie();

                if (!this.token) {
                    await this.verifyTokenWithTestRequest();
                }
            }

            trace.debug(`API request: ${method} ${endpoint}`, { ...this.clientContext, hasData: !!data });

            const headers: HeadersInit = {
                "Content-Type": "application/json",
            };

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

            const response = await fetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined,
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    trace.warn("Unauthorized API request, clearing token", this.clientContext);
                    this.token = null;
                    if (typeof window !== "undefined") {
                        try {
                            const Cookies = require('js-cookie');
                            Cookies.remove("obp_token");
                        } catch (error) {
                            trace.error("Failed to remove token cookie", error as Error, this.clientContext);
                        }
                    }

                    const hasHttpOnlyCookie = await this.verifyTokenWithTestRequest();
                    if (!hasHttpOnlyCookie) {
                        throw new APIError("Not authenticated", 401);
                    }
                } else {
                    const errorText = await response.text();
                    trace.error(
                        `API request failed: ${response.status}`,
                        new Error(errorText),
                        { ...this.clientContext, status: response.status, url }
                    );
                    throw new APIError("Request failed", response.status, errorText);
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
    }
}

export const client = new DirectLoginClient(API_BASE_URL);
