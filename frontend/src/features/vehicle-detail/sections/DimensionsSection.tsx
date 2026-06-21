import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface DimensionsSectionProps {
  specs: SpecsData
}

export function DimensionsSection({ specs }: DimensionsSectionProps) {
  const section = SPEC_SECTIONS[3] // Dimensões
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
