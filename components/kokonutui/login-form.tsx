"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Error } from "@/components/ui/error"
import { useBankingData } from "@/hooks/use-banking-data"
import { APP_VERSION } from "@/lib/version"
import { InfoModal } from "@/components/info-modal"
import { InfoButton } from "@/components/info-button"

export default function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isConsumerKeySet, setIsConsumerKeySet] = useState(false)
  const router = useRouter()
  // Use a more specific destructuring to avoid triggering authentication checks
  const { login, isAuthenticated } = useBankingData()

  // Check if URL contains logged_out parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loggedOut = urlParams.get('logged_out') === 'true';

    // Only redirect if authenticated AND not just logged out
    if (isAuthenticated && !loggedOut) {
      console.log("Already authenticated, redirecting to dashboard");
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Log and set environment variables
    console.log("NEXT_PUBLIC_OBP_CONSUMER_KEY set:", !!process.env.NEXT_PUBLIC_OBP_CONSUMER_KEY)
    console.log("NEXT_PUBLIC_OBP_API_URL:", process.env.NEXT_PUBLIC_OBP_API_URL)

    // Check if either the public or server-side consumer key is set
    setIsConsumerKeySet(!!process.env.NEXT_PUBLIC_OBP_CONSUMER_KEY || !!process.env.OBP_CONSUMER_KEY)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")

    try {
      // Login and let the useEffect handle the redirect
      await login(username, password)
      console.log("Login successful, waiting for redirect");

      // No need to manually redirect here as it's handled by the useEffect
    } catch (err: any) { // Use any type to bypass TypeScript's strict checking
      console.error("Login error:", err)
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickLogin = async (demoUsername: string, demoPassword: string) => {
    setIsLoading(true)
    setErrorMessage("")

    try {
      // Set the form fields for visual feedback
      setUsername(demoUsername)
      setPassword(demoPassword)

      // Login with the demo credentials
      await login(demoUsername, demoPassword)
      console.log("Quick login successful, waiting for redirect");

    } catch (err: any) {
      console.error("Quick login error:", err)
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Login to Banking Dashboard</CardTitle>
          <InfoButton onClick={() => setIsInfoModalOpen(true)} />
        </div>
        <CardDescription>Enter your Open Bank Project credentials to access your accounts</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && <Error message={errorMessage} />}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>For demo purposes, you can use:</p>

          </div>

        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>

          <div className="w-full space-y-2">
            <div className="text-sm font-medium text-center mb-2">Quick Demo Login</div>
            <div className="grid grid-cols-3 gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => handleQuickLogin("katja.fi.29@example.com", "ca0317")}
                className="text-xs"
              >
                Katja
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => handleQuickLogin("robert.uk.29@example.com", "d9c663")}
                className="text-xs"
              >
                Robert
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => handleQuickLogin("ellie.de.29@example.com", "2efb1f")}
                className="text-xs"
              >
                Ellie
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">Version: {APP_VERSION}</p>
        </CardFooter>
      </form>
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </Card>
  )
}
