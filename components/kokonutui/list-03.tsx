"use client"

import { cn } from "@/lib/utils"
import {
  Calendar,
  type LucideIcon,
  ArrowRight,
  CheckCircle2,
  Timer,
  AlertCircle,
  PiggyBank,
  TrendingUp,
  CreditCard,
} from "lucide-react"
import React from "react"
import { useBankingData } from "@/hooks/use-banking-data"
import { Skeleton } from "@/components/ui/skeleton"

interface List03Props {
  className?: string
}

const iconMap: Record<string, LucideIcon> = {
  PiggyBank: PiggyBank,
  TrendingUp: TrendingUp,
  CreditCard: CreditCard,
}

const statusConfig = {
  pending: {
    icon: Timer,
    class: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  "in-progress": {
    icon: AlertCircle,
    class: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  completed: {
    icon: CheckCircle2,
    class: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
}

const iconStyles = {
  savings: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
  investment: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
  debt: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
}

export default function List03({ className }: List03Props) {
  const { financialGoals, isLoading } = useBankingData()

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("w-full overflow-x-auto scrollbar-none", className)}>
        <div className="flex gap-3 min-w-full p-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-[280px] shrink-0">
              <Skeleton className="h-[220px] w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full overflow-x-auto scrollbar-none", className)}>
      <div className="flex gap-3 min-w-full p-1">
        {financialGoals.map((item) => {
          const IconComponent = iconMap[item.icon] || PiggyBank

          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-col",
                "w-[280px] shrink-0",
                "bg-white dark:bg-zinc-900/70",
                "rounded-xl",
                "border border-zinc-100 dark:border-zinc-800",
                "hover:border-zinc-200 dark:hover:border-zinc-700",
                "transition-all duration-200",
                "shadow-sm backdrop-blur-xl",
              )}
            >
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className={cn("p-2 rounded-lg", iconStyles[item.iconStyle as keyof typeof iconStyles])}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5",
                      statusConfig[item.status].bg,
                      statusConfig[item.status].class,
                    )}
                  >
                    {React.createElement(statusConfig[item.status].icon, { className: "w-3.5 h-3.5" })}
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">{item.title}</h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{item.subtitle}</p>
                </div>

                {typeof item.progress === "number" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
                      <span className="text-zinc-900 dark:text-zinc-100">{item.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {item.amount && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.amount}</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">target</span>
                  </div>
                )}

                <div className="flex items-center text-xs text-zinc-600 dark:text-zinc-400">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  <span>{item.date}</span>
                </div>
              </div>

              <div className="mt-auto border-t border-zinc-100 dark:border-zinc-800">
                <button
                  className={cn(
                    "w-full flex items-center justify-center gap-2",
                    "py-2.5 px-3",
                    "text-xs font-medium",
                    "text-zinc-600 dark:text-zinc-400",
                    "hover:text-zinc-900 dark:hover:text-zinc-100",
                    "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                    "transition-colors duration-200",
                  )}
                >
                  View Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

