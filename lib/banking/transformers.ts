import { trace } from "../tracing";
import { Account, OBPAccount, OBPTransaction, Transaction } from "../types/obp-types";

/**
 * Transform OBP Accounts to our application's Account type
 */
export const transformAccounts = (obpAccounts: OBPAccount[] | undefined): Account[] => {
    // Return empty array if obpAccounts is undefined or null
    if (!obpAccounts) {
        trace.warn("transformAccounts received undefined or null input");
        return [];
    }

    trace.debug(`Transforming ${obpAccounts.length} accounts`);

    return obpAccounts.map((account) => {
        // Determine account type based on account label or type
        let type: "savings" | "checking" | "investment" | "debt" = "checking";
        const label = (account.label ?? "").toLowerCase();
        const accountType = (account.account_type ?? "").toLowerCase();

        if (
            label.includes("saving") ||
            label.includes("reserve") ||
            accountType.includes("saving")
        ) {
            type = "savings";
        } else if (
            label.includes("invest") ||
            label.includes("stock") ||
            label.includes("portfolio") ||
            accountType.includes("investment")
        ) {
            type = "investment";
        } else if (
            label.includes("credit") ||
            label.includes("loan") ||
            label.includes("debt") ||
            accountType.includes("loan") ||
            accountType.includes("credit")
        ) {
            type = "debt";
        }

        // Format balance with proper decimal places
        let balanceAmount = 0;
        let formattedBalance = "0.00";

        try {
            if (account.balance && account.balance.amount !== undefined) {
                balanceAmount = parseFloat(account.balance.amount);
                formattedBalance = balanceAmount.toFixed(2);
            } else {
                trace.warn(`Account ${account.id} has invalid or missing balance data`);
                // Ensure we set safe default values even when balance data is missing
                balanceAmount = 0;
                formattedBalance = "0.00";
            }
        } catch (error) {
            trace.error(`Failed to process balance for account ${account.id}`, error as Error);
            // Safety fallback in case of any error processing the balance
            balanceAmount = 0;
            formattedBalance = "0.00";
        }

        // Get account number from routings if available
        let accountNumber = "";
        if (account.account_routings && Array.isArray(account.account_routings)) {
            accountNumber = account.account_routings.find(r => r.scheme === "IBAN" || r.scheme === "AccountNumber")?.address || "";
        }

        // Safely get viewId from views_available
        let viewId = "owner"; // Default value
        if (account.views_available && Array.isArray(account.views_available)) {
            viewId = account.views_available.find(v => v.id?.includes("owner"))?.id || "owner";
        }

        return {
            id: account.id || `unknown-${Math.random().toString(36).substring(7)}`,
            title: account.label || "Unnamed Account",
            description: account.account_type || "",
            balance: formattedBalance,
            currency: account.balance?.currency || "USD", // Default to USD if currency is missing
            type,
            accountNumber: accountNumber,
            bankId: account.bank_id || "",
            viewId: viewId
        };
    });
};

/**
 * Transform OBP Transactions to our application's Transaction type
 */
