import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import RootErrorBoundary from "@/components/root-error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "KokonutUI Dashboard",
  description: "A modern dashboard with theme switching",
    generator: 'v0.dev'
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
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'