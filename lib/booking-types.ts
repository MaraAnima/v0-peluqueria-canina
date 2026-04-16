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
    id: "bano-s",
    name: "Baño (S - Pelo corto)",
    description: "Tamaño de la mascota: hasta 10 kg",
    duration: "1 h",
    price: 850,
    image: "/images/dog-s.png",
    categoryId: "pelo-corto"
  },
  {
    id: "bano-m",
    name: "Baño (M - Pelo corto)",
    description: "Tamaño de la mascota: desde 10 kg a 20 kg",
    duration: "1 h",
    price: 950,
    image: "/images/dog-m.png",
    categoryId: "pelo-corto"
  },
  {
    id: "bano-l",
    name: "Baño (L - Pelo corto)",
    description: "Tamaño de la mascota: desde 20 kg a 40 kg",
    duration: "1 h 30 mins.",
    price: 1000,
    image: "/images/dog-l.png",
    categoryId: "pelo-corto"
  },
  {
    id: "bano-xl",
    name: "Baño (XL - Pelo corto)",
    description: "Tamaño de la mascota: 40 kg o más",
    duration: "2 h",
    price: 1250,
    image: "/images/dog-xl.png",
    categoryId: "pelo-corto"
  },
  // Pelo largo
  {
    id: "bano-s-largo",
    name: "Baño (S - Pelo largo)",
    description: "Tamaño de la mascota: hasta 10 kg",
    duration: "1 h 30 mins.",
    price: 1000,
    image: "/images/dog-s.png",
    categoryId: "pelo-largo"
  },
  {
    id: "bano-m-largo",
    name: "Baño (M - Pelo largo)",
    description: "Tamaño de la mascota: desde 10 kg a 20 kg",
    duration: "1 h 30 mins.",
    price: 1100,
    image: "/images/dog-m.png",
    categoryId: "pelo-largo"
  },
  {
    id: "bano-l-largo",
    name: "Baño (L - Pelo largo)",
    description: "Tamaño de la mascota: desde 20 kg a 40 kg",
    duration: "2 h",
    price: 1200,
    image: "/images/dog-l.png",
    categoryId: "pelo-largo"
  },
  {
    id: "bano-xl-largo",
    name: "Baño (XL - Pelo largo)",
    description: "Tamaño de la mascota: 40 kg o más",
    duration: "2 h 30 mins.",
    price: 1450,
    image: "/images/dog-xl.png",
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
  { id: 1, name: "Categoría" },
  { id: 2, name: "Servicio" },
  { id: 3, name: "Servicios extra" },
  { id: 4, name: "Hora" },
  { id: 5, name: "Cliente" }
]
