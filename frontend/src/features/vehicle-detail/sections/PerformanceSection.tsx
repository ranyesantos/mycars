import type { SpecsData } from '../../../services/vehicleDetailApi'
import { SPEC_SECTIONS, pickSectionItems } from '../spec-sections'
import { SpecSection } from './SpecSection'

interface PerformanceSectionProps {
  specs: SpecsData
}

export function PerformanceSection({ specs }: PerformanceSectionProps) {
  const section = SPEC_SECTIONS[0] // Desempenho
  const items = pickSectionItems(specs, section)
  if (items.length === 0) return null
  return <SpecSection heading={section.heading} icon={section.icon} items={items} />
}
