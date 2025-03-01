"use client"

import { useEffect } from "react"
import { Error } from "@/components/ui/error"
import { useRouter } from "next/navigation"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error("Unexpected error:", error)
    console.error("Error name:", error.name)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)

    // If it's a redirect error, navigate to the login page
    if (error.message.includes("NEXT_REDIRECT") || error.message.includes("Redirect")) {
      router.push("/login")
    }
  }, [error, router])

  // If it's a redirect error, don't show anything (we're navigating away)
  if (error.message.includes("NEXT_REDIRECT") || error.message.includes("Redirect")) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-[#0F0F12] p-4">
      <Error message={`An unexpected error occurred: ${error.message}`} />
      <div className="mt-4 space-x-4">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Go to Home
        </button>
      </div>
    </div>
  )
}

