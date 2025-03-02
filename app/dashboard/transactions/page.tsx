"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useBankingData } from "@/hooks/use-banking-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Search, ArrowUpDown, ArrowDownLeft, ArrowUpRight, Filter } from "lucide-react"
import TransactionDetailsModal from "@/components/kokonutui/transaction-details-modal"
import { cn } from "@/lib/utils"

export default function TransactionsPage() {
    const router = useRouter()
    const { transactions, isLoading, selectedBank } = useBankingData()

    // State for transaction detail modal
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
    const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

    // State for filtering and sorting
    const [searchTerm, setSearchTerm] = useState("")
    const [filterType, setFilterType] = useState<string>("all")
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
    const [sortField, setSortField] = useState<string>("date")

    // Derived state - filtered and sorted transactions
    const [displayedTransactions, setDisplayedTransactions] = useState(transactions)

    useEffect(() => {
        // Filter transactions
        let filtered = [...transactions]

        // Apply search filter
        if (searchTerm) {
            const lowercaseSearch = searchTerm.toLowerCase()
            filtered = filtered.filter(tx =>
                tx.title.toLowerCase().includes(lowercaseSearch) ||
                (tx.description && tx.description.toLowerCase().includes(lowercaseSearch))
            )
        }

        // Apply type filter
        if (filterType !== "all") {
            filtered = filtered.filter(tx => tx.type === filterType)
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0

            if (sortField === "amount") {
                comparison = parseFloat(a.amount) - parseFloat(b.amount)
            } else if (sortField === "title") {
                comparison = a.title.localeCompare(b.title)
            } else {
                // Default to date sorting
                comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
            }

            return sortDirection === "asc" ? comparison : -comparison
        })

        setDisplayedTransactions(filtered)
    }, [transactions, searchTerm, filterType, sortDirection, sortField])

    // Handle transaction selection
    const handleTransactionClick = (transactionId: string) => {
        setSelectedTransactionId(transactionId)
        setIsDetailsModalOpen(true)
    }

    // Toggle sort direction
    const toggleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortDirection("desc") // Default to descending when changing fields
        }
    }

    return (
        <div className="container py-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => router.push("/dashboard")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Dashboard</span>
                    </Button>
                    <h1 className="text-2xl font-bold">All Transactions</h1>
                </div>
            </div>

            {/* Filters and search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search transactions..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[160px]">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                <span>{filterType === "all" ? "All Types" : filterType === "incoming" ? "Incoming" : "Outgoing"}</span>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="incoming">Incoming</SelectItem>
                            <SelectItem value="outgoing">Outgoing</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sortField} onValueChange={setSortField}>
                        <SelectTrigger className="w-[160px]">
                            <div className="flex items-center gap-2">
                                <ArrowUpDown className="h-4 w-4" />
                                <span>Sort by: {sortField.charAt(0).toUpperCase() + sortField.slice(1)}</span>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="amount">Amount</SelectItem>
                            <SelectItem value="title">Name</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Transactions table */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            ) : displayedTransactions.length === 0 ? (
                <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
                    <p className="text-zinc-500 dark:text-zinc-400">No transactions found</p>
                    {searchTerm || filterType !== "all" ? (
                        <Button
                            variant="link"
                            onClick={() => {
                                setSearchTerm("")
                                setFilterType("all")
                            }}
                        >
                            Clear filters
                        </Button>
                    ) : null}
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">
                                    <button
                                        className="flex items-center gap-1 hover:text-black dark:hover:text-white"
                                        onClick={() => toggleSort("date")}
                                    >
                                        Date
                                        {sortField === "date" && (
                                            <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                                        )}
                                    </button>
                                </TableHead>
                                <TableHead>
                                    <button
                                        className="flex items-center gap-1 hover:text-black dark:hover:text-white"
                                        onClick={() => toggleSort("title")}
                                    >
                                        Description
                                        {sortField === "title" && (
                                            <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                                        )}
                                    </button>
                                </TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">
                                    <button
                                        className="flex items-center gap-1 ml-auto hover:text-black dark:hover:text-white"
                                        onClick={() => toggleSort("amount")}
                                    >
                                        Amount
                                        {sortField === "amount" && (
                                            <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                                        )}
                                    </button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedTransactions.map((transaction) => (
                                <TableRow
                                    key={transaction.id}
                                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                                    onClick={() => handleTransactionClick(transaction.id)}
                                >
                                    <TableCell>{transaction.timestamp}</TableCell>
                                    <TableCell>{transaction.title}</TableCell>
                                    <TableCell className="capitalize">{transaction.category}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span
                                                className={cn(
                                                    "font-medium",
                                                    transaction.type === "incoming"
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-red-600 dark:text-red-400",
                                                )}
                                            >
                                                {transaction.type === "incoming" ? "+" : "-"}${transaction.amount}
                                            </span>
                                            {transaction.type === "incoming" ? (
                                                <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

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