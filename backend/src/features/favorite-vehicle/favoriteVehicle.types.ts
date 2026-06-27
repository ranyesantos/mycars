import type { Vehicle } from '../../generated/prisma/client'

export type FavoriteWithYears = Vehicle & {
  years: {
    yearCode: string
    yearLabel: string
    price: string | null
    fuel: string | null
    referenceMonth: string | null
    fuelAcronym: string | null
  }[]
}

export interface FavoriteResponse {
  fipeCode: string
  vehicleType: string
  brand: string | null
  model: string | null
  favorited: boolean
  years: {
    yearCode: string
    yearLabel: string
    price: string | null
    fuel: string | null
    referenceMonth: string | null
    fuelAcronym: string | null
  }[]
}
