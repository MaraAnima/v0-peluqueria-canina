"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DateTimeStepProps {
  selectedDate: Date | null
  selectedTime: string | null
  onSelectDate: (date: Date) => void
  onSelectTime: (time: string) => void
  onContinue: () => void
}

const DAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]
const AVAILABLE_TIMES = ["10:00", "13:30", "15:00", "16:30"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function DateTimeStep({ selectedDate, selectedTime, onSelectDate, onSelectTime, onContinue }: DateTimeStepProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date()
  
  const monthName = currentMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  
  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }
  
  // Fechas bloqueadas (mes es 0-indexed: enero=0, julio=6, agosto=7, diciembre=11)
  const blockedDates = [
    { month: 0, day: 1 },   // 1 de enero
    { month: 6, day: 18 },  // 18 de julio
    { month: 7, day: 25 },  // 25 de agosto
    { month: 11, day: 25 }  // 25 de diciembre
  ]

  const isDateSelectable = (day: number) => {
    const date = new Date(year, month, day)
    const dayOfWeek = date.getDay()
    const isBlockedDate = blockedDates.some(bd => bd.month === month && bd.day === day)
    return date >= today && dayOfWeek !== 0 && !isBlockedDate
  }
  
  const isSelectedDate = (day: number) => {
    if (!selectedDate) return false
    return selectedDate.getDate() === day && 
           selectedDate.getMonth() === month && 
           selectedDate.getFullYear() === year
  }

  const days = []
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="w-10 h-10" />)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const selectable = isDateSelectable(day)
    const selected = isSelectedDate(day)
    days.push(
      <button
        key={day}
        onClick={() => selectable && onSelectDate(new Date(year, month, day))}
        disabled={!selectable}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
          selectable ? "hover:bg-[#43c7cd]/20 cursor-pointer" : "text-muted-foreground/40 cursor-not-allowed",
          selected && "bg-[#43c7cd] text-white hover:bg-[#43c7cd]"
        )}
      >
        {day}
      </button>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="bg-card rounded-2xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={prevMonth}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Mes Ant.</span>
          </button>
          <h2 className="text-lg font-semibold text-[#43c7cd] capitalize">
            {monthName}
          </h2>
          <button 
            onClick={nextMonth}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-sm">Mes Sig.</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-4">
          {DAYS.map((day, index) => (
            <div 
              key={day} 
              className={cn(
                "w-10 h-8 flex items-center justify-center text-xs font-semibold",
                index < 5 ? "text-[#43c7cd]" : "text-muted-foreground"
              )}
            >
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>

      {selectedDate && (
        <div className="mt-6 bg-card rounded-2xl shadow-md p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Horas de inicio disponibles
          </h3>
          <div className="flex flex-wrap gap-3">
            {AVAILABLE_TIMES.map((time) => (
              <button
                key={time}
                onClick={() => onSelectTime(time)}
                className={cn(
                  "px-6 py-3 rounded-xl border-2 font-medium transition-all duration-200",
                  "hover:border-[#43c7cd] hover:bg-[#43c7cd]/5",
                  selectedTime === time 
                    ? "border-[#43c7cd] bg-[#43c7cd] text-white" 
                    : "border-border bg-card text-foreground"
                )}
              >
                {time}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Disponible</span>
          </div>
        </div>
      )}

      {selectedDate && selectedTime && (
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={onContinue}
            className="bg-[#43c7cd] hover:bg-[#f9c74f] hover:text-foreground text-white px-8 rounded-xl font-semibold transition-colors"
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}
