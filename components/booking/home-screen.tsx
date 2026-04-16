"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"

interface HomeScreenProps {
  onStart: () => void
}

export function HomeScreen({ onStart }: HomeScreenProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <div className="flex-1 flex items-center">
        <div className="w-full max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                <span className="text-[#1e3a5f]">BAÑO</span>
                <span className="text-[#43c7cd]">&</span>
                <span className="text-[#1e3a5f]">TOSA</span>
              </h1>
              
              <div className="space-y-3">
                <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a5f]">
                  El cuidado que tu mascota merece
                </h2>
                <p className="text-lg text-muted-foreground">
                  Servicios completos y seguros para la higiene de tu mejor amigo.
                </p>
              </div>
              
              <button
                onClick={onStart}
                className="inline-flex items-center gap-3 bg-[#1e3a5f] text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-[#2a4a6f] transition-colors group"
              >
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 40 40" className="w-8 h-8">
                    {/* Dog face icon */}
                    <circle cx="20" cy="20" r="16" fill="white" />
                    <circle cx="14" cy="17" r="2" fill="#1e3a5f" />
                    <circle cx="26" cy="17" r="2" fill="#1e3a5f" />
                    <ellipse cx="20" cy="24" rx="4" ry="3" fill="#1e3a5f" />
                    {/* Bubbles on head */}
                    <circle cx="12" cy="6" r="4" fill="#43c7cd" opacity="0.6" />
                    <circle cx="20" cy="4" r="3" fill="#43c7cd" opacity="0.8" />
                    <circle cx="28" cy="7" r="3.5" fill="#43c7cd" opacity="0.5" />
                  </svg>
                </div>
                <span>Agendar ahora</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            {/* Right Content - Image */}
            <div className="relative">
              {/* Decorative bubbles */}
              <div className="absolute -bottom-8 -right-4 w-32 h-32 bg-[#43c7cd]/20 rounded-full blur-sm" />
              <div className="absolute -bottom-4 right-12 w-16 h-16 bg-[#43c7cd]/30 rounded-full blur-sm" />
              <div className="absolute top-8 -right-8 w-20 h-20 bg-[#43c7cd]/15 rounded-full blur-sm" />
              
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-tTSmQIQNdkSM6MmtwPwv6ep2Uus17Y.png"
                  alt="Perro feliz siendo bañado"
                  width={500}
                  height={400}
                  className="w-full h-auto object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer wave */}
      <div className="w-full">
        <svg 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none" 
          className="w-full h-16"
        >
          <path 
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
            fill="#43c7cd"
            opacity="0.3"
          />
        </svg>
      </div>
    </div>
  )
}
