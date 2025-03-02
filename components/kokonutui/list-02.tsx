"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  CreditCard,
  type LucideIcon,
  ArrowRight,
  Coffee,
  Car,
  Film,
} from "lucide-react"
import { useBankingData } from "@/hooks/use-banking-data"
import { Skeleton } from "@/components/ui/skeleton"
import TransactionDetailsModal from "./transaction-details-modal"

export default function List02({ className }: { className?: string }) {
  const { transactions, isLoading, selectedBank } = useBankingData()
  const router = useRouter()

  // State for transaction details modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  // Handle transaction selection
  const handleTransactionClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId)
    setIsDetailsModalOpen(true)
  }

  // Handle view all transactions
  const handleViewAllTransactions = () => {
    router.push('/dashboard/transactions')
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "w-full max-w-xl mx-auto",
          "bg-white dark:bg-zinc-900/70",
          "border border-zinc-100 dark:border-zinc-800",
          "rounded-xl shadow-sm backdrop-blur-xl",
          className,
        )}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Activity</h2>
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-2">
                <Skeleton className="h-14 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Function to get the appropriate icon based on transaction category
  const getTransactionIcon = (category: string): LucideIcon => {
    switch (category) {
      case "shopping":
        return ShoppingCart
      case "food":
        return Coffee
      case "transport":
        return Car
      case "entertainment":
        return Film
      default:
        return CreditCard
    }
  }

  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto",
        "bg-white dark:bg-zinc-900/70",
        "border border-zinc-100 dark:border-zinc-800",
        "rounded-xl shadow-sm backdrop-blur-xl",
        className,
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Recent Activity
            <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400 ml-1">
              ({transactions.length} transactions)
            </span>
          </h2>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">This Month</span>
        </div>

        <div className="space-y-1">
          {transactions.slice(0, 6).map((transaction) => {
            const TransactionIcon = getTransactionIcon(transaction.category)

            return (
              <div
                key={transaction.id}
                className={cn(
                  "group flex items-center gap-3",
                  "p-2 rounded-lg",
                  "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                  "transition-all duration-200",
                  "cursor-pointer"
                )}
                onClick={() => handleTransactionClick(transaction.id)}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    "bg-zinc-100 dark:bg-zinc-800",
                    "border border-zinc-200 dark:border-zinc-700",
                  )}
                >
                  <TransactionIcon className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                </div>

                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{transaction.title}</h3>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{transaction.timestamp}</p>
                  </div>

                  <div className="flex items-center gap-1.5 pl-3">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        transaction.type === "incoming"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {transaction.type === "incoming" ? "+" : "-"}${transaction.amount}
                    </span>
                    {transaction.type === "incoming" ? (
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-2 border-t border-zinc-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={handleViewAllTransactions}
          className={cn(
            "w-full flex items-center justify-center gap-2",
            "py-2 px-3 rounded-lg",
            "text-xs font-medium",
            "bg-gradient-to-r from-zinc-900 to-zinc-800",
            "dark:from-zinc-50 dark:to-zinc-200",
            "text-zinc-50 dark:text-zinc-900",
            "hover:from-zinc-800 hover:to-zinc-700",
            "dark:hover:from-zinc-200 dark:hover:to-zinc-300",
            "shadow-sm hover:shadow",
            "transform transition-all duration-200",
            "hover:-translate-y-0.5",
            "active:translate-y-0",
            "focus:outline-none focus:ring-2",
            "focus:ring-zinc-500 dark:focus:ring-zinc-400",
            "focus:ring-offset-2 dark:focus:ring-offset-zinc-900",
          )}
        >
          <span>View All Transactions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Transaction details modal */}
      <TransactionDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        transactionId={selectedTransactionId}
        bankId={selectedBank}
      />
    </div>
  )
}

