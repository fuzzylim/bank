import { OBP_ENDPOINTS, getApiHeaders, ApiError } from "@/lib/api-utils";
import { trace } from "@/lib/tracing";
import { OBPAccount } from "@/lib/open-banking-api";
import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/server/api-utils';

// Create the handler that processes the request
const accountsHandler = async (request: Request, bankId: string, authToken: string | null) => {
  if (!authToken) {
    throw new ApiError("Authentication required", 401);
  }

  trace.info(`Fetching accounts for bank ${bankId}`);

  // Use the private accounts endpoint to ensure balance information is included
  const endpoint = OBP_ENDPOINTS.accounts(bankId);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `DirectLogin token="${authToken}"`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    throw new ApiError(`Failed to fetch accounts for bank ${bankId}`, response.status);
  }

  const data = await response.json();

  // Log the first account for debugging
  if (data && Array.isArray(data) && data.length > 0) {
    trace.debug(`First account sample (${bankId})`, {
      accountPreview: JSON.stringify(data[0]).substring(0, 200) + '...'
    });
  } else if (data && data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
    trace.debug(`First account sample (${bankId})`, {
      accountPreview: JSON.stringify(data.accounts[0]).substring(0, 200) + '...'
    });
  }

  // Process the accounts to ensure they have the expected structure
  let processedAccounts = [];

  if (data && data.accounts && Array.isArray(data.accounts)) {
    processedAccounts = data.accounts.map((account: OBPAccount) => {
      // Ensure views_available exists
      if (!account.views_available) {
        account.views_available = [{ id: "owner", short_name: "Owner", is_public: false }];
      }
      return account;
    });
    trace.info(`Retrieved ${processedAccounts.length} accounts from 'accounts' property`);
    return { accounts: processedAccounts };
  } else if (data && Array.isArray(data)) {
    processedAccounts = data.map((account: OBPAccount) => {
      // Ensure views_available exists
      if (!account.views_available) {
        account.views_available = [{ id: "owner", short_name: "Owner", is_public: false }];
      }
      return account;
    });
    trace.info(`Retrieved ${processedAccounts.length} accounts from array response`);
    return { accounts: processedAccounts };
  } else {
    trace.error("Unexpected API response format", { dataType: typeof data });
    return { accounts: [] };
  }
};

// Export the Next.js route handler that returns a Response object
export async function GET(
  request: Request,
  { params }: { params: { bankId: string } }
) {
  try {
    // Get auth token from cookies using Next.js cookie API
    const token = getCookie("obp_token");
    let verifiedToken: string | null = token || null;

    // If we have a token, verify it by making a test request
    if (verifiedToken) {
      try {
        trace.debug("Verifying token validity for accounts request");
        const API_BASE_URL = OBP_ENDPOINTS.baseUrl;
        const API_VERSION = OBP_ENDPOINTS.version;

        // Make a quick verification request
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `DirectLogin token="${token}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        };

        const cacheBuster = Date.now();
        const response = await fetch(`${API_BASE_URL}/obp/${API_VERSION}/users/current?_=${cacheBuster}`, {
          headers,
          method: 'GET',
          cache: 'no-store'
        });

        // If token is invalid, set to null
        if (!response.ok) {
          trace.warn("Token verification failed", { status: response.status });
          verifiedToken = null;
        } else {
          trace.info("Token verified successfully for accounts request");
        }
      } catch (error) {
        trace.error("Error verifying token", error instanceof Error ? error : new Error(String(error)));
        verifiedToken = null;
      }
    }

    // Use our handler to process the request
    const result = await accountsHandler(request, params.bankId, verifiedToken);

    // Return the result as a NextResponse
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

