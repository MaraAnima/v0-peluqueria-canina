"use client"

import Image from "next/image"
import { Category } from "@/lib/booking-types"
import { cn } from "@/lib/utils"

interface CategoryStepProps {
  categories: Category[]
  selected: Category | null
  onSelect: (category: Category) => void
}

const CATEGORY_IMAGES: Record<string, string> = {
  "pelo-corto": "/images/pelo-corto.jpg",
  "pelo-largo": "/images/pelo-largo.jpg"
}

export function CategoryStep({ categories, selected, onSelect }: CategoryStepProps) {
  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category)}
            className={cn(
              "group relative overflow-hidden rounded-2xl bg-card border-2 transition-all duration-200",
              "hover:shadow-lg hover:scale-[1.02]",
              selected?.id === category.id 
                ? "border-primary shadow-lg scale-[1.02]" 
                : "border-transparent shadow-md"
            )}
          >
            <div className="aspect-square bg-gradient-to-b from-muted to-background flex items-center justify-center p-4">
              <div className="relative w-40 h-40">
                <Image 
                  src={CATEGORY_IMAGES[category.id]}
                  alt={category.name}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <div className="p-5 bg-[#43c7cd]">
              <h3 className="text-lg font-semibold text-white mb-2">
                {category.name}
              </h3>
              <span className="block w-full py-2.5 px-4 bg-white text-[#43c7cd] font-semibold rounded-xl group-hover:bg-[#f9c74f] group-hover:text-foreground transition-colors">
                Seleccionar
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
