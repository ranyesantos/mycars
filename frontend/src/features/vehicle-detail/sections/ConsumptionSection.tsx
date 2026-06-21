import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface ConsumptionSectionProps {
  specs: SpecsData
}

export function ConsumptionSection({ specs }: ConsumptionSectionProps) {
  const section = SPEC_SECTIONS[4] // Consumo
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
