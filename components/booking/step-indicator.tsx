"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface Step {
  id: number
  name: string
  value?: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  completedSteps: Record<number, string>
}

export function StepIndicator({ steps, currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <div className="w-full bg-primary overflow-x-auto">
      <div className="flex items-center justify-center min-w-max px-4 py-3">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep
          const isCurrent = step.id === currentStep
          const completedValue = completedSteps[step.id]
          
          return (
            <div key={step.id} className="flex items-center">
              <div 
                className={cn(
                  "flex flex-col items-center px-4 py-2 rounded-lg transition-all duration-200",
                  isCurrent && "bg-white/20",
                  isCompleted && "opacity-90"
                )}
              >
                <div className="flex items-center gap-2">
                  {isCompleted && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                  <span className={cn(
                    "text-sm font-medium text-white",
                    isCurrent && "font-semibold"
                  )}>
                    {step.name}
                  </span>
                </div>
                {completedValue && (
                  <span className="text-xs text-white/80 mt-0.5">
                    {completedValue}
                  </span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="w-6 h-0.5 bg-white/30 mx-1" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
