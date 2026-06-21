import type { SpecsData } from '../../../services/vehicleDetailApi'
import type { SpecSectionId } from '../spec-sections'
import { getSectionById, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface DomainSectionProps {
  id: SpecSectionId
  specs: SpecsData
}

export function DomainSection({ id, specs }: DomainSectionProps) {
  const section = getSectionById(id)
  const items = pickSectionItems(specs, section)

  if (items.length === 0) return null

  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
