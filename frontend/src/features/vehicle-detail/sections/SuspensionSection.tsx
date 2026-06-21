import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface SuspensionSectionProps {
  specs: SpecsData
}

export function SuspensionSection({ specs }: SuspensionSectionProps) {
  const section = SPEC_SECTIONS[6] // Suspensão
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
