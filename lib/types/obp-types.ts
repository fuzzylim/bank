import { trace } from "../tracing";

// Types for Open Bank Project API responses
export interface OBPBank {
    id: string;
    short_name: string;
    full_name: string;
    logo: string;
    website: string;
}

export interface OBPBalanceItem {
    type: string;
    amount: string;
    currency?: string;
}

export interface OBPAccount {
    id: string;
    label: string;
    bank_id: string;
    account_type: string;
    // Support different balance formats that might be returned by the API
    balance?: {
        amount: string;
        currency: string;
    } | string;
    // Some OBP API versions return an array of balances
    balances?: OBPBalanceItem[];
    account_routings: Array<{
        scheme: string;
        address: string;
    }>;
    views_available: Array<{
        id: string;
        short_name: string;
        is_public: boolean;
    }>;
}

export interface OBPTransaction {
    id: string;
    this_account: {
        id: string;
        bank_id: string;
    };
    other_account: {
        id: string;
        holder: {
            name: string;
        };
        metadata: {
            image_URL: string;
        };
    };
    details: {
        type: string;
        description: string;
        posted: string;
        completed: string;
        new_balance: {
            amount: string;
            currency: string;
        };
        value: {
            amount: string;
            currency: string;
        };
    };
    metadata: {
        narrative: string;
        tags: string[];
        images: string[];
    };
}

// Transformed types for our application
export interface Account {
    id: string;
    title: string;
    description?: string;
    balance: string;
    currency: string;
    type: "savings" | "checking" | "investment" | "debt";
    accountNumber?: string;
    bankId: string;
    viewId: string;
}

export interface Transaction {
    id: string;
    title: string;
    amount: string;
    type: "incoming" | "outgoing";
    category: string;
    icon: string;
    timestamp: string;
    status: "completed" | "pending" | "failed";
    description?: string;
    otherParty?: string;
    date: string;
}

export interface FinancialGoal {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    iconStyle: string;
    date: string;
    amount?: string;
    status: "pending" | "in-progress" | "completed";
    progress?: number;
}