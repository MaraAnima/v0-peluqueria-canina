"use client"

import { ExtraService } from "@/lib/booking-types"
import { cn } from "@/lib/utils"
import { Scissors, Sparkles, Brush, Ear } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ExtrasStepProps {
  extras: ExtraService[]
  selected: ExtraService[]
  onToggle: (extra: ExtraService) => void
  onContinue: () => void
  totalDuration: string
  subtotal: number
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  brush: Brush,
  scissors: Scissors,
  sparkles: Sparkles,
  cut: Scissors,
  ear: Ear
}

export function ExtrasStep({ extras, selected, onToggle, onContinue, totalDuration, subtotal }: ExtrasStepProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="bg-card rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-[#43c7cd] mb-6">
          ¿Querés agregar algún servicio extra?
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {extras.map((extra) => {
            const Icon = ICONS[extra.icon] || Sparkles
            const isSelected = selected.some(s => s.id === extra.id)
            
            return (
              <div
                key={extra.id}
                onClick={() => onToggle(extra)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onToggle(extra)}
                className={cn(
                  "relative p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer",
                  "hover:shadow-md",
                  isSelected 
                    ? "border-[#43c7cd] bg-[#43c7cd]/5" 
                    : "border-border bg-card hover:border-[#43c7cd]/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isSelected ? "bg-[#43c7cd] text-white" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "font-medium text-sm",
                      extra.price === 0 ? "text-green-600" : "text-foreground"
                    )}>
                      {extra.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {extra.description}
                    </p>
                    {extra.price > 0 && (
                      <p className="text-sm font-semibold text-foreground mt-2">
                        ${extra.price} {extra.duration && <span className="font-normal text-muted-foreground">/ {extra.duration}</span>}
                      </p>
                    )}
                  </div>
                  <div 
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center mt-1",
                      isSelected ? "bg-[#43c7cd] border-[#43c7cd]" : "border-muted-foreground/30"
                    )}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 bg-card rounded-2xl shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-sm text-muted-foreground">Duración total:</span>
            <span className="ml-2 font-semibold">{totalDuration}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Subtotal:</span>
            <span className="ml-2 font-bold text-lg">${subtotal}</span>
          </div>
        </div>
        <Button 
          onClick={onContinue}
          className="bg-[#43c7cd] hover:bg-[#f9c74f] hover:text-foreground text-white px-8 rounded-xl font-semibold transition-colors"
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
