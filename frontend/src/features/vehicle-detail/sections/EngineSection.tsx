import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface EngineSectionProps {
  specs: SpecsData
}

export function EngineSection({ specs }: EngineSectionProps) {
  const section = SPEC_SECTIONS[1] // Motor
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
