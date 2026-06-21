import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface TransmissionSectionProps {
  specs: SpecsData
}

export function TransmissionSection({ specs }: TransmissionSectionProps) {
  const section = SPEC_SECTIONS[2] // Transmissão
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
