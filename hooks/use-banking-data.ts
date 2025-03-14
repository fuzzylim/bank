"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  type Account,
  type Transaction,
  type FinancialGoal,
  obpApi,
  transformAccounts,
  transformTransactions,
  APIError,
  ConfigurationError,
} from "@/lib/open-banking-api"
import Cookies from "js-cookie"
import { OBPApiError } from "@/lib/banking/errors"

// Mock financial goals since they're not typically provided by banking APIs
const MOCK_FINANCIAL_GOALS: FinancialGoal[] = [
  {
    id: "1",
    title: "Emergency Fund",
    subtitle: "3 months of expenses saved",
    icon: "PiggyBank",
    iconStyle: "savings",
    date: "Target: Dec 2024",
    amount: "$15,000",
    status: "in-progress",
    progress: 65,
  },
  {
    id: "2",
    title: "Stock Portfolio",
    subtitle: "Tech sector investment plan",
    icon: "TrendingUp",
    iconStyle: "investment",
    date: "Target: Jun 2024",
    amount: "$50,000",
    status: "pending",
    progress: 30,
  },
  {
    id: "3",
    title: "Debt Repayment",
    subtitle: "Student loan payoff plan",
    icon: "CreditCard",
    iconStyle: "debt",
    date: "Target: Mar 2025",
    amount: "$25,000",
    status: "in-progress",
    progress: 45,
  },
]

// Default bank and account IDs for demo purposes
const DEFAULT_BANK_ID = "rbs"
const DEFAULT_VIEW_ID = "owner"

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

interface CachedData {
  timestamp: number;
  data: any;
}

// Simple in-memory cache
const cache: Record<string, CachedData> = {};

// Function to get data from cache or fetch it
const getCachedOrFetch = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  const now = Date.now();
  const cachedItem = cache[cacheKey];

  if (cachedItem && now - cachedItem.timestamp < CACHE_EXPIRATION) {
    console.log(`Using cached data for ${cacheKey}`);
    return cachedItem.data as T;
  }

  console.log(`Fetching fresh data for ${cacheKey}`);
  const data = await fetchFn();

  // Cache the result
  cache[cacheKey] = {
    timestamp: now,
    data
  };

  return data;
};

