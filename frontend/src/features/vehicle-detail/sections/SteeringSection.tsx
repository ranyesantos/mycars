import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface SteeringSectionProps {
  specs: SpecsData
}

export function SteeringSection({ specs }: SteeringSectionProps) {
  const section = SPEC_SECTIONS[8] // Direção
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
