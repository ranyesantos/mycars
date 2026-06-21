import axios from 'axios'
import * as cheerio from 'cheerio'
import type { ScrapedVehicleDetails, FullSpecFields } from './scraper.types'

/**
 * Maps known Portuguese labels on the page to FullSpecFields property names.
 * Labels not in this map still end up in rawData.
 */
const LABEL_TO_FIELD: Record<string, keyof FullSpecFields> = {
  // General
  'Ano': 'year',
  'Combustível': 'fuel',
  'Configuração': 'configuration',
  'Garantia': 'warranty',
  'Geração': 'generation',
  'Lugares': 'seats',
  'Plataforma': 'platform',
  'Portas': 'doors',
  'Porte': 'size',
  'Procedência': 'origin',
  'Propulsão': 'propulsion',
  'Série': 'series',

  // Performance
  'Aceleração 0-100 km/h': 'acceleration_0_100',
  'Velocidade máxima': 'top_speed_g',
  'Peso/potência': 'weight_power_ratio',
  'Peso/torque': 'weight_torque_ratio',
  'Potência específica': 'specific_power',
  'Torque específico': 'specific_torque',

  // Engine
  'Código do motor': 'engine_code',
  'Cilindrada unitária': 'unit_displacement',
  'Deslocamento': 'displacement',
  'Diâmetro do cilindro': 'bore',
  'Curso do pistão': 'stroke',
  'Cilindros': 'cylinders',
  'Válvulas por cilindro': 'valves_per_cylinder',
  'Comando de válvulas': 'valve_control',
  'Variação do comando': 'valve_variation',
  'Tuchos': 'tappets',
  'Aspiração': 'aspiration',
  'Alimentação': 'feeding',
  'Instalação': 'installation',
  'Disposição': 'arrangement',
  'Razão de compressão': 'compression_ratio',
  'Acionam. do comando': 'drive_actuation',
  'Potência máxima': 'power_hp_g',
  'Regime potência máx.': 'max_power_rpm',
  'Torque máximo': 'torque_g',
  'Regime torque máx.': 'max_torque_rpm',

  // Transmission
  'Acoplamento': 'coupling',
  'Câmbio': 'gearbox',
  'Código do câmbio': 'gearbox_code',
  'Marchas': 'gears',
  'Tração': 'traction',

  // Dimensions
  'Altura': 'height',
  'Largura': 'width',
  'Comprimento': 'length',
  'Distância entre-eixos': 'wheelbase',
  'Bitola dianteira': 'front_track',
  'Bitola traseira': 'rear_track',
  'Peso': 'weight',
  'Carga útil': 'payload',
  'Porta-malas': 'trunk_capacity',
  'Tanque de combustível': 'fuel_tank',

  // Brakes
  'Dianteiros': 'front_brakes',
  'Traseiros': 'rear_brakes',
  'Altura do flanco': 'sidewall_height',

  // Aerodynamics
  'Área frontal (A)': 'frontal_area',
  'Área frontal corrigida': 'corrected_frontal_area',
  'Coef. de arrasto (Cx)': 'drag_coefficient',

  // Steering
  'Assistência': 'steering_assist',
  'Diâmetro de giro': 'turning_diameter',

  // Suspension
  'Dianteira': 'front_suspension',
  'Traseira': 'rear_suspension',
  'Elemento elástico': 'elastic_element',

  // Consumption & Autonomy
  'Urbano (G)': 'city_consumption_g',
  'Rodoviário (G)': 'highway_consumption_g',
  'Urbana (G)': 'city_range_g',
  'Rodoviária (G)': 'highway_range_g',

  // Legacy mappings — keep for backward compatibility
  'Cilindrada': 'displacement',
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'

/**
 * Fetches a URL and extracts all vehicle technical specifications.
 * Throws on network error, timeout, empty page, or if no recognized fields
 * are found on the page.
 */
export async function scrape(url: string): Promise<ScrapedVehicleDetails> {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
    timeout: 10_000,
  })

  return scrapeFromHtml(response.data)
}

/**
 * Extracts vehicle details from raw HTML.
 * Exported separately so unit tests can call it without network requests.
 */
export function scrapeFromHtml(html: string): ScrapedVehicleDetails {
  const $ = cheerio.load(html)
  const rawMap: Record<string, string> = {}

  // Walk all .ent-spec-item elements across the entire page
  $('.ent-spec-item').each((_i, el) => {
    const label = $(el).find('.ent-spec-label').text().trim()
    const value = $(el).find('.ent-spec-value').text().trim()

    if (label && value) {
      rawMap[label] = value
    }
  })

  const typed: FullSpecFields = {
    // General
    year: null,
    fuel: null,
    configuration: null,
    warranty: null,
    generation: null,
    seats: null,
    platform: null,
    doors: null,
    size: null,
    origin: null,
    propulsion: null,
    series: null,

    // Performance
    acceleration_0_100: null,
    top_speed_g: null,
    top_speed_e: null,
    weight_power_ratio: null,
    weight_torque_ratio: null,
    specific_power: null,
    specific_torque: null,

    // Engine
    engine_code: null,
    unit_displacement: null,
    displacement: null,
    bore: null,
    stroke: null,
    cylinders: null,
    cylinders_arrangement: null,
    valves_per_cylinder: null,
    valve_control: null,
    valve_variation: null,
    tappets: null,
    aspiration: null,
    feeding: null,
    installation: null,
    arrangement: null,
    compression_ratio: null,
    drive_actuation: null,
    power_hp_g: null,
    power_hp_e: null,
    max_power_rpm: null,
    torque_g: null,
    torque_e: null,
    max_torque_rpm: null,

    // Transmission
    coupling: null,
    gearbox: null,
    gearbox_code: null,
    gears: null,
    traction: null,

    // Dimensions
    height: null,
    width: null,
    length: null,
    wheelbase: null,
    front_track: null,
    rear_track: null,
    weight: null,
    payload: null,
    trunk_capacity: null,
    fuel_tank: null,

    // Brakes
    front_brakes: null,
    rear_brakes: null,
    sidewall_height: null,

    // Aerodynamics
    frontal_area: null,
    corrected_frontal_area: null,
    drag_coefficient: null,

    // Steering
    steering_assist: null,
    turning_diameter: null,

    // Suspension
    front_suspension: null,
    rear_suspension: null,
    elastic_element: null,

    // Consumption & Autonomy
    city_consumption_g: null,
    highway_consumption_g: null,
    city_range_g: null,
    highway_range_g: null,
    city_consumption_e: null,
    highway_consumption_e: null,
    city_range_e: null,
    highway_range_e: null,
  }

  for (const [label, value] of Object.entries(rawMap)) {
    const field = LABEL_TO_FIELD[label]
    if (field) {
      typed[field] = value
    }
  }

  const hasAnyField = Object.values(typed).some((v) => v !== null)
  if (!hasAnyField) {
    throw new Error('No recognized fields found on the page')
  }

  return {
    ...typed,
    rawData: JSON.stringify(rawMap),
  }
}
