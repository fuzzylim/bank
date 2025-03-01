import { trace, traceAsync } from "./tracing";
import { ApiError } from "./api-utils";

// Configuration helpers
const getConsumerKey = () => {
  if (typeof window === "undefined") {
    // Server-side
    return process.env.OBP_CONSUMER_KEY;
  } else {
    // Client-side
    return null; // Don't expose the consumer key on the client
  }
};

const API_BASE_URL = (typeof window === "undefined"
  ? process.env.API_BASE_URL
  : process.env.NEXT_PUBLIC_API_BASE_URL) as string | undefined;

const API_VERSION = (typeof window === "undefined"
  ? process.env.OBP_API_VERSION
  : "v5.1.0") as string | undefined;

// Types for Open Bank Project API responses
export interface OBPBank {
  id: string;
  short_name: string;
  full_name: string;
  logo: string;
  website: string;
}

export interface OBPAccount {
  id: string;
  label: string;
  bank_id: string;
  account_type: string;
  balance: {
    amount: string;
    currency: string;
  };
  account_routings: Array<{
    scheme: string;
    address: string;
  }>;
  views_available: Array<{
    id: string;
    short_name: string;
    is_public: boolean;
  }>;
}

export interface OBPTransaction {
  id: string;
  this_account: {
    id: string;
    bank_id: string;
  };
  other_account: {
    id: string;
    holder: {
      name: string;
    };
    metadata: {
      image_URL: string;
    };
  };
  details: {
    type: string;
    description: string;
    posted: string;
    completed: string;
    new_balance: {
      amount: string;
      currency: string;
    };
    value: {
      amount: string;
      currency: string;
    };
  };
  metadata: {
    narrative: string;
    tags: string[];
    images: string[];
  };
}

// Transformed types for our application
export interface Account {
  id: string;
  title: string;
  description?: string;
  balance: string;
  currency: string;
  type: "savings" | "checking" | "investment" | "debt";
  accountNumber?: string;
  bankId: string;
  viewId: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: string;
  type: "incoming" | "outgoing";
  category: string;
  icon: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
  description?: string;
  otherParty?: string;
  date: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconStyle: string;
  date: string;
  amount?: string;
  status: "pending" | "in-progress" | "completed";
  progress?: number;
}

// Error classes
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public responseText?: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

/**
 * Client for Direct Login authentication and API requests to OBP
 */
class DirectLoginClient {
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
  hasToken(): boolean {
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

        // Check if we can verify token existence by making a test request
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

  // Verify token by making a test request
  private async verifyTokenWithTestRequest(): Promise<boolean> {
    try {
      // Make a simple request to the API to check if the HttpOnly cookie works
      const response = await fetch('/api/test-connection?client=true', {
        method: 'GET',
        credentials: 'include' // Important: include cookies in the request
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.authenticated) {
          trace.info("Token verified via test request", this.clientContext);
          this.token = "verified-via-http-only"; // Just a placeholder, actual token is in HttpOnly cookie
          return true;
        }
      }
      return false;
    } catch (error) {
      trace.error("Failed to verify token with test request", error as Error, this.clientContext);
      return false;
    }
  }

  // Set token and optionally save to cookie
  setToken(token: string, saveToCookie = true): void {
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
  async login(username: string, password: string): Promise<string> {
    try {
      trace.info("Attempting login", { ...this.clientContext, username });

      const consumerKey = getConsumerKey(); // Get the consumer key dynamically
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
      // Set token and save to cookie
      this.setToken(data.token);
      return data.token;
    } catch (error) {
      trace.error("Login failed", error as Error, this.clientContext);
      throw error;
    }
  }

  // Make API request with authentication
  async request<T>(endpoint: string, method = "GET", data?: any): Promise<T> {
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

      // Prepare headers
      const headers: HeadersInit = {
        "Content-Type": "application/json",
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

      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        // Always include credentials to ensure HttpOnly cookies are sent
        credentials: 'include'
      });

      if (!response.ok) {
        // If unauthorized, clear token and throw error
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

          // Try to verify if we have an HttpOnly cookie that might work
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

// Check if API_BASE_URL is configured
if (!API_BASE_URL) {
  throw new ConfigurationError("API_BASE_URL is not configured");
}

// Create client instance
const client = new DirectLoginClient(API_BASE_URL);

/**
 * Open Banking Project API wrapper
 */
export const obpApi = {
  // Login with username and password
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
            throw new APIError(errorData.message || "Authentication failed", response.status);
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
      const token = await client.login(username, password);
      return token;
    } catch (error) {
      trace.error("Login error", error as Error);
      if (error instanceof APIError || error instanceof ConfigurationError) {
        throw error;
      }
      throw new APIError("An unexpected error occurred during login");
    }
  },

  // Set token directly (useful for initializing from cookies or other sources)
  setToken: (token: string): void => {
    client.setToken(token);
  },

  // Get list of available banks
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
              throw new APIError("Not authenticated", 401);
            }
            throw new APIError("Failed to fetch banks", response.status);
          }

