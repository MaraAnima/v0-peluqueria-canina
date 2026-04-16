"use client"

import { useState } from "react"
import { Service, ExtraService } from "@/lib/booking-types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  PawPrint,
  Scissors,
  ChevronDown,
  CheckCircle2
} from "lucide-react"

interface SummaryStepProps {
  clientName: string
  clientPhone: string
  petName: string
  petNotes: string
  service: Service | null
  extras: ExtraService[]
  date: Date | null
  time: string | null
  location: string
  category: string
  onSubmit: () => void
  onEdit: (step: number) => void
}

export function SummaryStep({ 
  clientName,
  clientPhone,
  petName,
  petNotes,
  service, 
  extras, 
  date, 
  time, 
  location,
  category,
  onSubmit,
  onEdit
}: SummaryStepProps) {
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptSucanTerms, setAcceptSucanTerms] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  
  const total = (service?.price || 0) + extras.reduce((sum, e) => sum + e.price, 0)
  
  const formattedDate = date?.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long"
  })

  const handleSubmit = () => {
    if (acceptTerms && acceptSucanTerms) {
      onSubmit()
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-[#43c7cd]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-[#43c7cd]" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Confirmá tu reserva
        </h2>
        <p className="text-muted-foreground">
          Revisá que todos los datos estén correctos
        </p>
      </div>

      <div className="bg-card rounded-2xl shadow-md p-6 space-y-6">
        {/* Client & Pet Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-[#43c7cd]" />
                Tus datos
              </h3>
              <button 
                onClick={() => onEdit(1)}
                className="text-xs text-[#43c7cd] hover:underline"
              >
                Editar
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-medium">{clientName}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <span>{clientPhone}</span>
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-[#f9c74f]" />
                Tu mascota
              </h3>
              <button 
                onClick={() => onEdit(6)}
                className="text-xs text-[#43c7cd] hover:underline"
              >
                Editar
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-medium">{petName}</span>
              </p>
              {petNotes && (
                <p className="text-muted-foreground text-xs line-clamp-2">
                  {petNotes}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[#43c7cd]" />
              Servicio reservado
            </h3>
            <button 
              onClick={() => onEdit(3)}
              className="text-xs text-[#43c7cd] hover:underline"
            >
              Editar
            </button>
          </div>
          
          <div className="bg-[#43c7cd]/5 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-[#43c7cd]">{service?.name}</p>
            <p className="text-sm text-muted-foreground">{category}</p>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#43c7cd]" />
                <span className="capitalize">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#43c7cd]" />
                <span>{time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#43c7cd]" />
                <span>{location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price Details */}
        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <span>Ver detalles del precio</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
          </button>
          
          {showDetails && (
            <div className="bg-muted rounded-lg p-4 mt-3 text-sm space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between">
                <span>{service?.name}</span>
                <span>${service?.price}</span>
              </div>
              {extras.map((extra) => (
                <div key={extra.id} className="flex justify-between">
                  <span>{extra.name}</span>
                  <span>{extra.price === 0 ? "Gratis" : `$${extra.price}`}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
            <span className="text-lg font-semibold">Total a pagar</span>
            <span className="text-2xl font-bold text-[#43c7cd]">${total}</span>
          </div>
        </div>

        {/* Terms */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox 
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              className="mt-0.5 border-[#43c7cd] data-[state=checked]:bg-[#43c7cd] data-[state=checked]:border-[#43c7cd]"
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed">
              Acepto los <span className="text-[#43c7cd] hover:underline cursor-pointer">Términos y condiciones</span>
            </Label>
          </div>
          
          <div className="flex items-start gap-3">
            <Checkbox 
              id="sucan-terms"
              checked={acceptSucanTerms}
              onCheckedChange={(checked) => setAcceptSucanTerms(checked as boolean)}
              className="mt-0.5 border-[#43c7cd] data-[state=checked]:bg-[#43c7cd] data-[state=checked]:border-[#43c7cd]"
            />
            <Label htmlFor="sucan-terms" className="text-sm leading-relaxed">
              Acepto los <span className="text-[#43c7cd] hover:underline cursor-pointer">Términos y condiciones de la peluquería</span>
            </Label>
          </div>
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={!acceptTerms || !acceptSucanTerms}
          className="w-full bg-[#43c7cd] hover:bg-[#f9c74f] hover:text-foreground text-white h-14 text-lg font-semibold rounded-xl disabled:opacity-50 transition-colors"
        >
          Confirmar reserva
        </Button>
      </div>
    </div>
  )
}
