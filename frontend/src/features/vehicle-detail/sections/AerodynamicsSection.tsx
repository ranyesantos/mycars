import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface AerodynamicsSectionProps {
  specs: SpecsData
}

export function AerodynamicsSection({ specs }: AerodynamicsSectionProps) {
  const section = SPEC_SECTIONS[7] // Aerodinâmica
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
