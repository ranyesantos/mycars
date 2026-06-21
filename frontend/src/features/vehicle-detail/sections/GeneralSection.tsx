import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface GeneralSectionProps {
  specs: SpecsData
}

export function GeneralSection({ specs }: GeneralSectionProps) {
  const section = SPEC_SECTIONS[9] // Geral
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
