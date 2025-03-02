"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowUpRight, ArrowDownLeft, CreditCard, Coffee, ShoppingCart, Car, Film } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface TransactionDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    transactionId: string | null
    bankId: string
}

interface TransactionDetail {
    id: string
    title: string
    description: string
    amount: string
    type: 'incoming' | 'outgoing'
    timestamp: string
    date: string
    category: string
    merchant: string
    accountId: string
    reference: string
    status: 'completed' | 'pending' | 'failed'
}

export default function TransactionDetailsModal({
    isOpen,
    onClose,
    transactionId,
    bankId
}: TransactionDetailsModalProps) {
    const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Get transaction details when modal opens
    useEffect(() => {
        if (isOpen && transactionId) {
            fetchTransactionDetails(transactionId)
        } else {
            // Clear data when modal closes
            setTransaction(null)
            setError(null)
        }
    }, [isOpen, transactionId, bankId])

    const fetchTransactionDetails = async (id: string) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/transactions/${bankId}/details/${id}`, {
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            })

            if (!response.ok) {
                throw new Error('Failed to fetch transaction details')
            }

            const data = await response.json()
            setTransaction(data.transaction)
        } catch (err) {
            console.error('Error fetching transaction details:', err)
            setError('Failed to load transaction details. Please try again later.')
        } finally {
            setIsLoading(false)
        }
    }

    // Function to get the appropriate icon based on transaction category
    const getTransactionIcon = (category: string) => {
        switch (category) {
            case "shopping":
                return <ShoppingCart className="w-5 h-5" />
            case "food":
                return <Coffee className="w-5 h-5" />
            case "transport":
                return <Car className="w-5 h-5" />
            case "entertainment":
                return <Film className="w-5 h-5" />
            default:
                return <CreditCard className="w-5 h-5" />
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Transaction Details</DialogTitle>
                    <DialogDescription>
                        View detailed information about this transaction
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : error ? (
                    <div className="py-6 text-center">
                        <p className="text-red-500 mb-4">{error}</p>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </div>
                ) : transaction ? (
                    <div className="py-4">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-3 rounded-lg",
                                    "bg-zinc-100 dark:bg-zinc-800",
                                    "border border-zinc-200 dark:border-zinc-700",
                                )}>
                                    {getTransactionIcon(transaction.category)}
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg">{transaction.title}</h3>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{transaction.timestamp}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-lg font-semibold",
                                    transaction.type === "incoming"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-red-600 dark:text-red-400",
                                )}>
                                    {transaction.type === "incoming" ? "+" : "-"}${transaction.amount}
                                </span>
                                {transaction.type === "incoming" ? (
                                    <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                                )}
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Description</h4>
                                <p className="mt-1">{transaction.description || "No description available"}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Date</h4>
                                    <p className="mt-1">{transaction.date}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Category</h4>
                                    <p className="mt-1 capitalize">{transaction.category}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Merchant</h4>
                                    <p className="mt-1">{transaction.merchant || "Unknown"}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Status</h4>
                                    <p className="mt-1 capitalize">{transaction.status}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Reference</h4>
                                <p className="mt-1 break-all">{transaction.reference || "No reference"}</p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <Button onClick={onClose} className="w-full">Close</Button>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 text-center">
                        <p className="text-zinc-500">No transaction selected</p>
                        <Button variant="outline" onClick={onClose} className="mt-4">Close</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}