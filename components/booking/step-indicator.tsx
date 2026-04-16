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
    <div className="relative">
      {/* Main header bar */}
      <div className="w-full bg-[#43c7cd] overflow-x-auto">
        <div className="flex items-center justify-center min-w-max px-4 py-4">
          {steps.map((step, index) => {
            const isCompleted = step.id < currentStep
            const isCurrent = step.id === currentStep
            const completedValue = completedSteps[step.id]
            
            return (
              <div key={step.id} className="flex items-center">
                <div 
                  className={cn(
                    "flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-200",
                    isCurrent && "bg-white/25",
                    isCompleted && "opacity-90"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isCompleted && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                    <span className={cn(
                      "text-sm font-medium text-white",
                      isCurrent && "font-bold"
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
                  <div className="relative mx-1">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/40">
                      <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Decorative wave */}
      <div className="w-full h-6 overflow-hidden bg-background">
        <svg 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none" 
          className="w-full h-full"
          style={{ transform: 'rotate(180deg)' }}
        >
          <path 
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
            fill="#43c7cd"
          />
        </svg>
      </div>
    </div>
  )
}
