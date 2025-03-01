import DashboardContainer from "@/components/kokonutui/dashboard-container"

export default function DashboardPage() {
  // We've completely removed server-side redirect
  // Let the client-side component handle authentication checks
  return <DashboardContainer />
}

