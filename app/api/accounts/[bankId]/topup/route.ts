import { OBP_ENDPOINTS, ApiError, getApiHeaders } from "@/lib/api-utils";
import { trace } from "@/lib/tracing";
import { v4 as uuidv4 } from 'uuid';
import { getCookie } from '@/lib/server/api-utils';
import { NextResponse } from 'next/server';

// Handler to process the top-up request
const topUpHandler = async (
    request: Request,
    bankId: string,
    authToken: string | null
) => {
    if (!authToken) {
        throw new ApiError("Authentication required", 401);
    }

    // Parse request body
    const body = await request.json();
    const { accountId, amount, method } = body;

    // Validate required fields
    if (!accountId) {
        throw new ApiError("Account ID is required", 400);
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new ApiError("Valid amount is required", 400);
    }

    trace.info(`Topping up account ${accountId} with ${amount} via ${method || 'standard transfer'}`);

    try {
        // We'll first try to get account details to confirm it exists
        const accountsEndpoint = OBP_ENDPOINTS.accounts(bankId);
        const headers = getApiHeaders(authToken);

        const accountsResponse = await fetch(accountsEndpoint, {
            headers,
            cache: 'no-store'
        });

        if (!accountsResponse.ok) {
            throw new ApiError(`Failed to fetch accounts: ${accountsResponse.statusText}`, accountsResponse.status);
        }

        const accountsData = await accountsResponse.json();
        const accounts = Array.isArray(accountsData)
            ? accountsData
            : (accountsData as any)?.accounts || [];

        // Find the target account to ensure it exists
        const targetAccount = accounts.find((acc: any) => acc.id === accountId);
        if (!targetAccount) {
            throw new ApiError(`Account ${accountId} not found`, 404);
        }

        // Get a viewId that allows transactions
        const viewId = Array.isArray(targetAccount.views_available)
            ? targetAccount.views_available.find((v: { id: string }) => v.id.includes("owner"))?.id || "owner"
            : "owner";

        // For top-ups, let's use SANDBOX_TAN transaction type which is designed for testing
        const transactionRequestType = "SANDBOX_TAN";

        // Create a transaction request using the transaction request endpoint
        const transactionEndpoint = OBP_ENDPOINTS.createTransactionRequest(
            bankId,
            accountId,
            viewId,
            transactionRequestType
        );

        // Create the transaction request payload with minimal required fields for SANDBOX_TAN
        const transactionRequestPayload = {
            to: {
                bank_id: bankId,
                account_id: accountId  // Same account for sandbox top-up demo
            },
            value: {
                currency: "EUR", // Default currency, ideally this would be dynamic
                amount: amount
            },
            description: `Top-up via ${method || "standard transfer"}`,
            challenge_type: ""  // No challenge for this demo
        };

        // Post the transaction request
        const transactionResponse = await fetch(transactionEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(transactionRequestPayload),
            cache: 'no-store'
        });

        if (!transactionResponse.ok) {
            const errorText = await transactionResponse.text();
            throw new ApiError(`Failed to create top-up transaction: ${errorText}`, transactionResponse.status);
        }

        const transactionData = await transactionResponse.json();

        // Create a formatted transaction object for our UI
        const transaction = {
            id: `top-${uuidv4().substring(0, 8)}`,
            title: `Top-up via ${method || "standard transfer"}`,
            amount: parseFloat(amount).toFixed(2),
            type: "incoming",
            category: "deposit",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toISOString(),
            description: `Account top-up via ${method || "standard transfer"}`,
            status: transactionData.status || "completed",
            accountId: accountId,
            method: method || "standard transfer",
            // Include OBP transaction data for reference
            obpTransactionId: transactionData.id
        };

        // Return the transaction so it can be added to the client-side state
        return {
            success: true,
            transaction,
            transactionData
        };
    } catch (error) {
        trace.error("Error creating top-up transaction", error);

        // Simply re-throw the error - let the calling function handle it
        throw error;
    }
};

// Export the Next.js route handler that returns a Response object
export async function POST(
    request: Request,
    { params }: { params: { bankId: string } }
) {
    // Await params to ensure they're fully resolved
    const { bankId } = await params;

    try {
        // Get auth token from cookies
        const token = await getCookie("obp_token") || null;

        // Use our handler to process the request
        const result = await topUpHandler(request, bankId, token);

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