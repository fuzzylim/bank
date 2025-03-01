"use client"

import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, Wallet, SendHorizontal, QrCode, Plus, ArrowRight, CreditCard } from "lucide-react"
import { useBankingData } from "@/hooks/use-banking-data"
import { Skeleton } from "@/components/ui/skeleton"
import { Error } from "@/components/ui/error"

export default function List01({ className }: { className?: string }) {
  const { accounts, totalBalance, isLoading, error } = useBankingData()

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
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Total Balance</p>
          <Skeleton className="h-8 w-32 mt-1" />
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Your Accounts</h2>
          </div>
          <div className="space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-2">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          "w-full max-w-xl mx-auto",
          "bg-white dark:bg-zinc-900/70",
          "border border-zinc-100 dark:border-zinc-800",
          "rounded-xl shadow-sm backdrop-blur-xl p-4",
          className,
        )}
      >
        <Error message={error} />
      </div>
    )
  }

  // Function to get the appropriate icon based on account type
  const getAccountIcon = (type: string) => {
    switch (type) {
      case "savings":
        return <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      case "checking":
        return <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      case "investment":
        return <ArrowUpRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
      case "debt":
        return <CreditCard className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
      default:
        return <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
    }
  }

  // Function to get the appropriate background color based on account type
  const getAccountBgColor = (type: string) => {
    switch (type) {
      case "savings":
        return "bg-emerald-100 dark:bg-emerald-900/30"
      case "checking":
        return "bg-blue-100 dark:bg-blue-900/30"
      case "investment":
        return "bg-purple-100 dark:bg-purple-900/30"
      case "debt":
        return "bg-red-100 dark:bg-red-900/30"
      default:
        return "bg-gray-100 dark:bg-gray-900/30"
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
      {/* Total Balance Section */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Total Balance</p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{totalBalance}</h1>
      </div>

      {/* Accounts List */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Your Accounts</h2>
        </div>

        <div className="space-y-1">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={cn(
                "group flex items-center justify-between",
                "p-2 rounded-lg",
                "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                "transition-all duration-200",
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", getAccountBgColor(account.type))}>
                  {getAccountIcon(account.type)}
                </div>
                <div>
                  <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{account.title}</h3>
                  {account.description && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{account.description}</p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {account.currency} {account.balance}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Updated footer with four buttons */}
      <div className="p-2 border-t border-zinc-100 dark:border-zinc-800">
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2",
              "py-2 px-3 rounded-lg",
              "text-xs font-medium",
              "bg-zinc-900 dark:bg-zinc-50",
              "text-zinc-50 dark:text-zinc-900",
              "hover:bg-zinc-800 dark:hover:bg-zinc-200",
              "shadow-sm hover:shadow",
              "transition-all duration-200",
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2",
              "py-2 px-3 rounded-lg",
              "text-xs font-medium",
              "bg-zinc-900 dark:bg-zinc-50",
              "text-zinc-50 dark:text-zinc-900",
              "hover:bg-zinc-800 dark:hover:bg-zinc-200",
              "shadow-sm hover:shadow",
              "transition-all duration-200",
            )}
          >
            <SendHorizontal className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2",
              "py-2 px-3 rounded-lg",
              "text-xs font-medium",
              "bg-zinc-900 dark:bg-zinc-50",
              "text-zinc-50 dark:text-zinc-900",
              "hover:bg-zinc-800 dark:hover:bg-zinc-200",
              "shadow-sm hover:shadow",
              "transition-all duration-200",
            )}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Top-up</span>
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2",
              "py-2 px-3 rounded-lg",
              "text-xs font-medium",
              "bg-zinc-900 dark:bg-zinc-50",
              "text-zinc-50 dark:text-zinc-900",
              "hover:bg-zinc-800 dark:hover:bg-zinc-200",
              "shadow-sm hover:shadow",
              "transition-all duration-200",
            )}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>More</span>
          </button>
        </div>
      </div>
    </div>
  )
}