          const data = await response.json();
          // Log the actual structure of the response for debugging
          console.log('Banks API response structure:', {
            hasData: !!data,
            dataType: typeof data,
            isArray: Array.isArray(data),
            hasSuccessProperty: data && typeof data === 'object' && 'success' in data,
            hasDataProperty: data && typeof data === 'object' && 'data' in data,
            dataPropertyType: data && typeof data === 'object' && 'data' in data ? typeof data.data : 'N/A',
            hasBanksProperty: data && typeof data === 'object' && 'data' in data && typeof data.data === 'object' && 'banks' in data.data,
            banksPropertyType: data && typeof data === 'object' && 'data' in data && typeof data.data === 'object' && 'banks' in data.data ? typeof data.data.banks : 'N/A',
            banksIsArray: data && typeof data === 'object' && 'data' in data && typeof data.data === 'object' && 'banks' in data.data ? Array.isArray(data.data.banks) : false,
            banksLength: data && typeof data === 'object' && 'data' in data && typeof data.data === 'object' && 'banks' in data.data && Array.isArray(data.data.banks) ? data.data.banks.length : 0
          });

          // Check for NextJS API response wrapper structure (success+data properties)
          if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
            const responseData = data.data;

            // Then check if there's a banks property in the data
            if (responseData && typeof responseData === 'object' && 'banks' in responseData && Array.isArray(responseData.banks)) {
              return responseData.banks;
            } else if (Array.isArray(responseData)) {
              return responseData;
            } else {
              trace.warn("Unexpected data structure inside API success wrapper", { dataType: typeof responseData });
              return [];
            }
          }
          // Fall back to original checks
          else if (data && typeof data === 'object' && 'banks' in data && Array.isArray(data.banks)) {
            return data.banks;
          } else if (Array.isArray(data)) {
            return data;
          } else {
            trace.warn("Unexpected banks API response format", { dataType: typeof data });
            return [];
          }
        } catch (fetchError) {
          trace.error("Fetch banks error", fetchError as Error);
          throw fetchError;
        }
      } else {
        // For server-side, use the client request method
        trace.debug("Fetching banks directly from OBP API");
        const data = await client.request<{ banks: OBPBank[] }>(endpoint);
        return data.banks;
      }
    } catch (error) {
      trace.error("Get banks error", error as Error);
      if (error instanceof APIError || error instanceof ConfigurationError) {
        throw error;
      }
      throw new APIError("An unexpected error occurred while fetching banks");
    }
  },

  // Get accounts for a bank
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
              throw new APIError("Not authenticated", 401);
            }
            throw new APIError("Failed to fetch accounts", response.status);
          }

          const data = await response.json();

          // Log the structure of the accounts data for debugging
          console.log('Accounts API response structure:', {
            hasData: !!data,
            dataType: typeof data,
            isArray: Array.isArray(data),
            hasSuccessProperty: data && typeof data === 'object' && 'success' in data,
            hasDataProperty: data && typeof data === 'object' && 'data' in data,
            dataPropertyType: data && typeof data === 'object' && 'data' in data ? typeof data.data : 'N/A',
            hasAccountsProperty: data && typeof data === 'object' && 'accounts' in data,
            nestedDataHasAccountsProperty: data && typeof data === 'object' && 'data' in data &&
              typeof data.data === 'object' && 'accounts' in data.data
          });

          // Check for NextJS API response wrapper structure (success+data properties)
          if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
            const responseData = data.data;

            // Then check if there's an accounts property in the data
            if (responseData && typeof responseData === 'object' && 'accounts' in responseData && Array.isArray(responseData.accounts)) {
              return responseData.accounts;
            } else if (Array.isArray(responseData)) {
              return responseData;
            } else {
              trace.warn("Unexpected data structure inside API success wrapper", { dataType: typeof responseData });
              return [];
            }
          }
          // Check for direct accounts property
          else if (data && data.accounts && Array.isArray(data.accounts)) {
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
      if (error instanceof APIError || error instanceof ConfigurationError) {
        throw error;
      }
      throw new APIError("An unexpected error occurred while fetching accounts");
    }
  },

  // Get transactions for an account
  getTransactions: async (bankId: string, accountId: string, viewId: string): Promise<OBPTransaction[]> => {
    try {
      // Use different endpoints for client-side and server-side
      const endpoint = typeof window !== "undefined"
        ? `/api/transactions/${bankId}/${accountId}/${viewId}` // Client-side: use Next.js API route
        : `/obp/${API_VERSION}/banks/${bankId}/accounts/${accountId}/${viewId}/transactions`; // Server-side: use direct OBP API

      trace.debug(`Getting transactions for bank ${bankId}, account ${accountId}, view ${viewId}`);

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
              throw new APIError("Not authenticated", 401);
            }
            throw new APIError("Failed to fetch transactions", response.status);
          }

          const data = await response.json();

          // Log the structure of the transactions data for debugging
          console.log('Transactions API response structure:', {
            hasData: !!data,
            dataType: typeof data,
            isArray: Array.isArray(data),
            hasSuccessProperty: data && typeof data === 'object' && 'success' in data,
            hasDataProperty: data && typeof data === 'object' && 'data' in data,
            hasTransactionsProperty: data && typeof data === 'object' && 'transactions' in data,
            nestedDataHasTransactionsProperty: data && typeof data === 'object' && 'data' in data &&
              typeof data.data === 'object' && 'transactions' in data.data
          });

          // Check for NextJS API response wrapper structure (success+data properties)
          if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
            const responseData = data.data;

            // Then check if there's a transactions property in the data
            if (responseData && typeof responseData === 'object' && 'transactions' in responseData && Array.isArray(responseData.transactions)) {
              return responseData.transactions;
            } else if (Array.isArray(responseData)) {
              return responseData;
            } else {
              trace.warn("Unexpected data structure inside API success wrapper for transactions", { dataType: typeof responseData });
              return [];
            }
          }
          // Check for direct transactions property
          else if (data && data.transactions && Array.isArray(data.transactions)) {
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
      if (error instanceof APIError || error instanceof ConfigurationError) {
        throw error;
      }
      throw new APIError("An unexpected error occurred while fetching transactions");
    }
  },

  // Test API connection
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
};