export function useBankingData() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>(MOCK_FINANCIAL_GOALS)
  const [totalBalance, setTotalBalance] = useState<string>("$0.00")
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [selectedBank, setSelectedBank] = useState<string>(DEFAULT_BANK_ID)
  const [authCheckComplete, setAuthCheckComplete] = useState<boolean>(false)
  const [username, setUsername] = useState<string>("")

  // Generate more realistic financial goals based on account data
  const generateFinancialGoals = useCallback((accounts: Account[]): FinancialGoal[] => {
    // Start with the mock goals
    const goals = [...MOCK_FINANCIAL_GOALS];

    // If we have accounts, create some realistic goals based on them
    if (accounts.length > 0) {
      // Find savings accounts
      const savingsAccounts = accounts.filter(a => a.type === "savings");
      if (savingsAccounts.length > 0) {
        const savingsAccount = savingsAccounts[0];
        const currentBalance = parseFloat(savingsAccount.balance);
        const targetAmount = Math.round(currentBalance * 1.5);

        // Add a savings goal
        goals.push({
          id: "auto-savings-1",
          title: "Savings Goal",
          subtitle: `Increase ${savingsAccount.title} balance by 50%`,
          icon: "PiggyBank",
          iconStyle: "savings",
          date: `Target: ${new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
          amount: `$${targetAmount.toFixed(2)}`,
          status: "in-progress",
          progress: Math.min(Math.round((currentBalance / targetAmount) * 100), 100),
        });
      }

      // Find debt accounts
      const debtAccounts = accounts.filter(a => a.type === "debt");
      if (debtAccounts.length > 0) {
        const debtAccount = debtAccounts[0];
        const currentDebt = parseFloat(debtAccount.balance);

        // Add a debt reduction goal
        goals.push({
          id: "auto-debt-1",
          title: "Debt Reduction",
          subtitle: `Pay off ${debtAccount.title}`,
          icon: "CreditCard",
          iconStyle: "debt",
          date: `Target: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
          amount: `$${currentDebt.toFixed(2)}`,
          status: "in-progress",
          progress: 10, // Assuming just started
        });
      }
    }

    return goals;
  }, []);

  // Helper function to emit login progress events
  const emitLoginProgress = useCallback((type: string, stage: string, accountsTotal?: number, currentAccount?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('loginProgress', {
        detail: {
          type,
          stage,
          accountsTotal,
          currentAccount
        }
      }));
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Ensure user sees progress, even if data is from cache
      const minProgressDelay = 300; // Minimum ms to show each progress step

      // Emit bank loading start event
      emitLoginProgress('banks', 'start');

      // Track start time for minimum display
      const banksStartTime = Date.now();

      // Get banks with caching
      const banksData: any = await getCachedOrFetch('banks', async () => {
        console.log("Fetching banks from API...");
        const result = await obpApi.getBanks();
        console.log("Raw API response:", JSON.stringify(result).substring(0, 100) + "...");
        return result;
      });

      // Ensure minimum display time for progress
      const banksElapsed = Date.now() - banksStartTime;
      if (banksElapsed < minProgressDelay) {
        await new Promise(resolve => setTimeout(resolve, minProgressDelay - banksElapsed));
      }

      // Emit bank loading complete event
      emitLoginProgress('banks', 'complete');

      console.log("Full banksData structure:", JSON.stringify(banksData).substring(0, 300) + "...");

      // Handle different possible response formats
      let banks: any[] = [];
      if (Array.isArray(banksData)) {
        console.log("banksData is an array");
        banks = banksData;
      } else if (banksData && typeof banksData === 'object') {
        console.log("banksData is an object with keys:", Object.keys(banksData));

        if ('banks' in banksData && Array.isArray(banksData.banks)) {
          console.log("Found banks array in banksData.banks");
          banks = banksData.banks;
        } else if ('data' in banksData && typeof banksData.data === 'object') {
          console.log("Found data object in banksData.data with keys:", Object.keys(banksData.data));

          if ('banks' in banksData.data && Array.isArray(banksData.data.banks)) {
            console.log("Found banks array in banksData.data.banks with length:", banksData.data.banks.length);
            banks = banksData.data.banks;
          } else if (Array.isArray(banksData.data)) {
            console.log("banksData.data is an array with length:", banksData.data.length);
            banks = banksData.data;
          }
        }
      }

      console.log("Received banks data:", {
        format: typeof banksData,
        isArray: Array.isArray(banksData),
        hasBanksProperty: !Array.isArray(banksData) && typeof banksData === 'object' && 'banks' in banksData,
        hasDataProperty: !Array.isArray(banksData) && typeof banksData === 'object' && 'data' in banksData,
        dataHasBanksProperty: !Array.isArray(banksData) && typeof banksData === 'object' && 'data' in banksData &&
          typeof banksData.data === 'object' && 'banks' in banksData.data,
        finalBanksCount: banks.length
      });

      if (banks.length === 0) {
        setError("No banks available")
        return
      }

      // Use selected bank or default to first bank
      const bankId = selectedBank || banks[0]?.id || DEFAULT_BANK_ID;
      setSelectedBank(bankId);

      // Emit accounts loading start event
      emitLoginProgress('accounts', 'start');

      // Track start time for minimum display
      const accountsStartTime = Date.now();

      // Get accounts with caching and retry for auth failures
      // Initial progress indication - we don't know the account count yet
      // Use a minimum of 5 steps for better UX until we know the real count
      const INITIAL_STEPS = 5;
      emitLoginProgress('accounts', 'start', INITIAL_STEPS, 0);

      // First progress update
      await new Promise(resolve => setTimeout(resolve, minProgressDelay / 2));
      emitLoginProgress('accounts', 'progress', INITIAL_STEPS, 1);

      const accountsData: Array<any> | { accounts: Array<any> } = await getCachedOrFetch(`accounts-${bankId}`, async () => {
        try {
          return await obpApi.getAccounts(bankId);
        } catch (error: unknown) {
          // If we get an authentication error, try once more after forcing a token check
          if (error instanceof OBPApiError && error.message === "Not authenticated") {
            console.log("Authentication error getting accounts, attempting recovery...");

            // Clear any stale token state
            Cookies.remove("obp_token");
            Cookies.remove("obp_token", { path: '/' });

            // Force a fresh authentication check
            const refreshResponse = await fetch(`/api/test-connection?client=true&refresh=true&_=${Date.now()}`, {
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache, no-store',
                'Pragma': 'no-cache'
              },
              cache: 'no-store'
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.authenticated) {
                console.log("Authentication recovered, retrying accounts fetch");
                return await obpApi.getAccounts(bankId);
              }
            }
          }

          // Re-throw the error if recovery failed or it's not an auth error
          throw error;
        }
      });

      // Handle both array format and {accounts: [...]} format
      const obpAccounts = Array.isArray(accountsData)
        ? accountsData
        : (accountsData as any)?.accounts || [];

      console.log("Received accounts data:", {
        format: Array.isArray(accountsData) ? "array" : "object",
        count: obpAccounts.length
      });

      // Ensure minimum display time for progress
      const accountsElapsed = Date.now() - accountsStartTime;
      if (accountsElapsed < minProgressDelay) {
        await new Promise(resolve => setTimeout(resolve, minProgressDelay - accountsElapsed));
      }

      // Second progress update
      await new Promise(resolve => setTimeout(resolve, minProgressDelay / 2));
      emitLoginProgress('accounts', 'progress', INITIAL_STEPS, 2);

      // Store the actual account count for reuse
      const actualAccountCount = obpAccounts.length;

      // Emit accounts loading complete event with the real account count
      emitLoginProgress('accounts', 'complete', actualAccountCount, actualAccountCount);

      // Add additional check to ensure obpAccounts is valid
      if (!obpAccounts || !Array.isArray(obpAccounts) || obpAccounts.length === 0) {
        console.error("Invalid accounts data received:", obpAccounts);
        setError("Failed to fetch valid account data");
        setIsLoading(false);
        return;
      }

      const transformedAccounts = transformAccounts(obpAccounts)
      setAccounts(transformedAccounts)

      // Calculate total balance more safely
      let total = 0;
      try {
        total = transformedAccounts.reduce((sum: number, account: Account) => {
          // Safely parse the balance, defaulting to 0 if it's invalid
          const accountBalance = !isNaN(Number.parseFloat(account.balance))
            ? Number.parseFloat(account.balance)
            : 0;
          return sum + accountBalance;
        }, 0);
      } catch (error) {
        console.error("Error calculating total balance:", error);
        // Default to 0 if the calculation fails
        total = 0;
      }
      setTotalBalance(`$${total.toFixed(2)}`)

      // Generate financial goals based on accounts
      const goals = generateFinancialGoals(transformedAccounts);
      setFinancialGoals(goals);

      let allTransactions: Transaction[] = []

      // Emit transactions loading start event with total accounts count
      const transactionsStartTime = Date.now();

      // Use actual account count from above for transaction progress
      const accountCount = Math.max(actualAccountCount, 1); // Ensure at least 1 for UI feedback

      // Update loading-screen with the real account count for transactions
      emitLoginProgress('transactions', 'start', accountCount, 0);

      // Fetch transactions for each account
      let processedCount = 0;

      // If there are no accounts, simulate some progress
      if (obpAccounts.length === 0) {
        for (let i = 0; i <= 100; i += 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          emitLoginProgress('transactions', 'progress', 1, 0.2);
        }
        emitLoginProgress('transactions', 'complete', 1, 1);
        return;
      }
      for (const account of obpAccounts) {
        // Check if views_available exists and is an array before using find()
        const viewId = Array.isArray(account.views_available)
          ? account.views_available.find((v: { id: string }) => v.id.includes("owner"))?.id || DEFAULT_VIEW_ID
          : DEFAULT_VIEW_ID
        try {
          // Get transactions with caching
          const transactionsData: Array<any> | { transactions: Array<any> } = await getCachedOrFetch(
            `transactions-${bankId}-${account.id}-${viewId}`,
            async () => {
              return await obpApi.getTransactions(bankId, account.id, viewId);
            }
          );

          // Handle both array format and {transactions: [...]} format
          const normalizedTransactions = Array.isArray(transactionsData)
            ? transactionsData
            : (transactionsData as any)?.transactions || [];

          const transformedTransactions = transformTransactions(normalizedTransactions)
          allTransactions = [...allTransactions, ...transformedTransactions]

          // Update progress after each account is processed
          processedCount++;
          emitLoginProgress('transactions', 'progress', obpAccounts.length, processedCount);
        } catch (err) {
          console.error(`Error fetching transactions for account ${account.id}:`, err)
          // Still increment processed count even if there was an error
          processedCount++;
          emitLoginProgress('transactions', 'progress', obpAccounts.length, processedCount);
        }
      }

      // Ensure a minimum transactions loading display time
      const transactionsElapsed = Date.now() - transactionsStartTime;
      const minTransactionsDelay = minProgressDelay * 2; // Give transactions twice the minimum delay
      if (transactionsElapsed < minTransactionsDelay) {
        await new Promise(resolve => setTimeout(resolve, minTransactionsDelay - transactionsElapsed));
      }

      // Emit transactions loading complete event
      emitLoginProgress('transactions', 'complete', obpAccounts.length, obpAccounts.length);

      // Sort transactions by date (ISO string format)
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setTransactions(allTransactions)
      setIsAuthenticated(true)
    } catch (err: unknown) {
      console.error("Error fetching data:", err)
      if (err instanceof APIError) {
        if (err.status === 401) {
          Cookies.remove("obp_token")
          Cookies.remove("obp_token", { path: '/' })
          setIsAuthenticated(false)
          router.push("/login")
          return
        }
        setError(err.message)
      } else if (err instanceof ConfigurationError) {
        setError(err.message)
      } else if (err instanceof OBPApiError) {
        console.error("Failed to fetch banks:", err.message);
        if (err.status === 401) {
          Cookies.remove("obp_token")
          Cookies.remove("obp_token", { path: '/' })
          setIsAuthenticated(false)
          router.push("/login")
          return
        }
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to fetch banking data. Please try again later.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [router, selectedBank, generateFinancialGoals])

  // Initialize from cookie when component mounts
  useEffect(() => {
    const checkAuthentication = async () => {
      // Skip if we've already completed the auth check
      if (authCheckComplete) {
        return;
      }

      // Check if we're on the login page - don't redirect if we are
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      const isLoginPage = currentPath === "/login" || currentPath.includes("/login");

      // Always clear the logged_out flag when on the login page
      if (isLoginPage && typeof window !== "undefined" && window.localStorage) {
        const wasLoggedOut = window.localStorage.getItem('logged_out');
        if (wasLoggedOut) {
          console.log("On login page, clearing logout flag");
          window.localStorage.removeItem('logged_out');
        }
      }

      // Reset loading state for every authentication check
      setIsLoading(true);
      console.log("Starting authentication check...");

      try {
        // First check for client-side cookie
        const token = Cookies.get("obp_token");
        if (token) {
          console.log("Found client-side cookie token");

          // Set the token in the API client
          obpApi.setToken(token);

          // Verify token still works with a test connection
          const testResponse = await fetch('/api/test-connection?client=true&_=' + Date.now(), {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store',
              'Pragma': 'no-cache'
            },
            cache: 'no-store'
          });

          if (testResponse.ok) {
            const testData = await testResponse.json();
            if (testData.success && testData.authenticated) {
              console.log("Client-side token verified as authenticated");
              setIsAuthenticated(true);
              // Remove any logged out flag
              if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.removeItem('logged_out');

                // Try to retrieve username from localStorage
                const savedUsername = window.localStorage.getItem('obp_username');
                if (savedUsername) {
                  setUsername(savedUsername);
                }
              }

              // Fetch data immediately
              fetchData();
              setAuthCheckComplete(true);

              // Redirect to dashboard if we're on the login page
              // Redirect to dashboard if we're on the login page
              if (isLoginPage) {
                router.push("/dashboard");
              }
              return;
            } else {
              console.log("Client-side token present but not authenticated:", testData);
              // Continue to HttpOnly cookie check
            }
          }
        }

        // If no valid client-side cookie, check if we have an HttpOnly cookie via test endpoint
        try {
          console.log("Checking for HttpOnly cookie authentication");

          // Add cache-busting parameter
          const cacheBuster = Date.now();

          // First attempt to validate using our test-connection API
          const response = await fetch(`/api/test-connection?client=true&_=${cacheBuster}`, {
            credentials: 'include', // Important to include cookies
            headers: {
              'Cache-Control': 'no-cache, no-store',  // Prevent caching
              'Pragma': 'no-cache'
            },
            cache: 'no-store'
          });

          if (response.ok) {
            const data = await response.json();
            console.log("Test connection response:", data);

            if (data.success && data.authenticated) {
              console.log("Authenticated via HttpOnly cookie");
              setIsAuthenticated(true);

              // Remove any logged out flag
              if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.removeItem('logged_out');

                // Try to retrieve username from localStorage
                const savedUsername = window.localStorage.getItem('obp_username');
                if (savedUsername) {
                  setUsername(savedUsername);
                }
              }

              // Fetch data immediately
              fetchData();
              setAuthCheckComplete(true);

              // Redirect to dashboard if we're on the login page
              if (isLoginPage) {
                router.push("/dashboard");
              }
              return;
            } else {
              console.log("Test connection successful but not authenticated:", data);

              // Only try banks API if not explicitly marked as not authenticated
              // This prevents unnecessary API calls after logout
              if (!data.hasOwnProperty('authenticated') || data.authenticated !== false) {
                // Try a second approach: make a direct API call to banks to check authentication
                try {
                  const banksResponse = await fetch(`/api/banks?_=${cacheBuster}`, {
                    credentials: 'include',
                    headers: {
                      'Cache-Control': 'no-cache, no-store',
                      'Pragma': 'no-cache'
                    },
                    cache: 'no-store'
                  });

                  // If we get data back, we're authenticated
                  if (banksResponse.ok) {
                    console.log("Authenticated via direct banks API call");
                    setIsAuthenticated(true);

                    // Remove any logged out flag
                    if (typeof window !== "undefined" && window.localStorage) {
                      window.localStorage.removeItem('logged_out');

                      // Try to retrieve username from localStorage
                      const savedUsername = window.localStorage.getItem('obp_username');
                      if (savedUsername) {
                        setUsername(savedUsername);
                      }
                    }

                    fetchData();
                    setAuthCheckComplete(true);

                    // Redirect to dashboard if we're on the login page
                    if (isLoginPage) {
                      router.push("/dashboard");
                    }
                    return;
                  } else {
                    console.log("Banks API call failed:", banksResponse.status);
                  }
                } catch (banksError) {
                  console.error("Error checking banks API:", banksError);
                }
              }
            }
          } else {
            console.log("Test connection failed:", response.status);
          }
        } catch (testError) {
          console.error("Error checking authentication status:", testError);
        }

        // If we get here, we're not authenticated
        console.log("No valid authentication found, setting isAuthenticated to false");
        setIsAuthenticated(false);
        setIsLoading(false);

        // Only redirect to login if we're not already on the login page
        // and we're not on the root page (which might handle redirection itself)
        if (!isLoginPage && currentPath !== "/") {
          console.log("Not authenticated, redirecting to login page");
          router.push("/login");
        }
      } catch (error) {
        console.error("Error initializing from cookie:", error);
        setIsLoading(false);
        setIsAuthenticated(false);
      }

      // Mark auth check as complete even if there was an error
      setAuthCheckComplete(true);
    };

    checkAuthentication();
  }, [router, authCheckComplete, fetchData]); // Add fetchData to dependencies

  // Remove the second effect that was causing the infinite loop
  // The data fetching is now handled in the first effect and in the login function
  const login = async (username: string, password: string, preventRedirect = false): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Explicitly clear any logout flag before trying to log in
      if (typeof window !== 'undefined' && window.localStorage) {
        console.log("Clearing any existing logout flag during login");
        window.localStorage.removeItem('logged_out');
      }

      console.log("Attempting login for user:", username);

      // Get token from API - this will also set it in the client and save to cookie
      const token = await obpApi.login(username, password)
      console.log("Login successful, token received");

      // Store the username in state
      setUsername(username)

      // Also store in localStorage for persistence across page reloads
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('obp_username', username);
      }
      console.log("Login successful, token received");

      // Verify we have the token in a cookie for future page loads
      const savedToken = Cookies.get("obp_token");
      if (!savedToken && token) {
        // If the HttpOnly cookie wasn't set by the server for some reason,
        // set a client-side cookie as fallback
        console.log("Setting fallback client-side cookie");
        Cookies.set("obp_token", token, {
          expires: 7,
          sameSite: 'strict',
          path: '/'
        });
      }

      // Set authenticated state immediately
      setIsAuthenticated(true)

      // Mark auth check as complete to prevent unnecessary checks
      setAuthCheckComplete(true)

      // Make another explicit check to ensure logout flag is removed
      if (typeof window !== 'undefined' && window.localStorage) {
        console.log("Double-checking logout flag is removed after successful login");
        window.localStorage.removeItem('logged_out');
      }

      // No longer fetch data here - this will be done separately in the loading page
      console.log("Authentication completed successfully - data will be loaded separately");

      // Return successfully - navigation will be handled by the component
      return;
    } catch (err) {
      console.error("Login error:", err)
      setIsAuthenticated(false)
      // Always throw an Error object to ensure consistent error handling
      if (err instanceof APIError) {
        throw new Error(`Authentication failed: ${err.message}`)
      } else if (err instanceof ConfigurationError) {
        throw new Error(`Configuration error: ${err.message}`)
      } else if (err instanceof Error) {
        throw err; // Re-throw Error objects directly
      } else {
        throw new Error("An unexpected error occurred during login")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Reset client state first to prevent any pending requests
      setAccounts([])
      setTransactions([])
      setTotalBalance("$0.00")
      setIsAuthenticated(false)
      setUsername("") // Clear username on logout

      // Explicitly reset token in DirectLoginClient immediately
      obpApi.setToken("");

      // Clear username from localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('obp_username');
      }

      // Clear all cache entries
      Object.keys(cache).forEach(key => {
        delete cache[key];
      });

      // Add cache-busting parameter
      const cacheBuster = Date.now();

      // Call the logout API to clear HttpOnly cookie
      const response = await fetch(`/api/auth/logout?_=${cacheBuster}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });

      console.log("Logout API response:", response.status);

      // Remove client-side cookie with different paths to ensure complete removal
      Cookies.remove("obp_token");
      Cookies.remove("obp_token", { path: '/' });
      Cookies.remove("obp_token", { path: '/api' });

      // Set authCheckComplete to false to force a re-check on next navigation
      setAuthCheckComplete(false)

      console.log("Logout completed, redirecting to login page");

      // Add a small delay before navigation to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navigate to login page with query parameter to avoid redirect loop
      router.push("/login?logged_out=true");

      // Set logout flag AFTER starting the navigation
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          console.log("Setting logged_out flag after navigation");
          window.localStorage.setItem('logged_out', 'true');
        }
      }, 100);
    } catch (error) {
      console.error("Error during logout:", error);

      // Even if the API call fails, still clear client state and redirect
      obpApi.setToken("");
      Cookies.remove("obp_token");
      Cookies.remove("obp_token", { path: '/' });
      Cookies.remove("obp_token", { path: '/api' });
      setIsAuthenticated(false);

      // Navigate to login page
      router.push("/login");
    }
  }

  // Function to get paginated transactions
  const getPaginatedTransactions = useCallback((page: number = 1, pageSize: number = 10) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return transactions.slice(startIndex, endIndex);
  }, [transactions]);

  // Function to select a different bank
  const selectBank = useCallback((bankId: string) => {
    if (bankId !== selectedBank) {
      setSelectedBank(bankId);
      // Fetch data for the new bank
      fetchData();
    }
  }, [selectedBank, fetchData]);

  // Function to clear the cache and force a refresh
  const forceRefresh = useCallback(() => {
    // Clear all cache entries
    Object.keys(cache).forEach(key => {
      delete cache[key];
    });

    // Emit a start event for refresh operation
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('loginRefresh', {
        detail: { refreshing: true }
      }));
    }

    // Fetch fresh data with progress tracking
    return fetchData().finally(() => {
      // Emit completion event when done
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('loginRefresh', {
          detail: { refreshing: false }
        }));
      }
    });
  }, [fetchData]);

  // Function to send money between accounts
  const sendMoney = useCallback(async (fromAccountId: string, toAccountId: string, amount: string, description?: string) => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/accounts/${selectedBank}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount,
          description: description || 'Money transfer'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send money');
      }

      const result = await response.json();

      // Add the new transaction to the transactions array
      if (result.transaction) {
        setTransactions(prevTransactions => [result.transaction, ...prevTransactions]);

        // Update account balances based on the transaction
        const fromAccount = accounts.find(acc => acc.id === fromAccountId);
        const toAccount = accounts.find(acc => acc.id === toAccountId);

        if (fromAccount && toAccount) {
          const transactionAmount = parseFloat(amount);

          // Update accounts with new balances
          setAccounts(prevAccounts => prevAccounts.map(account => {
            if (account.id === fromAccountId) {
              const newBalance = (parseFloat(account.balance) - transactionAmount).toFixed(2);
              return { ...account, balance: newBalance };
            }
            if (account.id === toAccountId) {
              const newBalance = (parseFloat(account.balance) + transactionAmount).toFixed(2);
              return { ...account, balance: newBalance };
            }
            return account;
          }));

          // Recalculate total balance (no change to total since it's just a transfer)
          // But we update the display for consistency
          const total = accounts.reduce((sum, account) => {
            return sum + (account.id === fromAccountId
              ? parseFloat(account.balance) - transactionAmount
              : account.id === toAccountId
                ? parseFloat(account.balance) + transactionAmount
                : parseFloat(account.balance));
          }, 0);

          setTotalBalance(`$${total.toFixed(2)}`);
        }
      }

      return result;
    } catch (error) {
      console.error('Error sending money:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [selectedBank, forceRefresh]);

  // Function to top up an account
  const topUpAccount = useCallback(async (accountId: string, amount: string, method?: string) => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/accounts/${selectedBank}/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          amount,
          method: method || 'standard transfer'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to top up account');
      }

      const result = await response.json();

      // Add the new transaction to the transactions array
      if (result.transaction) {
        setTransactions(prevTransactions => [result.transaction, ...prevTransactions]);

        // Update account balance for the topped-up account
        const account = accounts.find(acc => acc.id === accountId);

        if (account) {
          const transactionAmount = parseFloat(amount);

          // Update account with new balance
          setAccounts(prevAccounts => prevAccounts.map(acc => {
            if (acc.id === accountId) {
              const newBalance = (parseFloat(acc.balance) + transactionAmount).toFixed(2);
              return { ...acc, balance: newBalance };
            }
            return acc;
          }));

          // Recalculate total balance (increased by the top-up amount)
          const total = accounts.reduce((sum, acc) => {
            return sum + (acc.id === accountId
              ? parseFloat(acc.balance) + transactionAmount
              : parseFloat(acc.balance));
          }, 0);

          setTotalBalance(`$${total.toFixed(2)}`);
        }
      }

      return result;
    } catch (error) {
      console.error('Error topping up account:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [selectedBank, forceRefresh]);

  return {
    isLoading,
    error,
    accounts,
    transactions,
    getPaginatedTransactions,
    financialGoals,
    totalBalance,
    isAuthenticated,
    authCheckComplete,
    username,
    login,
    logout,
    refreshData: fetchData,
    forceRefresh,
    selectBank,
    selectedBank,
    sendMoney,
    topUpAccount
  }
}
