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
import { Check, Loader2, RefreshCw, Server, Lock, Unlock, LogIn, ShieldCheck } from "lucide-react"

// Login progress steps
type LoginStep = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'idle' | 'loading' | 'complete' | 'error';
}

export default function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isConsumerKeySet, setIsConsumerKeySet] = useState(false)
  // Data loading sub-steps
  type DataLoadingStep = {
    id: string;
    label: string;
    status: 'idle' | 'loading' | 'complete' | 'error';
    progress?: number; // Optional progress percentage (0-100)
  }

  const [dataLoadingSteps, setDataLoadingSteps] = useState<DataLoadingStep[]>([
    {
      id: 'banks',
      label: 'Loading banks...',
      status: 'idle'
    },
    {
      id: 'accounts',
      label: 'Loading accounts...',
      status: 'idle'
    },
    {
      id: 'transactions',
      label: 'Loading transactions...',
      status: 'idle',
      progress: 0
    }
  ]);

  // Update data loading sub-step status
  const updateDataLoadingStep = (stepId: string, status: 'idle' | 'loading' | 'complete' | 'error', progress?: number) => {
    setDataLoadingSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId
          ? {
            ...step,
            status,
            // Keep existing progress if not provided and not complete/error
            progress: status === 'complete' ? 100 :
              status === 'error' ? undefined :
                progress !== undefined ? progress : step.progress
          }
          : step
      )
    );
  };

  // Add transaction progress tracking
  const [accountsToProcess, setAccountsToProcess] = useState(0);
  const [accountsProcessed, setAccountsProcessed] = useState(0);

  const [loginSteps, setLoginSteps] = useState<LoginStep[]>([
    {
      id: 'prepare',
      label: 'Preparing request',
      description: 'Setting up authentication request',
      icon: <RefreshCw className="h-4 w-4" />,
      status: 'idle'
    },
    {
      id: 'authenticate',
      label: 'Authenticating',
      description: 'Validating credentials with banking API',
      icon: <Lock className="h-4 w-4" />,
      status: 'idle'
    },
    {
      id: 'token',
      label: 'Receiving token',
      description: 'Obtaining secure access token',
      icon: <ShieldCheck className="h-4 w-4" />,
      status: 'idle'
    },
    {
      id: 'data',
      label: 'Loading data',
      description: 'Fetching your banking information',
      icon: <Server className="h-4 w-4" />,
      status: 'idle'
    },
    {
      id: 'complete',
      label: 'Completing login',
      description: 'Finalizing and preparing to load data',
      icon: <LogIn className="h-4 w-4" />,
      status: 'idle'
    }
  ])

  // Function to update a specific step's status
  const updateStepStatus = (stepId: string, status: 'idle' | 'loading' | 'complete' | 'error') => {
    setLoginSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    )
  }
  const router = useRouter()
  // Use a more specific destructuring to avoid triggering authentication checks
  const { login, isAuthenticated } = useBankingData()

  // Check if URL contains logged_out parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loggedOut = urlParams.get('logged_out') === 'true';

    // Only redirect if authenticated AND not just logged out
    if (isAuthenticated && !loggedOut) {
      console.log("Already authenticated, redirecting to loading screen");

      // Show progress before redirecting
      setIsLoading(true);
      updateStepStatus('prepare', 'complete');
      updateStepStatus('authenticate', 'complete');
      updateStepStatus('token', 'complete');
      updateStepStatus('complete', 'loading');

      // Use a small delay before redirecting to show the progress
      setTimeout(() => {
        updateStepStatus('complete', 'complete');
        setTimeout(() => {
          router.push("/loading-bank-data");
        }, 300);
      }, 500);
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

    // Reset all steps to idle
    setLoginSteps(prevSteps => prevSteps.map(step => ({ ...step, status: 'idle' })))

    try {
      // Step 1: Preparing request
      updateStepStatus('prepare', 'loading')
      await new Promise(resolve => setTimeout(resolve, 300)) // Brief delay for UI
      updateStepStatus('prepare', 'complete')

      // Step 2: Authenticating
      updateStepStatus('authenticate', 'loading')

      // Step 3: Token
      updateStepStatus('token', 'idle')

      try {
        // Login with preventRedirect=true so we can handle the redirect ourselves
        await login(username, password, true)
        console.log("Login successful, credential verification complete")

        // Auth and token steps are complete
        updateStepStatus('authenticate', 'complete')
        updateStepStatus('token', 'complete')

        // Complete step
        updateStepStatus('complete', 'loading')
        await new Promise(resolve => setTimeout(resolve, 300))
        updateStepStatus('complete', 'complete')

        // Redirect to loading page instead of dashboard
        console.log("Authentication complete, redirecting to loading page")
        await new Promise(resolve => setTimeout(resolve, 500)) // Brief delay for UI feedback
        router.push("/loading-bank-data")
      } catch (loginErr) {
        throw loginErr
      }

    } catch (err: any) { // Use any type to bypass TypeScript's strict checking
      console.error("Login error:", err)
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.")

      // Mark current loading step as error
      const currentLoadingStep = loginSteps.find(step => step.status === 'loading')
      if (currentLoadingStep) {
        updateStepStatus(currentLoadingStep.id, 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickLogin = async (demoUsername: string, demoPassword: string) => {
    setIsLoading(true)
    setErrorMessage("")

    // Reset all steps to idle
    setLoginSteps(prevSteps => prevSteps.map(step => ({ ...step, status: 'idle' })))

    try {
      // Set the form fields for visual feedback
      setUsername(demoUsername)
      setPassword(demoPassword)

      // Step 1: Preparing request
      updateStepStatus('prepare', 'loading')
      await new Promise(resolve => setTimeout(resolve, 300)) // Brief delay for UI
      updateStepStatus('prepare', 'complete')

      // Step 2: Authenticating
      updateStepStatus('authenticate', 'loading')

      // Step 3: Token
      updateStepStatus('token', 'idle')

      try {
        // Login with the demo credentials with preventRedirect=true
        await login(demoUsername, demoPassword, true)
        console.log("Quick login successful, credential verification complete")

        // Auth and token steps are now complete
        updateStepStatus('authenticate', 'complete')
        updateStepStatus('token', 'complete')

        // Complete step
        updateStepStatus('complete', 'loading')
        await new Promise(resolve => setTimeout(resolve, 300))
        updateStepStatus('complete', 'complete')

        // Redirect to loading page instead of dashboard
        console.log("Authentication complete, redirecting to loading page")
        await new Promise(resolve => setTimeout(resolve, 500)) // Brief delay for UI feedback
        router.push("/loading-bank-data")
      } catch (loginErr) {
        throw loginErr
      }

    } catch (err: any) {
      console.error("Quick login error:", err)
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.")

      // Mark current loading step as error
      const currentLoadingStep = loginSteps.find(step => step.status === 'loading')
      if (currentLoadingStep) {
        updateStepStatus(currentLoadingStep.id, 'error')
      }
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

          {/* Login Progress Tracker */}
          {isLoading && (
            <div className="bg-background border rounded-md p-4 mt-2">
              <div className="text-sm font-medium mb-3">Login Progress</div>
              <div className="space-y-3">
                {loginSteps.map((step) => (
                  <div key={step.id} className="flex items-center">
                    <div className="mr-3 flex-shrink-0">
                      {step.status === 'loading' && (
                        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      )}
                      {step.status === 'complete' && (
                        <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {step.status === 'error' && (
                        <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">×</span>
                        </div>
                      )}
                      {step.status === 'idle' && (
                        <div className="h-5 w-5 rounded-full border border-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between">
                        <p className={`text-sm font-medium ${step.status === 'error' ? 'text-red-600' : 'text-foreground'}`}>
                          {step.label}
                        </p>
                        <div className="ml-2">
                          {step.icon}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>

                      {/* Show data loading sub-steps when data step is loading */}
                      {step.id === 'data' && step.status === 'loading' && (
                        <div className="mt-2 ml-2 space-y-2">
                          {dataLoadingSteps.map(subStep => (
                            <div key={subStep.id} className="flex flex-col">
                              <div className="flex items-center">
                                <div className="mr-2 flex-shrink-0">
                                  {subStep.status === 'loading' && (
                                    <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                  )}
                                  {subStep.status === 'complete' && (
                                    <div className="h-3 w-3 rounded-full bg-green-500 flex items-center justify-center">
                                      <Check className="h-2 w-2 text-white" />
                                    </div>
                                  )}
                                  {subStep.status === 'idle' && (
                                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                                  )}
                                </div>
                                <div className="flex-1 flex justify-between items-center">
                                  <p className={`text-xs ${subStep.status === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
                                    {subStep.label}
                                  </p>
                                  {/* Show account count for transactions step with progress */}
                                  {subStep.id === 'transactions' && subStep.status === 'loading' && accountsToProcess > 0 && (
                                    <p className="text-xs text-muted-foreground ml-2">
                                      {accountsProcessed}/{accountsToProcess}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Progress bar for steps with progress tracking */}
                              {subStep.progress !== undefined && subStep.status === 'loading' && (
                                <>
                                  <div className="mt-1 mb-1 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                    <div
                                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                      style={{ width: `${subStep.progress}%` }}
                                    />
                                  </div>
                                  {subStep.id === 'transactions' && accountsProcessed > 0 && (
                                    <p className="text-[10px] text-muted-foreground text-right">
                                      Processing account {accountsProcessed} of {accountsToProcess}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
          {!isLoading || (
            isLoading &&
            loginSteps.every(step => step.status === 'complete') &&
            typeof window !== "undefined" &&
            window.localStorage?.getItem('stay_on_login_page')
          ) ? (
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                if (isLoading && loginSteps.every(step => step.status === 'complete')) {
                  // Clear the flag and redirect manually
                  if (typeof window !== "undefined" && window.localStorage) {
                    window.localStorage.removeItem('stay_on_login_page');
                  }
                  router.push("/dashboard");
                } else {
                  // Regular submit if we're not already logged in
                  // Use e.preventDefault to simulate form submission without event
                  const e = { preventDefault: () => { } } as React.FormEvent;
                  handleSubmit(e);
                }
              }}
            >
              {isLoading && loginSteps.every(step => step.status === 'complete')
                ? "Continue to Dashboard"
                : "Login"}
            </Button>
          ) : (
            <Button type="submit" className="w-full" disabled={true}>
              Logging in...
            </Button>
          )}

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
                Ellie - does not work!
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
