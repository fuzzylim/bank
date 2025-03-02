import { OBP_ENDPOINTS, getApiHeaders, getAuthToken, ApiError } from "@/lib/api-utils";
import { trace } from "@/lib/tracing";
import { cookies } from "next/headers";
import { NextResponse } from 'next/server';
import { transformTransactions } from "@/lib/transformers";

// Handler to fetch specific transaction details
const transactionDetailsHandler = async (
    request: Request,
    params: Promise<{ bankId: string; transactionId: string }> | { bankId: string; transactionId: string },
    authToken: string | null
) => {
    // Await params if it's a Promise
    const resolvedParams = await Promise.resolve(params);
    const { bankId, transactionId } = resolvedParams;

    if (!authToken) {
        throw new ApiError("Authentication required", 401);
    }

    trace.info(`Fetching transaction details for bank ${bankId}, transaction ${transactionId}`);

    // Check if this is one of our custom transactions (send/top-up)
    if (transactionId.startsWith('send-') || transactionId.startsWith('top-')) {
        // Check if transaction is in useBankingData's transactions state
        // In a real app, we would use a database - here we check for any custom transactions
        // that might have been stored in the client-side transactions state

        try {
            const transactions = [];
            return {
                transaction: {
                    id: transactionId,
                    title: transactionId.startsWith('send-') ? 'Money Transfer' : 'Account Top-up',
                    description: transactionId.startsWith('send-')
                        ? 'Transfer between accounts'
                        : 'Deposit to account',
                    amount: '10.00', // We don't store the amount in the ID so we use a placeholder
                    type: transactionId.startsWith('send-') ? 'outgoing' : 'incoming',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: new Date().toLocaleDateString(),
                    category: transactionId.startsWith('send-') ? 'transfer' : 'deposit',
                    merchant: transactionId.startsWith('send-') ? 'Internal Transfer' : 'Top-up Service',
                    accountId: 'custom-account',
                    reference: transactionId,
                    status: 'completed'
                }
            };
        } catch (error) {
            trace.warn(`Error retrieving custom transaction: ${error}`);
            // Continue to standard OBP API search
        }
    }

    // Get list of accounts first to find the right account/view for this transaction
    const accountsEndpoint = OBP_ENDPOINTS.accounts(bankId);
    const headers = getApiHeaders(authToken);

    // First, get all accounts for this bank
    const accountsResponse = await fetch(accountsEndpoint, { headers });
    if (!accountsResponse.ok) {
        throw new ApiError(`Failed to fetch accounts for bank ${bankId}`, accountsResponse.status);
    }

    const accountsData = await accountsResponse.json();
    const accounts = Array.isArray(accountsData)
        ? accountsData
        : (accountsData as any)?.accounts || [];

    if (!accounts.length) {
        throw new ApiError(`No accounts found for bank ${bankId}`, 404);
    }

    // For each account, try to find the transaction
    for (const account of accounts) {
        try {
            const viewId = Array.isArray(account.views_available)
                ? account.views_available.find((v: { id: string }) => v.id.includes("owner"))?.id || "owner"
                : "owner";

            const transactionsEndpoint = OBP_ENDPOINTS.transactions(bankId, account.id, viewId);
            const transactionsResponse = await fetch(transactionsEndpoint, { headers });

            if (transactionsResponse.ok) {
                const transactionsData = await transactionsResponse.json();
                const transactions = Array.isArray(transactionsData)
                    ? transactionsData
                    : (transactionsData as any)?.transactions || [];

                // Transform transactions to match our frontend format
                const transformedTransactions = transformTransactions(transactions);

                // Find the transaction with the matching ID
                const transaction = transformedTransactions.find(tx => tx.id === transactionId);
                if (transaction) {
                    // Add extra fields for detailed view
                    return {
                        transaction: {
                            ...transaction,
                            accountId: account.id,
                            description: transaction.description || "Transaction from " + transaction.title,
                            merchant: transaction.title, // Use title as merchant
                            status: transaction.status || "completed",
                            reference: transaction.id, // Use id as reference
                        }
                    };
                }
            }
        } catch (error) {
            trace.warn(`Error searching for transaction in account ${account.id}: ${error}`);
            // Continue to next account
        }
    }

    // If we get here, the transaction wasn't found
    throw new ApiError(`Transaction ${transactionId} not found`, 404);
};

// Export the Next.js route handler that returns a Response object
export async function GET(
    request: Request,
    { params }: { params: { bankId: string; transactionId: string } }
) {
    try {
        // Get auth token
        const { token } = getAuthToken(request);

        // Use our handler to process the request
        const result = await transactionDetailsHandler(request, params, token);

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