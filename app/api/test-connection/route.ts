import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { trace, traceAsync } from "@/lib/tracing";
import { OBP_ENDPOINTS, ApiError, getApiHeaders } from "@/lib/api-utils";

export async function GET(request: Request) {
  return traceAsync("Test Connection API", async () => {
    try {
      // Check request parameters
      const { searchParams } = new URL(request.url);
      const isClientTest = searchParams.has('client');
      const isRefreshRequest = searchParams.has('refresh');

      trace.info("Test connection request", { isClientTest, isRefreshRequest });

      // Check for authentication token in cookies
      const cookieStore = await cookies();
      const token = cookieStore.get("obp_token");
      let isAuthenticated = false;

      // For client-side tests, we verify the token by making a request
      if (isClientTest) {
        // Generate a cache-busting parameter
        const cacheBuster = Date.now();

        // If we have a token, verify it by making a test request
        if (token) {
          try {
            trace.debug("Verifying token validity");
            const API_BASE_URL = OBP_ENDPOINTS.baseUrl;
            const API_VERSION = OBP_ENDPOINTS.version;

            // Make a simple request to verify the token
            const headers = {
              'Content-Type': 'application/json',
              'Authorization': `DirectLogin token="${token.value}"`,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            };

            // Use users/current endpoint to test authentication
            const response = await fetch(`${API_BASE_URL}/obp/${API_VERSION}/users/current?_=${cacheBuster}`, {
              headers,
              method: 'GET',
              cache: 'no-store'
            });

            // If response is successful, the token is valid
            isAuthenticated = response.ok;
            trace.info(`Token verification result`, { authenticated: isAuthenticated, status: response.status });
          } catch (error) {
            trace.error("Error verifying token", error instanceof Error ? error : new Error(String(error)));
            isAuthenticated = false;
          }
        } else {
          trace.info("No token found in cookie, not authenticated");

          // For refresh requests, make an extra attempt using banks API
          // This handles cases where the HttpOnly cookie exists but isn't detected in the normal flow
          if (isRefreshRequest) {
            try {
              trace.info("Refresh requested - attempting to verify with banks API");
              const banksResponse = await fetch(`/api/banks?_=${cacheBuster}`, {
                method: 'GET',
                headers: {
                  'Cache-Control': 'no-cache, no-store',
                  'Pragma': 'no-cache'
                },
                credentials: 'include',
                cache: 'no-store'
              });

              if (banksResponse.ok) {
                isAuthenticated = true;
                trace.info("Authentication verified through banks API on refresh request");
              }
            } catch (refreshError) {
              trace.error("Refresh authentication attempt failed",
                refreshError instanceof Error ? refreshError : new Error(String(refreshError)));
            }
          }
        }

        // Set cache-control headers to prevent caching of authentication status
        const headers = {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        };

        return NextResponse.json({
          success: true,
          message: isRefreshRequest ? "Authentication refresh attempt complete" : "Client-side API connection successful",
          version: "client",
          authenticated: isAuthenticated,
          refreshed: isRefreshRequest,
          timestamp: new Date().toISOString() // Add timestamp to prevent response caching
        }, { headers });
      }

      // Server-side test with full authentication
      const API_BASE_URL = OBP_ENDPOINTS.baseUrl;
      const API_VERSION = OBP_ENDPOINTS.version;
      const CONSUMER_KEY = process.env.OBP_CONSUMER_KEY;

      if (!API_BASE_URL || !CONSUMER_KEY) {
        throw new ApiError(
          "API_BASE_URL or OBP_CONSUMER_KEY environment variables are not set",
          500
        );
      }

      trace.info("Testing OBP API server connection");

      // Prepare headers based on authentication
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `DirectLogin token="${token.value}"`;
        isAuthenticated = true;
      }

      // Test using the banks endpoint
      const endpoint = isAuthenticated
        ? OBP_ENDPOINTS.banks()
        : `${OBP_ENDPOINTS.banks()}?consumer_key=${CONSUMER_KEY}`;

      trace.debug("Making API test request", { endpoint, authenticated: isAuthenticated });

      const response = await fetch(endpoint, { headers });
      const responseText = await response.text();

      trace.debug("API response received", { status: response.status, contentLength: responseText.length });

      if (!response.ok) {
        trace.error("API test failed", new Error(responseText), { status: response.status });
        return NextResponse.json(
          {
            success: false,
            message: `Server-side API test failed: ${response.status}`,
            details: responseText,
            authenticated: isAuthenticated
          },
          { status: response.status }
        );
      }

      try {
        const data = JSON.parse(responseText);
        trace.info("API test successful", { version: data.version });

        return NextResponse.json({
          success: true,
          message: "Server-side API connection successful",
          version: data.version,
          authenticated: isAuthenticated
        });
      } catch (parseError) {
        trace.error("Failed to parse API response", parseError instanceof Error ? parseError : new Error(String(parseError)));

        return NextResponse.json(
          {
            success: false,
            message: "Invalid API response format",
            details: responseText,
            authenticated: isAuthenticated
          },
          { status: 500 }
        );
      }
    } catch (error) {
      trace.error("Test connection error", error instanceof Error ? error : new Error(String(error)));

      const status = error instanceof ApiError ? error.status : 500;
      const message = error instanceof Error ? error.message : String(error);

      return NextResponse.json(
        {
          success: false,
          message: `API test error: ${message}`
        },
        { status }
      );
    }
  });
}

