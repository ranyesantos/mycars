interface SpecItemProps {
  label: string
  value: string
  isLast: boolean
}

export function SpecItem({ label, value, isLast }: SpecItemProps) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-2 ${isLast ? '' : 'border-b border-border/50'} pb-2`}
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}