// Data transformation functions
export const transformAccounts = (obpAccounts: OBPAccount[] | undefined): Account[] => {
  // Return empty array if obpAccounts is undefined or null
  if (!obpAccounts) {
    trace.warn("transformAccounts received undefined or null input");
    return [];
  }

  trace.debug(`Transforming ${obpAccounts.length} accounts`);

  return obpAccounts.map((account) => {
    // Determine account type based on account label or type
    let type: "savings" | "checking" | "investment" | "debt" = "checking";
    const label = (account.label ?? "").toLowerCase();
    const accountType = (account.account_type ?? "").toLowerCase();

    if (
      label.includes("saving") ||
      label.includes("reserve") ||
      accountType.includes("saving")
    ) {
      type = "savings";
    } else if (
      label.includes("invest") ||
      label.includes("stock") ||
      label.includes("portfolio") ||
      accountType.includes("investment")
    ) {
      type = "investment";
    } else if (
      label.includes("credit") ||
      label.includes("loan") ||
      label.includes("debt") ||
      accountType.includes("loan") ||
      accountType.includes("credit")
    ) {
      type = "debt";
    }

    // Format balance with proper decimal places
    // Add null check for account.balance to prevent "Cannot read properties of undefined" error
    let balanceAmount = 0;
    let formattedBalance = "0.00";

    try {
      if (account.balance && account.balance.amount !== undefined) {
        balanceAmount = parseFloat(account.balance.amount);
        formattedBalance = balanceAmount.toFixed(2);
      } else {
        trace.warn(`Account ${account.id} has invalid or missing balance data`);
        // Ensure we set safe default values even when balance data is missing
        balanceAmount = 0;
        formattedBalance = "0.00";
      }
    } catch (error) {
      trace.error(`Failed to process balance for account ${account.id}`, error as Error);
      // Safety fallback in case of any error processing the balance
      balanceAmount = 0;
      formattedBalance = "0.00";
    }

    // Get account number from routings if available
    let accountNumber = "";
    if (account.account_routings && Array.isArray(account.account_routings)) {
      accountNumber = account.account_routings.find(r => r.scheme === "IBAN" || r.scheme === "AccountNumber")?.address || "";
    }

    // Safely get viewId from views_available
    let viewId = "owner"; // Default value
    if (account.views_available && Array.isArray(account.views_available)) {
      viewId = account.views_available.find(v => v.id?.includes("owner"))?.id || "owner";
    }

    return {
      id: account.id || `unknown-${Math.random().toString(36).substring(7)}`,
      title: account.label || "Unnamed Account",
      description: account.account_type || "",
      balance: formattedBalance,
      currency: account.balance?.currency || "USD", // Default to USD if currency is missing
      type,
      accountNumber: accountNumber,
      bankId: account.bank_id || "",
      viewId: viewId
    };
  });
};

