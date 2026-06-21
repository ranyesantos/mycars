import type { LucideIcon } from 'lucide-react'

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
          <div
            key={`${item.label}-${i}`}
            className={`flex flex-wrap items-baseline justify-between gap-2 ${i < items.length - 1 ? 'border-b border-border/50' : 'border-0'} pb-2`}
          >
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="text-right text-sm font-medium text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
