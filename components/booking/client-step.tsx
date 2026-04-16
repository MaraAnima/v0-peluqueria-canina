"use client"

import { useState } from "react"
import { Service, ExtraService, Professional } from "@/lib/booking-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ChevronDown } from "lucide-react"

interface ClientStepProps {
  service: Service | null
  extras: ExtraService[]
  professional: Professional | null
  date: Date | null
  time: string | null
  location: string
  category: string
  onSubmit: (data: {
    name: string
    email: string
    phone: string
    petName: string
    notes: string
  }) => void
}

export function ClientStep({ 
  service, 
  extras, 
  professional, 
  date, 
  time, 
  location,
  category,
  onSubmit 
}: ClientStepProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    petName: "",
    notes: ""
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptSucanTerms, setAcceptSucanTerms] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (acceptTerms && acceptSucanTerms) {
      onSubmit(formData)
    }
  }
  
  const total = (service?.price || 0) + extras.reduce((sum, e) => sum + e.price, 0)
  
  const formattedDate = date?.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="bg-card rounded-2xl shadow-md p-6 md:p-8">
        <h2 className="text-xl font-semibold text-primary text-center mb-8">
          Por favor, confirmá los datos
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                Nombre: <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Tu nombre y apellido"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                Email: <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Tu email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                Teléfono: <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Tu celular o teléfono"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="petName" className="flex items-center gap-1">
                Nombre de tu mascota: <span className="text-red-500">*</span>
              </Label>
              <Input
                id="petName"
                placeholder="Nombre de tu mascota"
                value={formData.petName}
                onChange={(e) => setFormData({ ...formData, petName: e.target.value })}
                required
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">
                Información importante sobre tu mascota que debe saber el peluquero antes de la cita:
              </Label>
              <Textarea
                id="notes"
                placeholder="Información importante sobre tu mascota que debe saber el peluquero antes de la cita"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </div>
          </form>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-primary">
                {service?.name}
              </h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex">
                  <span className="text-muted-foreground w-24">Fecha:</span>
                  <span className="text-primary font-medium">{formattedDate} {time}</span>
                </div>
                <div className="flex">
                  <span className="text-muted-foreground w-24">Profesional:</span>
                  <span className="text-primary font-medium">{professional?.name}</span>
                </div>
                <div className="flex">
                  <span className="text-muted-foreground w-24">Ubicación:</span>
                  <span className="text-primary font-medium">{location}</span>
                </div>
                <div className="flex">
                  <span className="text-muted-foreground w-24">Categoría:</span>
                  <span className="font-medium">{category}</span>
                </div>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Detalles de la compra</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
            </button>
            
            {showDetails && (
              <div className="bg-muted rounded-lg p-4 text-sm space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between">
                  <span>{service?.name}</span>
                  <span>${service?.price}</span>
                </div>
                {extras.map((extra) => (
                  <div key={extra.id} className="flex justify-between">
                    <span>{extra.name}</span>
                    <span>${extra.price}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-right">
              <span className="text-muted-foreground">Total por reserva: </span>
              <span className="text-xl font-bold">${total}</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  className="mt-0.5 border-red-500 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed">
                  Acepto los Términos y condiciones <span className="text-red-500">*</span>
                </Label>
              </div>
              
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="sucan-terms"
                  checked={acceptSucanTerms}
                  onCheckedChange={(checked) => setAcceptSucanTerms(checked as boolean)}
                  className="mt-0.5 border-red-500 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="sucan-terms" className="text-sm leading-relaxed">
                  Acepto los Términos y condiciones de la peluquería <span className="text-red-500">*</span>
                </Label>
              </div>
            </div>
            
            <Button 
              onClick={handleSubmit}
              disabled={!acceptTerms || !acceptSucanTerms || !formData.name || !formData.email || !formData.phone || !formData.petName}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-semibold disabled:opacity-50"
            >
              Reservar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
