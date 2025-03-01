"use client"

import { useEffect, useState } from "react"
import { useBankingData } from "@/hooks/use-banking-data"
import Dashboard from "./dashboard"
import { Loader2, RefreshCw } from "lucide-react"
import { Error } from "@/components/ui/error"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function DashboardContainer() {
  const {
    isLoading,
    error,
    refreshData,
    forceRefresh,
    isAuthenticated,
    authCheckComplete,
    selectedBank,
    selectBank,
    logout
  } = useBankingData()

  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [availableBanks, setAvailableBanks] = useState<Array<{ id: string, name: string }>>([])

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  // Fetch available banks
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        // Use credentials: 'include' to ensure HttpOnly cookies are sent
        const response = await fetch('/api/banks', {
          credentials: 'include',
          // Add a cache-busting parameter to prevent caching issues
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.banks && Array.isArray(data.banks)) {
            const banks = data.banks.map((bank: any) => ({
              id: bank.id,
              name: bank.short_name || bank.full_name || bank.id
            }));
            setAvailableBanks(banks);
          }
        } else if (response.status === 401) {
          // If unauthorized, handle it gracefully instead of letting it trigger a redirect
          console.log("Unauthorized when fetching banks, will redirect to login");
          router.push("/login");
        }
      } catch (error) {
        console.error("Error fetching banks:", error);
        // Don't let errors propagate to the global error handler
      }
    };

    if (isAuthenticated) {
      fetchBanks();
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Only consider authentication status after auth check is complete
    if (!isAuthenticated && authCheckComplete) {
      console.log("Not authenticated in dashboard container (auth check complete), redirecting to login")
      router.push("/login")
      return
    }

    // Only refresh data if authenticated
    if (isAuthenticated) {
      refreshData().catch((err) => {
        console.error("Error refreshing data:", err)
        if (
          err.message.includes("Not authenticated") ||
          err.message.includes("No authentication token") ||
          err.message.includes("Authentication token expired")
        ) {
          router.push("/login")
        }
      })
    }
  }, [isAuthenticated, authCheckComplete, router, refreshData]) // Include authCheckComplete to avoid premature redirects

  // Handle manual refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await forceRefresh();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle bank selection
  const handleBankChange = (bankId: string) => {
    selectBank(bankId);
  };

  // Logout button component for reuse
  const LogoutButton = () => (
    <Button
      onClick={handleLogout}
      variant="ghost"
      size="sm"
      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
    >
      Logout
    </Button>
  );

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-[#0F0F12]">
        <div className="flex justify-end p-4">
          <LogoutButton />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Error message={error} />
            <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-[#0F0F12]">
        <div className="flex justify-end p-4">
          <LogoutButton />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <p className="text-gray-600 dark:text-gray-400">Loading your banking data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4 px-4 relative z-80">
        {availableBanks.length > 1 && (
          <div className="flex items-center lg:ml-64">
            <span className="text-sm mr-2 text-gray-600 dark:text-gray-400">Bank:</span>
            <Select value={selectedBank} onValueChange={handleBankChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {availableBanks.map(bank => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isRefreshing}
          className="ml-auto"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </>
          )}
        </Button>
      </div>

      <Dashboard />
    </div>
  )
}
