"use client"

import { ExtraService } from "@/lib/booking-types"
import { cn } from "@/lib/utils"
import { Scissors, Sparkles, Brush, Ear } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

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
        <h2 className="text-xl font-semibold text-primary mb-6">
          ¿Querés agregar algún servicio extra?
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {extras.map((extra) => {
            const Icon = ICONS[extra.icon] || Sparkles
            const isSelected = selected.some(s => s.id === extra.id)
            
            return (
              <button
                key={extra.id}
                onClick={() => onToggle(extra)}
                className={cn(
                  "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                  "hover:shadow-md",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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
                  <Checkbox 
                    checked={isSelected}
                    className="mt-1"
                  />
                </div>
              </button>
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
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
