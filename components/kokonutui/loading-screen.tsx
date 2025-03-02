"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useBankingData } from "@/hooks/use-banking-data"
import { Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LoadingScreen() {
    const router = useRouter()
    const { isLoading, error, isAuthenticated, authCheckComplete, refreshData } = useBankingData()

    // Data loading sub-steps
    type DataLoadingStep = {
        id: string;
        label: string;
        status: 'idle' | 'loading' | 'complete' | 'error';
        progress?: number; // Optional progress percentage (0-100)
    }

    const [dataLoadingSteps, setDataLoadingSteps] = useState<DataLoadingStep[]>([
        {
            id: 'banks',
            label: 'Loading banks...',
            status: 'idle',
            progress: 0
        },
        {
            id: 'accounts',
            label: 'Loading accounts...',
            status: 'idle',
            progress: 0
        },
        {
            id: 'transactions',
            label: 'Loading transactions...',
            status: 'idle',
            progress: 0
        }
    ]);

    // Account and transaction progress tracking
    const [accountsToProcess, setAccountsToProcess] = useState(0);
    const [accountsProcessed, setAccountsProcessed] = useState(0);
    const [banksToProcess, setBanksToProcess] = useState(0);
    const [banksProcessed, setBanksProcessed] = useState(0);

    // Update data loading sub-step status
    const updateDataLoadingStep = (stepId: string, status: 'idle' | 'loading' | 'complete' | 'error', progress?: number) => {
        setDataLoadingSteps(prevSteps =>
            prevSteps.map(step =>
                step.id === stepId
                    ? {
                        ...step,
                        // Keep existing progress if not provided and not complete/error
                        progress: status === 'complete' ? 100 :
                            status === 'error' ? undefined :
                                progress !== undefined ? progress : step.progress,
                        status
                    }
                    : step
            )
        );
    };

    // State to track if data loading is complete
    const [isDataLoadingComplete, setIsDataLoadingComplete] = useState(false);

    useEffect(() => {
        // Check if authentication is valid
        if (!isAuthenticated && authCheckComplete) {
            console.log("Not authenticated in loading screen, redirecting to login");
            router.push("/login");
            return;
        }

        // Setup event listeners for data loading progress tracking
        const loginProgressHandler = (event: Event) => {
            const progressEvent = event as CustomEvent<{
                type: string;
                stage?: string;
                accountsTotal?: number;
                currentAccount?: number;
            }>;

            const data = progressEvent.detail;

            if (data.type === 'banks' && data.stage === 'start') {
                updateDataLoadingStep('banks', 'loading');
                if (data.accountsTotal) {
                    setBanksToProcess(data.accountsTotal);
                    setBanksProcessed(0);
                }
            } else if (data.type === 'banks' && data.stage === 'progress') {
                if (data.currentAccount !== undefined && data.accountsTotal) {
                    setBanksProcessed(data.currentAccount);
                    const progressPercent = Math.round((data.currentAccount / data.accountsTotal) * 100);
                    updateDataLoadingStep('banks', 'loading', progressPercent);
                }
            } else if (data.type === 'banks' && data.stage === 'complete') {
                setBanksProcessed(data.accountsTotal || banksToProcess);
                updateDataLoadingStep('banks', 'complete');
            } else if (data.type === 'accounts' && data.stage === 'start') {
                updateDataLoadingStep('accounts', 'loading', 0);
                if (data.accountsTotal) {
                    setAccountsToProcess(data.accountsTotal);
                    setAccountsProcessed(0);
                }
            } else if (data.type === 'accounts' && data.stage === 'progress') {
                if (data.currentAccount !== undefined && data.accountsTotal) {
                    setAccountsProcessed(data.currentAccount);
                    const progressPercent = Math.round((data.currentAccount / data.accountsTotal) * 100);
                    updateDataLoadingStep('accounts', 'loading', progressPercent);
                }
            } else if (data.type === 'accounts' && data.stage === 'complete') {
                setAccountsProcessed(data.accountsTotal || accountsToProcess);
                updateDataLoadingStep('accounts', 'complete');
            } else if (data.type === 'transactions' && data.stage === 'start') {
                updateDataLoadingStep('transactions', 'loading', 0);
                if (data.accountsTotal) {
                    setAccountsToProcess(data.accountsTotal);
                    setAccountsProcessed(0);
                }
            } else if (data.type === 'transactions' && data.stage === 'progress') {
                if (data.currentAccount !== undefined && data.accountsTotal) {
                    setAccountsProcessed(data.currentAccount);
                    const progressPercent = Math.round((data.currentAccount / data.accountsTotal) * 100);
                    updateDataLoadingStep('transactions', 'loading', progressPercent);
                }
            } else if (data.type === 'transactions' && data.stage === 'complete') {
                setAccountsProcessed(data.accountsTotal || accountsToProcess);
                updateDataLoadingStep('transactions', 'complete');

                // All data is loaded, mark as complete
                setIsDataLoadingComplete(true);

                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    router.push("/dashboard");
                }, 1000);
            }
        };

        // Add event listener for tracking login progress
        window.addEventListener('loginProgress', loginProgressHandler);

        // Start data loading
        if (isAuthenticated) {
            refreshData().catch(err => {
                console.error("Error refreshing data:", err);
            });
        }

        // Clean up event listener
        return () => {
            window.removeEventListener('loginProgress', loginProgressHandler);
        };
    }, [isAuthenticated, authCheckComplete, router, refreshData]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0F0F12]">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-center">Loading Bank Data</h2>
                <p className="text-center text-gray-600 dark:text-gray-400">
                    Please wait while we fetch your banking information
                </p>

                {/* Data Loading Progress */}
                <div className="space-y-4 mt-6">
                    {dataLoadingSteps.map(step => (
                        <div key={step.id} className="flex flex-col">
                            <div className="flex items-center">
                                <div className="mr-3 flex-shrink-0">
                                    {step.status === 'loading' && (
                                        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                    )}
                                    {step.status === 'complete' && (
                                        <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                    {step.status === 'idle' && (
                                        <div className="h-5 w-5 rounded-full border border-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1 flex justify-between items-center">
                                    <p className={`text-sm ${step.status === 'complete' ? 'text-green-600' : 'text-foreground'}`}>
                                        {step.label}
                                    </p>
                                    {/* Show account count for steps with progress */}
                                    {(step.id === 'accounts' || step.id === 'transactions') && step.status === 'loading' && accountsToProcess > 0 && (
                                        <p className="text-xs text-muted-foreground ml-2">
                                            {accountsProcessed}/{accountsToProcess}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Progress bar for steps with progress tracking */}
                            {step.progress !== undefined && step.status === 'loading' && (
                                <>
                                    <div className="mt-2 mb-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${step.progress}%` }}
                                        />
                                    </div>
                                    {(step.id === 'accounts' || step.id === 'transactions') && accountsProcessed > 0 && (
                                        <p className="text-xs text-muted-foreground text-right">
                                            Processing account {accountsProcessed} of {accountsToProcess}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {isDataLoadingComplete && (
                    <div className="flex justify-center mt-4">
                        <Button onClick={() => router.push("/dashboard")}>
                            Continue to Dashboard
                        </Button>
                    </div>
                )}

                {error && (
                    <div className="text-red-500 text-center mt-4">
                        <p>Error loading data: {error}</p>
                        <Button
                            onClick={() => router.push("/login")}
                            variant="outline"
                            className="mt-2"
                        >
                            Return to Login
                        </Button>
                    </div>
                )}

                {!error && isLoading && (
                    <div className="flex justify-center mt-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
            </div>
        </div>
    );
}