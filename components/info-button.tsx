import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

interface InfoButtonProps {
  onClick: () => void
  className?: string
}

export function InfoButton({ onClick, className = "" }: InfoButtonProps) {
  return (
    <Button variant="ghost" size="sm" className={`p-0 h-auto ${className}`} onClick={onClick}>
      <Info className="w-4 h-4" />
    </Button>
  )
}

