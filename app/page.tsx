"use client"

import { useState, useCallback, useEffect } from "react"
import { ChevronLeft, Clock, MapPin } from "lucide-react"
import { HomeScreen } from "@/components/booking/home-screen"
import { StepIndicator } from "@/components/booking/step-indicator"
import { ContactStep } from "@/components/booking/contact-step"
import { CategoryStep } from "@/components/booking/category-step"
import { ServiceStep } from "@/components/booking/service-step"
import { ExtrasStep } from "@/components/booking/extras-step"
import { DateTimeStep } from "@/components/booking/datetime-step"
import { PetDetailsStep } from "@/components/booking/pet-details-step"
import { SummaryStep } from "@/components/booking/summary-step"
import {
  Category,
  Service,
  ExtraService,
  LOCATIONS,
  CATEGORIES,
  SERVICES,
  EXTRA_SERVICES,
  STEPS
} from "@/lib/booking-types"

export default function BookingPage() {
  const [showHome, setShowHome] = useState(true)
  const [step, setStep] = useState(1)
  const [selectedLocation] = useState(LOCATIONS[0])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedExtras, setSelectedExtras] = useState<ExtraService[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>("")
  
  // Client data
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [petName, setPetName] = useState("")
  const [petNotes, setPetNotes] = useState("")

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit"
    }))
  }, [])

  const completedSteps: Record<number, string> = {
    ...(clientName && { 1: clientName }),
    ...(selectedCategory && { 2: selectedCategory.name }),
    ...(selectedService && { 3: selectedService.name.replace("Baño ", "") }),
    ...(selectedExtras.length > 0 && { 4: selectedExtras.map(e => e.name.split(" ")[0]).join(", ") }),
    ...(selectedDate && selectedTime && { 5: `${selectedDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })} ${selectedTime}` }),
    ...(petName && { 6: petName })
  }

  const goBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleContactSubmit = useCallback((name: string, phone: string) => {
    setClientName(name)
    setClientPhone(phone)
    setTimeout(() => setStep(2), 200)
  }, [])

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

  const handlePetDetailsSubmit = useCallback((name: string, notes: string) => {
    setPetName(name)
    setPetNotes(notes)
    setTimeout(() => setStep(7), 200)
  }, [])

  const handleSubmit = useCallback(() => {
    console.log("Booking submitted:", {
      location: selectedLocation,
      category: selectedCategory,
      service: selectedService,
      extras: selectedExtras,
      date: selectedDate,
      time: selectedTime,
      client: { name: clientName, phone: clientPhone },
      pet: { name: petName, notes: petNotes }
    })
    setBookingComplete(true)
  }, [selectedLocation, selectedCategory, selectedService, selectedExtras, selectedDate, selectedTime, clientName, clientPhone, petName, petNotes])

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

  // Show Home screen
  if (showHome) {
    return <HomeScreen onStart={() => setShowHome(false)} />
  }

  if (bookingComplete) {
    return (
      <main className="min-h-screen bg-background">
        <StepIndicator steps={STEPS} currentStep={8} completedSteps={completedSteps} />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="bg-card rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">¡Reserva confirmada!</h1>
            <p className="text-muted-foreground mb-6">
              Tu cita ha sido reservada exitosamente. Te contactaremos al {clientPhone} para confirmar.
            </p>
            <div className="bg-muted rounded-lg p-4 text-left space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#43c7cd]" />
                <span>{selectedDate?.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} a las {selectedTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#43c7cd]" />
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
            <button 
              onClick={() => setShowHome(true)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Inicio</span>
            </button>
          )}
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Nuestra hora:</span> {currentTime} America/Montevideo
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          {step === 1 && (
            <ContactStep 
              initialName={clientName}
              initialPhone={clientPhone}
              onContinue={handleContactSubmit}
            />
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
            <DateTimeStep 
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectDate={setSelectedDate}
              onSelectTime={setSelectedTime}
              onContinue={() => setStep(6)}
            />
          )}

          {step === 6 && (
            <PetDetailsStep 
              initialPetName={petName}
              initialNotes={petNotes}
              onContinue={handlePetDetailsSubmit}
            />
          )}

          {step === 7 && (
            <SummaryStep 
              clientName={clientName}
              clientPhone={clientPhone}
              petName={petName}
              petNotes={petNotes}
              service={selectedService}
              extras={selectedExtras}
              date={selectedDate}
              time={selectedTime}
              location={selectedLocation.address}
              category={selectedCategory?.name || ""}
              onSubmit={handleSubmit}
              onEdit={setStep}
            />
          )}
        </div>
      </div>

      <footer className="mt-auto py-8 text-center text-sm text-muted-foreground">
        <div className="w-full h-6 overflow-hidden mb-4">
          <svg 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none" 
            className="w-full h-full"
          >
            <path 
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
              fill="#43c7cd"
              opacity="0.2"
            />
          </svg>
        </div>
        <p className="text-[#43c7cd] font-medium">Términos y condiciones de Tu Ración</p>
        <p className="mt-1">© 2013-2026</p>
      </footer>
    </main>
  )
}
