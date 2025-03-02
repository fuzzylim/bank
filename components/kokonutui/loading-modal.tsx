"use client"

import { useState, useEffect } from "react"
import { Check, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"

interface LoadingModalProps {
    isOpen: boolean
    onComplete: () => void
}

export default function LoadingModal({ isOpen, onComplete }: LoadingModalProps) {
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
            status: 'idle'
        },
        {
            id: 'accounts',
            label: 'Loading accounts...',
            status: 'idle'
        },
        {
            id: 'transactions',
            label: 'Loading transactions...',
            status: 'idle',
            progress: 0
        }
    ]);

    // Account progress tracking
    const [accountsToProcess, setAccountsToProcess] = useState(0);
    const [accountsProcessed, setAccountsProcessed] = useState(0);

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

    // Setup event listeners for login progress tracking
    useEffect(() => {
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
            } else if (data.type === 'banks' && data.stage === 'complete') {
                updateDataLoadingStep('banks', 'complete');
            } else if (data.type === 'accounts' && data.stage === 'start') {
                updateDataLoadingStep('accounts', 'loading');
            } else if (data.type === 'accounts' && data.stage === 'complete') {
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

                // All data is loaded, notify parent
                setTimeout(() => {
                    onComplete();
                }, 500);
            }
        };

        // Add event listener for tracking login progress
        window.addEventListener('loginProgress', loginProgressHandler);

        // Clean up event listener
        return () => {
            window.removeEventListener('loginProgress', loginProgressHandler);
        };
    }, [onComplete]);

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Loading Bank Data</DialogTitle>
                    <DialogDescription>
                        Please wait while we fetch your banking information
                    </DialogDescription>
                </DialogHeader>

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
                                    {/* Show account count for transactions step with progress */}
                                    {step.id === 'transactions' && step.status === 'loading' && accountsToProcess > 0 && (
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
                                    {step.id === 'transactions' && accountsProcessed > 0 && (
                                        <p className="text-xs text-muted-foreground text-right">
                                            Processing account {accountsProcessed} of {accountsToProcess}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}