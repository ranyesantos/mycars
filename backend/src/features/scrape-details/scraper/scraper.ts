import axios from 'axios'
import * as cheerio from 'cheerio'
import type { ScrapedVehicleDetails, TypedFields } from './scraper.types'

/**
 * Maps known Portuguese labels on the page to TypedFields property names.
 * Labels not in this map still end up in rawData.
 */
const LABEL_TO_FIELD: Record<string, keyof TypedFields> = {
  'Cilindrada': 'engine',
  'Potência máxima': 'powerHp',
  'Torque máximo': 'torque',
  'Câmbio': 'transmission',
  'Combustível': 'fuelType',
  'Urbano (G)': 'consumptionCity',
  'Rodoviário (G)': 'consumptionHighway',
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

  const typed: TypedFields = {
    engine: null,
    powerHp: null,
    torque: null,
    transmission: null,
    fuelType: null,
    consumptionCity: null,
    consumptionHighway: null,
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
