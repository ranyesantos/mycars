import {
  Zap, Cpu, Cog, Ruler, Fuel, Disc, Car,
  Wind, Navigation, Info,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SpecsData } from '../../services/vehicleDetailApi'

export interface SpecFieldDef {
  column: keyof SpecsData
  label: string
}

export interface SpecSectionDefinition {
  heading: string
  icon: LucideIcon
  fields: SpecFieldDef[]
}

/** Builds an array of { label, value } from non-null spec fields for a section. */
export function pickSectionItems(
  specs: SpecsData,
  section: SpecSectionDefinition,
): { label: string; value: string }[] {
  return section.fields
    .filter((f) => specs[f.column] !== null)
    .map((f) => ({
      label: f.label,
      value: specs[f.column] as string,
    }))
}

export const SPEC_SECTIONS: SpecSectionDefinition[] = [
  {
    heading: 'Desempenho',
    icon: Zap,
    fields: [
      { column: 'acceleration_0_100', label: 'Aceleração 0-100 km/h' },
      { column: 'top_speed_g', label: 'Velocidade máxima (G)' },
      { column: 'top_speed_e', label: 'Velocidade máxima (E)' },
      { column: 'weight_power_ratio', label: 'Peso/potência' },
      { column: 'weight_torque_ratio', label: 'Peso/torque' },
      { column: 'specific_power', label: 'Potência específica' },
      { column: 'specific_torque', label: 'Torque específico' },
    ],
  },
  {
    heading: 'Motor',
    icon: Cpu,
    fields: [
      { column: 'engine_code', label: 'Código do motor' },
      { column: 'unit_displacement', label: 'Cilindrada unitária' },
      { column: 'displacement', label: 'Deslocamento' },
      { column: 'bore', label: 'Diâmetro do cilindro' },
      { column: 'stroke', label: 'Curso do pistão' },
      { column: 'cylinders', label: 'Cilindros' },
      { column: 'cylinders_arrangement', label: 'Disposição dos cilindros' },
      { column: 'valves_per_cylinder', label: 'Válvulas por cilindro' },
      { column: 'valve_control', label: 'Comando de válvulas' },
      { column: 'valve_variation', label: 'Variação do comando' },
      { column: 'tappets', label: 'Tuchos' },
      { column: 'aspiration', label: 'Aspiração' },
      { column: 'feeding', label: 'Alimentação' },
      { column: 'installation', label: 'Instalação' },
      { column: 'arrangement', label: 'Disposição' },
      { column: 'compression_ratio', label: 'Razão de compressão' },
      { column: 'drive_actuation', label: 'Acionam. do comando' },
      { column: 'power_hp_g', label: 'Potência máxima (G)' },
      { column: 'power_hp_e', label: 'Potência máxima (E)' },
      { column: 'max_power_rpm', label: 'Regime potência máx.' },
      { column: 'torque_g', label: 'Torque máximo (G)' },
      { column: 'torque_e', label: 'Torque máximo (E)' },
      { column: 'max_torque_rpm', label: 'Regime torque máx.' },
    ],
  },
  {
    heading: 'Transmissão',
    icon: Cog,
    fields: [
      { column: 'coupling', label: 'Acoplamento' },
      { column: 'gearbox', label: 'Câmbio' },
      { column: 'gearbox_code', label: 'Código do câmbio' },
      { column: 'gears', label: 'Marchas' },
      { column: 'traction', label: 'Tração' },
    ],
  },
  {
    heading: 'Dimensões',
    icon: Ruler,
    fields: [
      { column: 'height', label: 'Altura' },
      { column: 'width', label: 'Largura' },
      { column: 'length', label: 'Comprimento' },
      { column: 'wheelbase', label: 'Distância entre-eixos' },
      { column: 'front_track', label: 'Bitola dianteira' },
      { column: 'rear_track', label: 'Bitola traseira' },
      { column: 'weight', label: 'Peso' },
      { column: 'payload', label: 'Carga útil' },
      { column: 'trunk_capacity', label: 'Porta-malas' },
      { column: 'fuel_tank', label: 'Tanque de combustível' },
    ],
  },
  {
    heading: 'Consumo',
    icon: Fuel,
    fields: [
      { column: 'city_consumption_g', label: 'Consumo urbano (G)' },
      { column: 'highway_consumption_g', label: 'Consumo rodoviário (G)' },
      { column: 'city_range_g', label: 'Autonomia urbana (G)' },
      { column: 'highway_range_g', label: 'Autonomia rodoviária (G)' },
      { column: 'city_consumption_e', label: 'Consumo urbano (E)' },
      { column: 'highway_consumption_e', label: 'Consumo rodoviário (E)' },
      { column: 'city_range_e', label: 'Autonomia urbana (E)' },
      { column: 'highway_range_e', label: 'Autonomia rodoviária (E)' },
    ],
  },
  {
    heading: 'Freios',
    icon: Disc,
    fields: [
      { column: 'front_brakes', label: 'Dianteiros' },
      { column: 'rear_brakes', label: 'Traseiros' },
      { column: 'sidewall_height', label: 'Altura do flanco' },
    ],
  },
  {
    heading: 'Suspensão',
    icon: Car,
    fields: [
      { column: 'front_suspension', label: 'Dianteira' },
      { column: 'rear_suspension', label: 'Traseira' },
      { column: 'elastic_element', label: 'Elemento elástico' },
    ],
  },
  {
    heading: 'Aerodinâmica',
    icon: Wind,
    fields: [
      { column: 'frontal_area', label: 'Área frontal (A)' },
      { column: 'corrected_frontal_area', label: 'Área frontal corrigida' },
      { column: 'drag_coefficient', label: 'Coef. de arrasto (Cx)' },
    ],
  },
  {
    heading: 'Direção',
    icon: Navigation,
    fields: [
      { column: 'steering_assist', label: 'Assistência' },
      { column: 'turning_diameter', label: 'Diâmetro de giro' },
    ],
  },
  {
    heading: 'Geral',
    icon: Info,
    fields: [
      { column: 'year', label: 'Ano' },
      { column: 'fuel', label: 'Combustível' },
      { column: 'configuration', label: 'Configuração' },
      { column: 'warranty', label: 'Garantia' },
      { column: 'generation', label: 'Geração' },
      { column: 'seats', label: 'Lugares' },
      { column: 'platform', label: 'Plataforma' },
      { column: 'doors', label: 'Portas' },
      { column: 'size', label: 'Porte' },
      { column: 'origin', label: 'Procedência' },
      { column: 'propulsion', label: 'Propulsão' },
      { column: 'series', label: 'Série' },
    ],
  },
]