export const transformTransactions = (obpTransactions: OBPTransaction[]): Transaction[] => {
  // Guard against null/undefined input
  if (!obpTransactions || !Array.isArray(obpTransactions)) {
    trace.warn("transformTransactions received invalid input", { input: typeof obpTransactions });
    return [];
  }

  trace.debug(`Transforming ${obpTransactions.length} transactions`);

  return obpTransactions.map((transaction) => {
    // Safely handle potentially missing properties
    if (!transaction || !transaction.details || !transaction.details.value) {
      trace.warn("Transaction is missing required data", { id: transaction?.id || "unknown" });
      return {
        id: transaction?.id || `unknown-${Math.random().toString(36).substring(7)}`,
        title: "Unknown Transaction",
        amount: "0.00",
        type: "outgoing", // Default value
        category: "other",
        icon: "other",
        timestamp: new Date().toISOString(),
        status: "completed",
        description: "",
        otherParty: "",
        date: new Date().toISOString()
      };
    }

    // Determine if transaction is incoming or outgoing based on amount
    let amount = 0;
    try {
      amount = Number.parseFloat(transaction.details.value.amount || "0");
    } catch (error) {
      trace.warn(`Error parsing amount for transaction ${transaction.id}`, error as Error);
    }
    const type = amount >= 0 ? "incoming" : "outgoing";

    // Determine category based on description or narrative
    let category = "other";
    const description = ((transaction.details?.description || "") ||
      (transaction.metadata?.narrative || "")).toLowerCase();
    const otherParty = (transaction.other_account?.holder?.name || "").toLowerCase();

    // More comprehensive categorization
    if (description.includes("shop") || description.includes("store") || description.includes("purchase") ||
      description.includes("buy") || description.includes("mart") || otherParty.includes("shop") ||
      otherParty.includes("store") || otherParty.includes("retail")) {
      category = "shopping";
    } else if (description.includes("food") || description.includes("restaurant") || description.includes("cafe") ||
      description.includes("coffee") || description.includes("lunch") || description.includes("dinner") ||
      description.includes("breakfast") || otherParty.includes("restaurant") || otherParty.includes("cafe")) {
      category = "food";
    } else if (description.includes("transport") || description.includes("uber") || description.includes("taxi") ||
      description.includes("train") || description.includes("bus") || description.includes("fare") ||
      description.includes("travel") || otherParty.includes("transport") || otherParty.includes("travel")) {
      category = "transport";
    } else if (description.includes("entertainment") || description.includes("movie") || description.includes("subscription") ||
      description.includes("netflix") || description.includes("spotify") || description.includes("game") ||
      description.includes("ticket") || otherParty.includes("entertainment") || otherParty.includes("cinema")) {
      category = "entertainment";
    } else if (description.includes("bill") || description.includes("utility") || description.includes("electric") ||
      description.includes("water") || description.includes("gas") || description.includes("internet") ||
      description.includes("phone") || otherParty.includes("utility") || otherParty.includes("telecom")) {
      category = "bills";
    } else if (description.includes("salary") || description.includes("payroll") || description.includes("income") ||
      description.includes("wage") || otherParty.includes("employer") || otherParty.includes("payroll")) {
      category = "income";
    } else if (description.includes("transfer") || description.includes("sent") || description.includes("received")) {
      category = "transfer";
    }

    // Format date - safely handle potentially missing completed date
    let date = new Date();
    try {
      if (transaction.details?.completed) {
        date = new Date(transaction.details.completed);
      } else {
        trace.warn(`Transaction ${transaction.id} is missing completed date`);
      }
    } catch (error) {
      trace.warn(`Error parsing date for transaction ${transaction.id}`, error as Error);
    }

    const now = new Date();
    let timestamp = "";

    if (date.toDateString() === now.toDateString()) {
      timestamp = `Today, ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")} ${date.getHours() >= 12 ? "PM" : "AM"}`;
    } else if (date.toDateString() === new Date(new Date().setDate(now.getDate() - 1)).toDateString()) {
      timestamp = "Yesterday";
    } else {
      // Format as "Mar 1, 2025" for better readability
      timestamp = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Get a more descriptive title - safely access potentially missing properties
    let title =
      (transaction.other_account?.holder?.name) ||
      (transaction.details?.description) ||
      "Transaction";

    // Add transaction type to the title for better context
    const transactionType = transaction.details?.type || "";
    if (transactionType && !title.includes(transactionType)) {
      title = `${title} (${transactionType})`;
    }

    return {
      id: transaction.id || `unknown-${Math.random().toString(36).substring(7)}`,
      title: title,
      amount: `${Math.abs(amount).toFixed(2)}`,
      type,
      category,
      icon: category, // Use category as icon identifier
      timestamp,
      status: "completed", // Assuming all fetched transactions are completed
      description: transaction.details?.description || transaction.metadata?.narrative || "",
      otherParty: transaction.other_account?.holder?.name || "",
      date: date.toISOString(),
    };
  });
};

// Export the testConnection function
export const testApiConnection = obpApi.testConnection;
