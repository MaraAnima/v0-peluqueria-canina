"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Phone } from "lucide-react"

interface ContactStepProps {
  initialName?: string
  initialPhone?: string
  onContinue: (name: string, phone: string) => void
}

export function ContactStep({ initialName = "", initialPhone = "", onContinue }: ContactStepProps) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && phone.trim()) {
      onContinue(name.trim(), phone.trim())
    }
  }

  const isValid = name.trim().length > 0 && phone.trim().length > 0

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
            Tu nombre
          </Label>
          <Input
            id="name"
            placeholder="Ej: Juan Pérez"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-12"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            Tu teléfono
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Ej: 099 123 456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="h-12"
          />
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
