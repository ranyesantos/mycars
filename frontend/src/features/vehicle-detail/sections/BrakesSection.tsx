import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface BrakesSectionProps {
  specs: SpecsData
}

export function BrakesSection({ specs }: BrakesSectionProps) {
  const section = SPEC_SECTIONS[5] // Freios
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
