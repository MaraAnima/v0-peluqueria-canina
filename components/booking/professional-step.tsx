"use client"

import { Professional } from "@/lib/booking-types"
import { cn } from "@/lib/utils"
import { User } from "lucide-react"

interface ProfessionalStepProps {
  professionals: Professional[]
  selected: Professional | null
  onSelect: (professional: Professional) => void
}

export function ProfessionalStep({ professionals, selected, onSelect }: ProfessionalStepProps) {
  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {professionals.map((professional) => (
          <button
            key={professional.id}
            onClick={() => onSelect(professional)}
            className={cn(
              "group relative overflow-hidden rounded-2xl bg-card border-2 transition-all duration-200",
              "hover:shadow-lg hover:scale-[1.02]",
              selected?.id === professional.id 
                ? "border-primary shadow-lg scale-[1.02]" 
                : "border-transparent shadow-md"
            )}
          >
            <div className="aspect-square bg-gradient-to-b from-muted to-background flex items-center justify-center p-8">
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center",
                selected?.id === professional.id ? "bg-primary/20" : "bg-muted"
              )}>
                <User 
                  className={cn(
                    "w-12 h-12 transition-colors duration-200",
                    selected?.id === professional.id ? "text-primary" : "text-muted-foreground"
                  )} 
                  strokeWidth={1.5}
                />
              </div>
            </div>
            <div className={cn(
              "p-5 transition-colors duration-200",
              selected?.id === professional.id ? "bg-primary" : "bg-primary"
            )}>
              <h3 className="text-lg font-semibold text-primary-foreground">
                {professional.name}
              </h3>
              <p className="text-sm text-primary-foreground/80 mt-1">
                {professional.specialty}
              </p>
              <button className="w-full mt-3 py-2.5 px-4 bg-white text-primary font-medium rounded-lg hover:bg-white/90 transition-colors">
                Seleccionar
              </button>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
