"use client"

import Image from "next/image"
import { Service } from "@/lib/booking-types"
import { cn } from "@/lib/utils"

interface ServiceStepProps {
  services: Service[]
  selected: Service | null
  onSelect: (service: Service) => void
}

const SERVICE_IMAGES: Record<string, string> = {
  "bano-s": "/images/dog-s.jpg",
  "bano-m": "/images/dog-m.jpg",
  "bano-l": "/images/dog-l.jpg",
  "bano-xl": "/images/dog-xl.jpg"
}

const IMAGE_SIZES: Record<string, string> = {
  "bano-s": "w-20 h-20",
  "bano-m": "w-24 h-24",
  "bano-l": "w-28 h-28",
  "bano-xl": "w-32 h-32"
}

export function ServiceStep({ services, selected, onSelect }: ServiceStepProps) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={cn(
              "group relative overflow-hidden rounded-2xl bg-card border-2 transition-all duration-200",
              "hover:shadow-lg hover:scale-[1.02]",
              selected?.id === service.id 
                ? "border-primary shadow-lg scale-[1.02]" 
                : "border-transparent shadow-md"
            )}
          >
            <div className="aspect-[4/3] bg-gradient-to-b from-muted to-background flex items-center justify-center p-4">
              <div className={cn("relative", IMAGE_SIZES[service.id] || "w-24 h-24")}>
                <Image 
                  src={SERVICE_IMAGES[service.id] || "/images/dog-m.jpg"}
                  alt={service.name}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <div className="p-4 bg-primary">
              <h3 className="text-base font-semibold text-primary-foreground">
                {service.name}
              </h3>
              <p className="text-sm text-primary-foreground/80 mt-1">
                {service.description}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-primary-foreground/80">
                  {service.duration}
                </span>
                <span className="text-lg font-bold text-primary-foreground">
                  ${service.price}
                </span>
              </div>
              <span className="block w-full mt-3 py-2 px-4 bg-white text-primary font-medium rounded-lg text-center group-hover:bg-white/90 transition-colors">
                Seleccionar
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