export const transformTransactions = (obpTransactions: OBPTransaction[]): Transaction[] => {
    // Guard against null/undefined input
    if (!obpTransactions || !Array.isArray(obpTransactions)) {
        trace.warn("transformTransactions received invalid input", { input: typeof obpTransactions });
        return [];
    }

    trace.debug(`Transforming ${obpTransactions.length} transactions`);

    return obpTransactions.map((transaction) => {
        // Safely handle potentially missing properties
        if (!transaction || !transaction.details || !transaction.details.value) {
            trace.warn("Transaction is missing required data", { id: transaction?.id || "unknown" });
            return {
                id: transaction?.id || `unknown-${Math.random().toString(36).substring(7)}`,
                title: "Unknown Transaction",
                amount: "0.00",
                type: "outgoing", // Default value
                category: "other",
                icon: "other",
                timestamp: new Date().toISOString(),
                status: "completed",
                description: "",
                otherParty: "",
                date: new Date().toISOString()
            };
        }

        // Determine if transaction is incoming or outgoing based on amount
        let amount = 0;
        try {
            amount = Number.parseFloat(transaction.details.value.amount || "0");
        } catch (error) {
            trace.warn(`Error parsing amount for transaction ${transaction.id}`, error as Error);
        }
        const type = amount >= 0 ? "incoming" : "outgoing";

        // Determine category based on description or narrative
        let category = "other";
        const description = ((transaction.details?.description || "") ||
            (transaction.metadata?.narrative || "")).toLowerCase();
        const otherParty = (transaction.other_account?.holder?.name || "").toLowerCase();

        // Categorization logic based on keywords
        if (description.includes("shop") || description.includes("store") || description.includes("purchase") ||
            description.includes("buy") || description.includes("mart") || otherParty.includes("shop") ||
            otherParty.includes("store") || otherParty.includes("retail")) {
            category = "shopping";
        } else if (description.includes("food") || description.includes("restaurant") || description.includes("cafe") ||
            description.includes("coffee") || description.includes("lunch") || description.includes("dinner") ||
            description.includes("breakfast") || otherParty.includes("restaurant") || otherParty.includes("cafe")) {
            category = "food";
        } else if (description.includes("transport") || description.includes("uber") || description.includes("taxi") ||
            description.includes("train") || description.includes("bus") || description.includes("fare") ||
            description.includes("travel") || otherParty.includes("transport") || otherParty.includes("travel")) {
            category = "transport";
        } else if (description.includes("entertainment") || description.includes("movie") || description.includes("subscription") ||
            description.includes("netflix") || description.includes("spotify") || description.includes("game") ||
            description.includes("ticket") || otherParty.includes("entertainment") || otherParty.includes("cinema")) {
            category = "entertainment";
        } else if (description.includes("bill") || description.includes("utility") || description.includes("electric") ||
            description.includes("water") || description.includes("gas") || description.includes("internet") ||
            description.includes("phone") || otherParty.includes("utility") || otherParty.includes("telecom")) {
            category = "bills";
        } else if (description.includes("salary") || description.includes("payroll") || description.includes("income") ||
            description.includes("wage") || otherParty.includes("employer") || otherParty.includes("payroll")) {
            category = "income";
        } else if (description.includes("transfer") || description.includes("sent") || description.includes("received")) {
            category = "transfer";
        }

        // Format date - safely handle potentially missing completed date
        let date = new Date();
        try {
            if (transaction.details?.completed) {
                date = new Date(transaction.details.completed);
            } else {
                trace.warn(`Transaction ${transaction.id} is missing completed date`);
            }
        } catch (error) {
            trace.warn(`Error parsing date for transaction ${transaction.id}`, error as Error);
        }

        // Format timestamp for display
        const now = new Date();
        let timestamp = "";

        if (date.toDateString() === now.toDateString()) {
            timestamp = `Today, ${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")} ${date.getHours() >= 12 ? "PM" : "AM"}`;
        } else if (date.toDateString() === new Date(new Date().setDate(now.getDate() - 1)).toDateString()) {
            timestamp = "Yesterday";
        } else {
            // Format as "Mar 1, 2025" for better readability
            timestamp = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        // Get a more descriptive title
        let title =
            (transaction.other_account?.holder?.name) ||
            (transaction.details?.description) ||
            "Transaction";

        // Add transaction type to the title for better context
        const transactionType = transaction.details?.type || "";
        if (transactionType && !title.includes(transactionType)) {
            title = `${title} (${transactionType})`;
        }

        return {
            id: transaction.id || `unknown-${Math.random().toString(36).substring(7)}`,
            title: title,
            amount: `${Math.abs(amount).toFixed(2)}`,
            type,
            category,
            icon: category, // Use category as icon identifier
            timestamp,
            status: "completed", // Assuming all fetched transactions are completed
            description: transaction.details?.description || transaction.metadata?.narrative || "",
            otherParty: transaction.other_account?.holder?.name || "",
            date: date.toISOString(),
        };
    });
};