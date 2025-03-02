"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, Wallet, SendHorizontal, QrCode, Plus, ArrowRight, CreditCard, X, Loader2 } from "lucide-react"
import { useBankingData } from "@/hooks/use-banking-data"
import { Skeleton } from "@/components/ui/skeleton"
import { Error } from "@/components/ui/error"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function List01({ className }: { className?: string }) {
  const { accounts, totalBalance, isLoading, error, sendMoney, topUpAccount: topUpAccountFn } = useBankingData()

  // State for modals
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [topUpModalOpen, setTopUpModalOpen] = useState(false)

  // Form states
  const [selectedSourceAccount, setSelectedSourceAccount] = useState("")
  const [selectedDestAccount, setSelectedDestAccount] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [selectedTopUpAccount, setSelectedTopUpAccount] = useState("")
  const [topUpAmount, setTopUpAmount] = useState("")
  const [topUpMethod, setTopUpMethod] = useState("standard transfer")
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)

  // Reset form state when dialogs close
  const resetForms = () => {
    setSelectedSourceAccount("")
    setSelectedDestAccount("")
    setAmount("")
    setDescription("")
    setSelectedTopUpAccount("")
    setTopUpAmount("")
    setTopUpMethod("standard transfer")
    setStatusMessage(null)
    setIsSuccess(null)
  }

  // Handler for sending money
  const handleSendMoney = async () => {
    if (!selectedSourceAccount || !selectedDestAccount || !amount) {
      setStatusMessage("Please fill in all required fields")
      setIsSuccess(false)
      return
    }

    try {
      setIsProcessing(true)
      await sendMoney(selectedSourceAccount, selectedDestAccount, amount, description)

      setStatusMessage("Money sent successfully!")
      setIsSuccess(true)

      // Close the dialog after a delay
      setTimeout(() => {
        setSendModalOpen(false)
        resetForms()
      }, 2000)

    } catch (error: any) {
      console.error("Send money error:", error)
      setStatusMessage(error instanceof Error ? error.message :
        (typeof error === 'string' ? error : "Failed to send money"))
      setIsSuccess(false)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handler for topping up account
  const handleTopUp = async () => {
    if (!selectedTopUpAccount || !topUpAmount) {
      setStatusMessage("Please fill in all required fields")
      setIsSuccess(false)
      return
    }

    try {
      setIsProcessing(true)
      await topUpAccountFn(selectedTopUpAccount, topUpAmount, topUpMethod)

      setStatusMessage("Account topped up successfully!")
      setIsSuccess(true)

      // Close the dialog after a delay
      setTimeout(() => {
        setTopUpModalOpen(false)
        resetForms()
      }, 2000)

    } catch (error: any) {
      console.error("Top up error:", error)
      setStatusMessage(error instanceof Error ? error.message :
        (typeof error === 'string' ? error : "Failed to top up account"))
      setIsSuccess(false)
    } finally {
      setIsProcessing(false)
    }
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
    <>
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

        {/* Footer with four buttons */}
        <div className="p-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              disabled
              className={cn(
                "flex items-center justify-center gap-2",
                "py-2 px-3 rounded-lg",
                "text-xs font-medium",
                "bg-zinc-200 dark:bg-zinc-700",
                "text-zinc-500 dark:text-zinc-400",
                "transition-all duration-200",
                "cursor-not-allowed opacity-70",
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSendModalOpen(true);
                resetForms();
              }}
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
              onClick={() => {
                setTopUpModalOpen(true);
                resetForms();
              }}
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
              disabled
              className={cn(
                "flex items-center justify-center gap-2",
                "py-2 px-3 rounded-lg",
                "text-xs font-medium",
                "bg-zinc-200 dark:bg-zinc-700",
                "text-zinc-500 dark:text-zinc-400",
                "transition-all duration-200",
                "cursor-not-allowed opacity-70",
              )}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>More</span>
            </button>
          </div>
        </div>
      </div>

      {/* Send Money Dialog */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Money</DialogTitle>
            <DialogDescription>
              Transfer funds between accounts
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="from-account">From Account</Label>
              <Select
                value={selectedSourceAccount}
                onValueChange={setSelectedSourceAccount}
              >
                <SelectTrigger id="from-account">
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.title} - {account.currency} {account.balance}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="to-account">To Account</Label>
              <Select
                value={selectedDestAccount}
                onValueChange={setSelectedDestAccount}
              >
                <SelectTrigger id="to-account">
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.title} - {account.currency} {account.balance}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Enter description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Status message */}
            {statusMessage && (
              <div className={cn(
                "p-3 rounded-md text-sm",
                isSuccess ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {statusMessage}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMoney}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Send Money"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top-up Dialog */}
      <Dialog open={topUpModalOpen} onOpenChange={setTopUpModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up Account</DialogTitle>
            <DialogDescription>
              Add funds to your account
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="top-up-account">Account</Label>
              <Select
                value={selectedTopUpAccount}
                onValueChange={setSelectedTopUpAccount}
              >
                <SelectTrigger id="top-up-account">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.title} - {account.currency} {account.balance}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="top-up-amount">Amount</Label>
              <Input
                id="top-up-amount"
                type="number"
                placeholder="Enter amount"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="top-up-method">Payment Method</Label>
              <Select
                value={topUpMethod}
                onValueChange={setTopUpMethod}
              >
                <SelectTrigger id="top-up-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard transfer">Standard Transfer</SelectItem>
                  <SelectItem value="credit card">Credit Card</SelectItem>
                  <SelectItem value="debit card">Debit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status message */}
            {statusMessage && (
              <div className={cn(
                "p-3 rounded-md text-sm",
                isSuccess ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {statusMessage}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTopUpModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTopUp}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Top Up"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
