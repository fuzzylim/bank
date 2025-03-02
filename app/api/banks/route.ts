import { OBP_ENDPOINTS, createApiHandler, getApiHeaders, getAuthToken, ApiError } from "@/lib/api-utils";
import { trace } from "@/lib/tracing";
import { cookies } from "next/headers";
import { NextResponse } from 'next/server';

const CONSUMER_KEY = process.env.OBP_CONSUMER_KEY;

// Create the handler that processes the request
const bankHandler = async (request: Request, params: Record<string, string>, authToken: string | null) => {
  // Get banks from OBP API
  let endpoint = OBP_ENDPOINTS.banks();
  let headers = getApiHeaders(authToken);

  // If no auth token but we have a consumer key, use that instead
  if (!authToken && CONSUMER_KEY) {
    trace.info("No auth token available, using consumer key for public access");
    endpoint = `${endpoint}?consumer_key=${CONSUMER_KEY}`;
  } else if (!authToken) {
    throw new ApiError("No authentication method available", 401);
  }

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    throw new ApiError("Failed to fetch banks", response.status);
  }

  const data = await response.json();
  trace.debug(`Retrieved ${data.banks?.length || 0} banks`);

  // Ensure we return the data in the format expected by the client code
  // If the data already has a banks property, return it as is
  // Otherwise, assume the data is the banks array itself and wrap it in an object
  let resultToReturn;

  if (data.banks) {
    trace.debug(`Found 'banks' property with ${data.banks.length} banks, returning as is`);
    resultToReturn = data;
  } else if (Array.isArray(data)) {
    trace.debug(`Received array of ${data.length} banks, wrapping in { banks: [...] } structure`);
    resultToReturn = { banks: data };
  } else {
    trace.warn("Unexpected data format received from OBP API");
    resultToReturn = { banks: [] };
  }

  // Log what we're actually sending to the client
  trace.info(`Returning banks response to client: format=${typeof resultToReturn}, hasData=${!!resultToReturn}, bankCount=${resultToReturn.banks?.length || 0}`);

  return resultToReturn;
};

// Export the Next.js route handler that returns a Response object
export async function GET(request: Request) {
  try {
    // Get auth token
    const { token } = getAuthToken(request);

    // Use our handler to process the request
    const result = await bankHandler(request, {}, token);

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

