"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Phone, AlertCircle } from "lucide-react"

interface ContactStepProps {
  initialName?: string
  initialPhone?: string
  onContinue: (name: string, phone: string) => void
}

// Validation helpers
const validateName = (name: string): string | null => {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return "El nombre es obligatorio"
  }
  if (trimmed.length <= 3) {
    return "El nombre debe tener más de 3 letras"
  }
  if (/\d/.test(trimmed)) {
    return "El nombre no puede contener números"
  }
  return null
}

const validatePhone = (phone: string): string | null => {
  const trimmed = phone.trim()
  if (trimmed.length === 0) {
    return "El teléfono es obligatorio"
  }
  // Count only digits
  const digitsOnly = trimmed.replace(/\D/g, "")
  if (digitsOnly.length < 6) {
    return "El teléfono debe tener al menos 6 dígitos"
  }
  return null
}

export function ContactStep({ initialName = "", initialPhone = "", onContinue }: ContactStepProps) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [touched, setTouched] = useState({ name: false, phone: false })

  const nameError = validateName(name)
  const phoneError = validatePhone(phone)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, phone: true })
    if (!nameError && !phoneError) {
      onContinue(name.trim(), phone.trim())
    }
  }

  const isValid = !nameError && !phoneError

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-[#43c7cd]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-10 h-10 text-[#43c7cd]" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          ¡Hola! Empecemos
        </h2>
        <p className="text-muted-foreground">
          Contanos un poco sobre vos para poder contactarte
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-md p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Tu nombre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Ej: Juan Pérez"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            required
            className={`h-12 ${touched.name && nameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            autoFocus
          />
          {touched.name && nameError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {nameError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            Tu teléfono <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Ej: 099 123 456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
            required
            className={`h-12 ${touched.phone && phoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {touched.phone && phoneError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {phoneError}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!isValid}
          className="w-full bg-[#43c7cd] hover:bg-[#f9c74f] hover:text-foreground text-white h-12 text-base font-semibold rounded-xl disabled:opacity-50 transition-colors"
        >
          Continuar
        </Button>
      </form>
    </div>
  )
}
