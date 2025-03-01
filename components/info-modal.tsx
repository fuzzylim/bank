"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
// Remove direct import of testApiConnection

interface IntegrationStatus {
  name: string
  status: "connected" | "disconnected" | "testing"
  details: string
}

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    { name: "Client-side API", status: "disconnected", details: "Not checked" },
    { name: "Server-side API", status: "disconnected", details: "Not checked" },
  ])
  const [isTestingApi, setIsTestingApi] = useState(false)

  useEffect(() => {
    if (isOpen) {
      checkIntegrations()
    }
  }, [isOpen])

  const checkIntegrations = async () => {
    setIsTestingApi(true)
    setIntegrations((prev) =>
      prev.map((integration) => ({ ...integration, status: "testing", details: "Testing connection..." })),
    )

    // Test client-side API through our Next.js API route
    const clientResult = await fetch("/api/test-connection?client=true").then((res) => res.json())
      .catch(error => ({
        success: false,
        message: `Client API test error: ${error.message}`
      }));

    // Test server-side API
    const serverResult = await fetch("/api/test-connection").then((res) => res.json())
      .catch(error => ({
        success: false,
        message: `Server API test error: ${error.message}`
      }));

    setIntegrations([
      {
        name: "Client-side API",
        status: clientResult.success ? "connected" : "disconnected",
        details: clientResult.message,
      },
      {
        name: "Server-side API",
        status: serverResult.success ? "connected" : "disconnected",
        details: serverResult.message,
      },
    ])
    setIsTestingApi(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Integration Status</DialogTitle>
          <DialogDescription>Current status of integrated services</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {integrations.map((integration) => (
            <div key={integration.name} className="py-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{integration.name}</p>
                {integration.status === "testing" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                ) : integration.status === "connected" ? (
                  <CheckCircle className="text-green-500" />
                ) : (
                  <XCircle className="text-red-500" />
                )}
              </div>
              <p
                className={`text-sm mt-1 ${integration.status === "connected"
                  ? "text-green-600"
                  : integration.status === "testing"
                    ? "text-yellow-600"
                    : "text-red-600"
                  }`}
              >
                {integration.details}
              </p>
            </div>
          ))}
        </div>
        <Button onClick={checkIntegrations} disabled={isTestingApi} className="mt-4">
          {isTestingApi ? "Testing..." : "Retest Connections"}
        </Button>
        <Button onClick={onClose} className="mt-2">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}

