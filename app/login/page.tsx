import { cookies } from "next/headers"
import LoginForm from "@/components/kokonutui/login-form"
import { redirect } from "next/navigation"

// This function completely disables server-side redirects, letting the client handle authentication
export default function LoginPage() {
  // Simply render the login form and let client-side code handle redirects
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0F0F12]">
      <LoginForm />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0F0F12]">
      <LoginForm />
    </div>
  )
}

