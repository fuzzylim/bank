"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootErrorBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error)

      // Check if this is a Next.js redirect error
      if (event.error && (
        (event.error.message && event.error.message.includes("NEXT_REDIRECT")) ||
        (event.error.stack && event.error.stack.includes("redirect.js"))
      )) {
        // Prevent the error from bubbling up
        event.preventDefault()

        // Handle the redirect gracefully
        console.log("Handling redirect error")

        // Check if we're already on the login page to avoid loops
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          router.push("/login")
        } else {
          console.log("Already on login page, not redirecting to avoid loop")
        }
      }
    }

    window.addEventListener("error", handleError)

    return () => {
      window.removeEventListener("error", handleError)
    }
  }, [router])

  return <>{children}</>
}

