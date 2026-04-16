"use client"

import { useState, useCallback } from "react"
import { ChevronLeft, Clock, MapPin } from "lucide-react"
import { StepIndicator } from "@/components/booking/step-indicator"
import { CategoryStep } from "@/components/booking/category-step"
import { ServiceStep } from "@/components/booking/service-step"
import { ExtrasStep } from "@/components/booking/extras-step"
import { ProfessionalStep } from "@/components/booking/professional-step"
import { DateTimeStep } from "@/components/booking/datetime-step"
import { ClientStep } from "@/components/booking/client-step"
import {
  Category,
  Service,
  ExtraService,
  Professional,
  LOCATIONS,
  CATEGORIES,
  SERVICES,
  EXTRA_SERVICES,
  PROFESSIONALS,
  STEPS
} from "@/lib/booking-types"

export default function BookingPage() {
  const [step, setStep] = useState(1)
  const [selectedLocation] = useState(LOCATIONS[0])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedExtras, setSelectedExtras] = useState<ExtraService[]>([])
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [bookingComplete, setBookingComplete] = useState(false)

  const currentTime = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit"
  })

  const completedSteps: Record<number, string> = {
    1: selectedLocation.name,
    ...(selectedCategory && { 2: selectedCategory.name }),
    ...(selectedService && { 3: selectedService.name.replace("Baño ", "") }),
    ...(selectedExtras.length > 0 && { 4: selectedExtras.map(e => e.name.split(" ")[0]).join(", ") }),
    ...(selectedProfessional && { 5: selectedProfessional.name }),
    ...(selectedDate && selectedTime && { 6: `${selectedDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })} ${selectedTime}` })
  }

  const goBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleCategorySelect = useCallback((category: Category) => {
    setSelectedCategory(category)
    setTimeout(() => setStep(3), 200)
  }, [])

  const handleServiceSelect = useCallback((service: Service) => {
    setSelectedService(service)
    setTimeout(() => setStep(4), 200)
  }, [])

  const handleExtraToggle = useCallback((extra: ExtraService) => {
    setSelectedExtras(prev => 
      prev.some(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    )
  }, [])

  const handleProfessionalSelect = useCallback((professional: Professional) => {
    setSelectedProfessional(professional)
    setTimeout(() => setStep(6), 200)
  }, [])

  const handleSubmit = useCallback((data: { name: string; email: string; phone: string; petName: string; notes: string }) => {
    console.log("Booking submitted:", {
      location: selectedLocation,
      category: selectedCategory,
      service: selectedService,
      extras: selectedExtras,
      professional: selectedProfessional,
      date: selectedDate,
      time: selectedTime,
      client: data
    })
    setBookingComplete(true)
  }, [selectedLocation, selectedCategory, selectedService, selectedExtras, selectedProfessional, selectedDate, selectedTime])

  const filteredServices = SERVICES.filter(s => s.categoryId === selectedCategory?.id)

  const calculateTotalDuration = () => {
    let totalMinutes = 0
    if (selectedService) {
      const match = selectedService.duration.match(/(\d+)\s*h?\s*(\d+)?\s*min?/)
      if (match) {
        totalMinutes += parseInt(match[1]) * 60 + (parseInt(match[2]) || 0)
      }
    }
    selectedExtras.forEach(extra => {
      if (extra.duration) {
        const match = extra.duration.match(/(\d+)\s*h?\s*(\d+)?\s*min?/)
        if (match) {
          totalMinutes += parseInt(match[1]) * (extra.duration.includes("h") ? 60 : 1) + (parseInt(match[2]) || 0)
        }
      }
    })
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return hours > 0 ? `${hours} h${mins > 0 ? ` ${mins} mins.` : ""}` : `${mins} mins.`
  }

  const calculateSubtotal = () => {
    return (selectedService?.price || 0) + selectedExtras.reduce((sum, e) => sum + e.price, 0)
  }

  if (bookingComplete) {
    return (
      <main className="min-h-screen bg-background">
        <StepIndicator steps={STEPS} currentStep={7} completedSteps={completedSteps} />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="bg-card rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">¡Reserva confirmada!</h1>
            <p className="text-muted-foreground mb-6">
              Tu cita ha sido reservada exitosamente. Te enviamos un email con los detalles.
            </p>
            <div className="bg-muted rounded-lg p-4 text-left space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>{selectedDate?.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} a las {selectedTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{selectedLocation.address}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <StepIndicator steps={STEPS} currentStep={step} completedSteps={completedSteps} />
      
      <div className="max-w-5xl mx-auto py-6">
        <div className="flex items-center justify-between px-4 mb-6">
          {step > 1 ? (
            <button 
              onClick={goBack}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Atrás</span>
            </button>
          ) : (
            <div />
          )}
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Nuestra hora:</span> {currentTime} America/Montevideo
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          {step === 1 && (
            <div className="w-full max-w-xl mx-auto px-4 text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Ubicación seleccionada</h2>
              <div className="bg-card rounded-2xl shadow-md p-6 mt-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <MapPin className="w-6 h-6 text-primary" />
                  <span className="text-xl font-semibold">{selectedLocation.name}</span>
                </div>
                <p className="text-muted-foreground">{selectedLocation.address}</p>
                <button 
                  onClick={() => setStep(2)}
                  className="mt-6 w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <CategoryStep 
              categories={CATEGORIES}
              selected={selectedCategory}
              onSelect={handleCategorySelect}
            />
          )}

          {step === 3 && (
            <ServiceStep 
              services={filteredServices}
              selected={selectedService}
              onSelect={handleServiceSelect}
            />
          )}

          {step === 4 && (
            <ExtrasStep 
              extras={EXTRA_SERVICES}
              selected={selectedExtras}
              onToggle={handleExtraToggle}
              onContinue={() => setStep(5)}
              totalDuration={calculateTotalDuration()}
              subtotal={calculateSubtotal()}
            />
          )}

          {step === 5 && (
            <ProfessionalStep 
              professionals={PROFESSIONALS}
              selected={selectedProfessional}
              onSelect={handleProfessionalSelect}
            />
          )}

          {step === 6 && (
            <DateTimeStep 
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectDate={setSelectedDate}
              onSelectTime={setSelectedTime}
              onContinue={() => setStep(7)}
            />
          )}

          {step === 7 && (
            <ClientStep 
              service={selectedService}
              extras={selectedExtras}
              professional={selectedProfessional}
              date={selectedDate}
              time={selectedTime}
              location={selectedLocation.address}
              category={selectedCategory?.name || ""}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>

      <footer className="mt-auto py-6 text-center text-sm text-muted-foreground border-t border-border">
        <p>Términos y condiciones de la Peluquería</p>
        <p className="mt-1">© 2013-2026</p>
      </footer>
    </main>
  )
}
