import { OBP_ENDPOINTS, createApiHandler, getApiHeaders, ApiError } from "@/lib/api-utils";
import { trace } from "@/lib/tracing";
import { OBPAccount } from "@/lib/open-banking-api";

export const GET = createApiHandler(async (request, params: { bankId: string }, authToken) => {
  const { bankId } = params;

  if (!authToken) {
    throw new ApiError("Authentication required", 401);
  }

  trace.info(`Fetching accounts for bank ${bankId}`);

  // Use the private accounts endpoint to ensure balance information is included
  const endpoint = OBP_ENDPOINTS.accounts(bankId);
  const headers = getApiHeaders(authToken);

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
});

