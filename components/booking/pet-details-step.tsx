"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PawPrint, Heart, AlertCircle } from "lucide-react"

interface PetDetailsStepProps {
  initialPetName?: string
  initialNotes?: string
  onContinue: (petName: string, notes: string) => void
}

const validatePetName = (name: string): string | null => {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return "El nombre de la mascota es obligatorio"
  }
  return null
}

export function PetDetailsStep({ initialPetName = "", initialNotes = "", onContinue }: PetDetailsStepProps) {
  const [petName, setPetName] = useState(initialPetName)
  const [notes, setNotes] = useState(initialNotes)
  const [touched, setTouched] = useState(false)

  const petNameError = validatePetName(petName)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!petNameError) {
      onContinue(petName.trim(), notes.trim())
    }
  }

  const isValid = !petNameError

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-[#f9c74f]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <PawPrint className="w-10 h-10 text-[#f9c74f]" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Contanos sobre tu peludo
        </h2>
        <p className="text-muted-foreground">
          Queremos conocer mejor a tu mascota para darle el mejor cuidado
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-md p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="petName" className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#f9c74f]" />
            ¿Cómo se llama tu mascota? <span className="text-destructive">*</span>
          </Label>
          <Input
            id="petName"
            placeholder="Ej: Firulais, Luna, Max..."
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            onBlur={() => setTouched(true)}
            required
            className={`h-12 ${touched && petNameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            autoFocus
          />
          {touched && petNameError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {petNameError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            ¿Hay algo qué debamos saber?
          </Label>
          <Textarea
            id="notes"
            placeholder="Por ejemplo: es nervioso con los secadores, tiene alguna alergia, zonas sensibles, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Opcional - pero nos ayuda a cuidar mejor a tu mascota
          </p>
        </div>

        <Button
          type="submit"
          disabled={!isValid}
          className="w-full bg-[#43c7cd] hover:bg-[#f9c74f] hover:text-foreground text-white h-12 text-base font-semibold rounded-xl disabled:opacity-50 transition-colors"
        >
          Continuar al resumen
        </Button>
      </form>
    </div>
  )
}
