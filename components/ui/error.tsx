import { AlertCircle } from "lucide-react"

interface ErrorProps {
  message: string
}

export function Error({ message }: ErrorProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-md flex items-center gap-2 text-sm">
      <AlertCircle className="h-4 w-4" />
      {message}
    </div>
  )
}

