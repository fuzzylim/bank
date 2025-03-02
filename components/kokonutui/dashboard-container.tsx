"use client"

import { useEffect, useState } from "react"
import { useBankingData } from "@/hooks/use-banking-data"
import Dashboard from "./dashboard"
import LoadingModal from "./loading-modal"
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
    logout,
    accounts,
    transactions,
    username
  } = useBankingData()

  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [availableBanks, setAvailableBanks] = useState<Array<{ id: string, name: string }>>([])

  // State to track if we should show the loading modal
  const [showLoadingModal, setShowLoadingModal] = useState(true)

  // State to track if initial data loading has happened
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  // Check if we already have data (for returning users)
  const hasExistingData = accounts.length > 0 || transactions.length > 0

  // If we have existing data, don't show loading modal initially
  useEffect(() => {
    if (hasExistingData) {
      setShowLoadingModal(false)
    }
  }, [hasExistingData])

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

  // Check authentication status and redirect if not authenticated
  useEffect(() => {
    // Only consider authentication status after auth check is complete
    if (!isAuthenticated && authCheckComplete) {
      console.log("Not authenticated in dashboard container (auth check complete), redirecting to login")
      router.push("/login")
      return
    }

    // Load data when authenticated and not already loaded
    if (isAuthenticated && !initialDataLoaded) {
      console.log("Loading initial data in dashboard container")
      refreshData()
        .then(() => {
          setInitialDataLoaded(true)
        })
        .catch((err) => {
          console.error("Error loading initial data:", err)
          if (
            err.message?.includes("Not authenticated") ||
            err.message?.includes("No authentication token") ||
            err.message?.includes("Authentication token expired")
          ) {
            router.push("/login")
          }
        })
    }
  }, [isAuthenticated, authCheckComplete, router, refreshData, initialDataLoaded])

  // Handle manual refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    // Show the loading modal when manually refreshing
    setShowLoadingModal(true);

    try {
      await forceRefresh();
    } catch (error) {
      console.error("Error refreshing data:", error);
      // Hide modal on error
      setShowLoadingModal(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle bank selection
  const handleBankChange = (bankId: string) => {
    // Show the loading modal when changing banks
    setShowLoadingModal(true);
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

  // Handler for when loading is complete
  const handleLoadingComplete = () => {
    setShowLoadingModal(false);
  };

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

  // Show minimal loading spinner when no data is available
  if (isLoading && !hasExistingData) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-[#0F0F12]">
        <div className="flex justify-end p-4">
          <LogoutButton />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
            >
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Loading Modal - shown during data loading or refresh */}
      {showLoadingModal && (
        <LoadingModal
          isOpen={showLoadingModal}
          onComplete={handleLoadingComplete}
        />
      )}


      <Dashboard />
    </div>
  )
}
