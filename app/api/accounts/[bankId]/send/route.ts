import { OBP_ENDPOINTS, ApiError, getApiHeaders } from "@/lib/api-utils";
import { trace } from "@/lib/tracing";
import { v4 as uuidv4 } from 'uuid';
import { getCookie } from '@/lib/server/api-utils';
import { NextResponse } from 'next/server';

// Handler to process the send money request
const sendMoneyHandler = async (
    request: Request,
    bankId: string,
    authToken: string | null
) => {
    if (!authToken) {
        throw new ApiError("Authentication required", 401);
    }

    // Parse request body
    const body = await request.json();
    const { fromAccountId, toAccountId, amount, description } = body;

    // Validate required fields
    if (!fromAccountId) {
        throw new ApiError("Source account ID is required", 400);
    }
    if (!toAccountId) {
        throw new ApiError("Destination account ID is required", 400);
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new ApiError("Valid amount is required", 400);
    }

    trace.info(`Sending ${amount} from account ${fromAccountId} to account ${toAccountId}`);

    try {
        // We'll first try to get account details to find the view ID
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

        // Find the source account to get viewId
        const sourceAccount = accounts.find((acc: any) => acc.id === fromAccountId);
        if (!sourceAccount) {
            throw new ApiError(`Source account ${fromAccountId} not found`, 404);
        }

        // Get a viewId that allows transactions
        const viewId = Array.isArray(sourceAccount.views_available)
            ? sourceAccount.views_available.find((v: { id: string }) => v.id.includes("owner"))?.id || "owner"
            : "owner";

        // Find the destination account to ensure it exists
        const destAccount = accounts.find((acc: any) => acc.id === toAccountId);
        if (!destAccount) {
            throw new ApiError(`Destination account ${toAccountId} not found`, 404);
        }

        // Use SANDBOX_TAN transaction type for testing account-to-account transfers
        const transactionRequestType = "SANDBOX_TAN";

        // Create a transaction request
        const transactionEndpoint = OBP_ENDPOINTS.createTransactionRequest(
            bankId,
            fromAccountId,
            viewId,
            transactionRequestType
        );

        // Create the transaction request payload in SANDBOX_TAN format
        const transactionRequestPayload = {
            to: {
                bank_id: bankId,
                account_id: toAccountId
            },
            value: {
                currency: "EUR", // Default currency, ideally this would be dynamic
                amount: amount
            },
            description: description || "Money transfer",
            challenge_type: "" // No challenge for this demo
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
            throw new ApiError(`Failed to create transaction: ${errorText}`, transactionResponse.status);
        }

        const transactionData = await transactionResponse.json();

        // Create a formatted transaction object for our UI
        const transaction = {
            id: `send-${uuidv4().substring(0, 8)}`,
            title: description || "Money Transfer",
            amount: parseFloat(amount).toFixed(2),
            type: "outgoing",
            category: "transfer",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toISOString(),
            description: `Transfer to account ${toAccountId}`,
            status: transactionData.status || "completed",
            fromAccount: fromAccountId,
            toAccount: toAccountId,
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
        trace.error("Error creating transaction", error);

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
        const result = await sendMoneyHandler(request, bankId, token);

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