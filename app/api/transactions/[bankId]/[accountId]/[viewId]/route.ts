import { OBP_ENDPOINTS, getApiHeaders, getAuthToken, ApiError } from "@/lib/api-utils";
import { trace } from "@/lib/tracing";
import { NextResponse } from 'next/server';

// Create the handler that processes the request
const transactionsHandler = async (
  request: Request,
  params: { bankId: string; accountId: string; viewId: string },
  authToken: string | null
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
};

// Export the Next.js route handler that returns a Response object
export async function GET(
  request: Request,
  { params }: { params: { bankId: string; accountId: string; viewId: string } }
) {
  try {
    // Get auth token
    const { token } = getAuthToken(request);

    // Use our handler to process the request
    const result = await transactionsHandler(request, params, token);

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

