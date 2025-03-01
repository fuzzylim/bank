import { OBP_ENDPOINTS, createApiHandler, getApiHeaders, ApiError } from "@/lib/api-utils";
import { trace } from "@/lib/tracing";

export const GET = createApiHandler(async (
  request,
  params: { bankId: string; accountId: string; viewId: string },
  authToken
) => {
  const { bankId, accountId, viewId } = params;

  if (!authToken) {
    throw new ApiError("Authentication required", 401);
  }

  trace.info(`Fetching transactions for bank ${bankId}, account ${accountId}, view ${viewId}`);

  const endpoint = OBP_ENDPOINTS.transactions(bankId, accountId, viewId);
  const headers = getApiHeaders(authToken);

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    throw new ApiError(`Failed to fetch transactions for account ${accountId}`, response.status);
  }

  const data = await response.json();
  trace.debug(`Retrieved ${data.transactions?.length || 0} transactions`);

  // Ensure we return the data in the format expected by the client code
  // If the data already has a transactions property, return it as is
  // Otherwise, assume the data is the transactions array itself and wrap it in an object
  if (data.transactions) {
    return data;
  } else if (Array.isArray(data)) {
    trace.debug(`Wrapping ${data.length} transactions in { transactions: [...] } structure`);
    return { transactions: data };
  } else {
    trace.warn("Unexpected data format received from OBP API");
    return { transactions: [] };
  }
});

