import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import RootErrorBoundary from "@/components/root-error-boundary"
import { Analytics } from '@vercel/analytics/react'
import { Metadata } from 'next'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "KokonutUI Dashboard",
  description: "A modern dashboard with theme switching",
  generator: 'v0.dev',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://bank.presidio.com.au'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <RootErrorBoundary>{children}</RootErrorBoundary>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}

