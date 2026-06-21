import type { LucideIcon } from 'lucide-react'
import { SpecItem } from './SpecItem'

interface SpecItemData {
  label: string
  value: string
}

interface SpecSectionProps {
  heading: string
  icon: LucideIcon
  items: SpecItemData[]
}

export function SpecSection({ heading, icon: Icon, items }: SpecSectionProps) {
  if (items.length === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4" />
        {heading}
      </h3>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {items.map((item, i) => (
          <SpecItem
            key={`${item.label}-${i}`}
            label={item.label}
            value={item.value}
            isLast={i === items.length - 1}
          />
        ))}
      </dl>
    </section>
  )
}
