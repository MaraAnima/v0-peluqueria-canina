export interface Location {
  id: string
  name: string
  address: string
}

export interface Category {
  id: string
  name: string
  description: string
  image: string
}

export interface Service {
  id: string
  name: string
  description: string
  duration: string
  price: number
  image: string
  categoryId: string
}

export interface ExtraService {
  id: string
  name: string
  description: string
  duration?: string
  price: number
  icon: string
}

export interface Professional {
  id: string
  name: string
  image: string
  specialty: string
}

export interface TimeSlot {
  time: string
  available: boolean
}

export interface BookingState {
  step: number
  location: Location | null
  category: Category | null
  service: Service | null
  extras: ExtraService[]
  professional: Professional | null
  date: Date | null
  time: string | null
  clientInfo: {
    name: string
    email: string
    phone: string
    petName: string
    notes: string
  }
}

export const LOCATIONS: Location[] = [
  { id: "malvin", name: "Malvín", address: "Av. Italia 5006, Montevideo" }
]

export const CATEGORIES: Category[] = [
  {
    id: "pelo-corto",
    name: "Pelo corto",
    description: "Servicios para mascotas de pelo corto",
    image: "/images/pelo-corto.png"
  },
  {
    id: "pelo-largo",
    name: "Pelo largo",
    description: "Servicios para mascotas de pelo largo",
    image: "/images/pelo-largo.png"
  }
]

export const SERVICES: Service[] = [
  // Pelo corto
  {
    id: "bano-rp",
    name: "Baño (RP - Pelo corto)",
    description: "Tamaño de la mascota: hasta 10 kg",
    duration: "1 h",
    price: 820,
    image: "/images/dog-s.png",
    categoryId: "pelo-corto"
  },
  {
    id: "bano-rm",
    name: "Baño (RM - Pelo corto)",
    description: "Tamaño de la mascota: desde 10 kg a 20 kg",
    duration: "1 h",
    price: 1010,
    image: "/images/dog-m.png",
    categoryId: "pelo-corto"
  },
  {
    id: "bano-rg",
    name: "Baño (RG - Pelo corto)",
    description: "Tamaño de la mascota: 20 kg o más",
    duration: "1 h 15 min",
    price: 1380,
    image: "/images/dog-l.png",
    categoryId: "pelo-corto"
  },
  // Pelo largo
  {
    id: "bano-rp-largo",
    name: "Baño (RP - Pelo largo)",
    description: "Tamaño de la mascota: hasta 10 kg",
    duration: "1 h",
    price: 895,
    image: "/images/dog-s.png",
    categoryId: "pelo-largo"
  },
  {
    id: "bano-rm-largo",
    name: "Baño (RM - Pelo largo)",
    description: "Tamaño de la mascota: desde 10 kg a 20 kg",
    duration: "1 h",
    price: 1060,
    image: "/images/dog-m.png",
    categoryId: "pelo-largo"
  },
  {
    id: "bano-rg-largo",
    name: "Baño (RG - Pelo largo)",
    description: "Tamaño de la mascota: 20 kg o más",
    duration: "1 h 15 min",
    price: 1420,
    image: "/images/dog-l.png",
    categoryId: "pelo-largo"
  }
]

export const EXTRA_SERVICES: ExtraService[] = [
  {
    id: "deslanado",
    name: "Deslanado/Desanudado",
    description: "Eliminación de nudos y pelo muerto",
    duration: "1 h",
    price: 600,
    icon: "brush"
  },
  {
    id: "corte-pelo",
    name: "Corte de pelo (S)",
    description: "Incluye corte de raza",
    duration: "30 mins.",
    price: 150,
    icon: "scissors"
  },
  {
    id: "corte-higienico",
    name: "Corte higiénico - Gratis!",
    description: "Ojos, genitales, cola, etc.",
    price: 0,
    icon: "sparkles"
  },
  {
    id: "corte-unas",
    name: "Corte de uñas - Gratis!",
    description: "Recorte de uñas",
    price: 0,
    icon: "cut"
  },
  {
    id: "limpieza-oidos",
    name: "Limpieza de oídos - Gratis!",
    description: "Limpieza profunda de oídos",
    price: 0,
    icon: "ear"
  }
]

export const PROFESSIONALS: Professional[] = [
  {
    id: "margarita",
    name: "Margarita",
    image: "/images/professional-1.png",
    specialty: "Especialista en razas pequeñas"
  },
  {
    id: "carlos",
    name: "Carlos",
    image: "/images/professional-2.png",
    specialty: "Especialista en razas grandes"
  }
]

export const STEPS = [
  { id: 1, name: "Contacto" },
  { id: 2, name: "Categoría" },
  { id: 3, name: "Servicio" },
  { id: 4, name: "Extras" },
  { id: 5, name: "Hora" },
  { id: 6, name: "Mascota" },
  { id: 7, name: "Confirmar" }
]
