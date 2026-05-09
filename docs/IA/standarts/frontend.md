## Frontend standards

### Stack
- React + Vite + TypeScript + shadcn/ui
- TanStack Query (React Query) for all server state
- useState / useContext for local UI state only

---

### Component design

#### Single responsibility
Each component does one thing. A VehicleCard renders a vehicle.
It does not fetch data, does not contain business logic, does not
format dates inline across 15 lines.

If a component is doing too much, split it:
  VehicleCard.tsx         ← layout and composition only
  VehicleCardPrice.tsx    ← price display + stale indicator
  VehicleCardActions.tsx  ← favorite button, scraping CTA

#### Presentational vs container components
Separate what a component looks like from what it does.

  // Container — knows about data fetching and state
  // features/list-vehicles/VehicleListContainer.tsx
  export function VehicleListContainer() {
    const { data, isLoading, error } = useVehicles()
    return <VehicleList vehicles={data} isLoading={isLoading} error={error} />
  }

  // Presentational — receives props, renders UI, no side effects
  // features/list-vehicles/VehicleList.tsx
  export function VehicleList({ vehicles, isLoading, error }: VehicleListProps) {
    if (isLoading) return <VehicleListSkeleton />
    if (error) return <ErrorMessage error={error} />
    return (
      <div className="grid grid-cols-3 gap-4">
        {vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
      </div>
    )
  }

Presentational components are easy to test, easy to reuse, and
easy to hand to an agent with a clear contract.

#### Keep components small
If a component exceeds ~100 lines including its return, it is doing
too much. Extract sub-components or custom hooks.

#### Never fetch data inside a presentational component
Data fetching belongs in container components or custom hooks.
Presentational components receive data as props only.

---

### TypeScript in components

Always type props explicitly with an interface. Never use any.
Never rely on inferred prop types from usage.

  interface VehicleCardProps {
    vehicle: Vehicle
    onFavorite: (id: number) => void
    isLoading?: boolean
  }

  export function VehicleCard({ vehicle, onFavorite, isLoading = false }: VehicleCardProps) {}

Always type the return of custom hooks explicitly:

  function useVehicles(): {
    vehicles: Vehicle[]
    isLoading: boolean
    error: Error | null
  } {}

---

### Custom hooks

Extract any logic that combines state + effects + callbacks into a
named custom hook. Components should read like templates, not algorithms.

  // Wrong — logic inside the component
  export function SearchModal() {
    const [code, setCode] = useState('')
    const [type, setType] = useState('cars')
    const [result, setResult] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    async function handleSearch() {
      setIsLoading(true)
      try {
        const data = await api.searchVehicle(type, code)
        setResult(data)
      } finally {
        setIsLoading(false)
      }
    }
    // ... JSX
  }

  // Correct — logic extracted, component is just layout
  export function SearchModal() {
    const { code, type, result, isLoading, setCode, setType, handleSearch } =
      useVehicleSearch()
    // ... JSX only
  }

Rules for custom hooks:
- Name always starts with use
- One hook per feature concern — do not create one giant useApp hook
- Hooks live in the slice folder they belong to, or in /hooks/ if shared

---

### Server state with React Query

All data that comes from the backend is server state.
Never store server responses in useState — let React Query own them.

  // Always define query keys as constants to avoid typos
  export const queryKeys = {
    vehicles: ['vehicles'] as const,
    vehicle: (id: number) => ['vehicles', id] as const,
  }

  // Fetch
  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: queryKeys.vehicles,
    queryFn: () => api.getVehicles(),
  })

  // Mutate and invalidate — never manually update the list
  const { mutate: toggleFavorite } = useMutation({
    mutationFn: (id: number) => api.toggleFavorite(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles }),
  })

Never call queryClient.setQueryData to manually patch the cache
unless you have a strong performance reason. Invalidate and refetch instead —
it keeps the server as the single source of truth.

---

### shadcn/ui usage

shadcn/ui components are copied into /components/ui/ and are owned
by the project. Treat them as your own code.

Rules:
- Never modify files inside /components/ui/ directly — extend by
  wrapping, not by editing the source
- Build feature components on top of shadcn primitives, not on raw HTML
  when a shadcn equivalent exists
- Use the shadcn Dialog for all modals (SearchModal, ScrapingModal)
- Use the shadcn Skeleton for all loading states — never use spinners
  on content that has a known layout

  // Correct — wrap shadcn, don't modify it
  // components/VehicleDialog.tsx
  import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'

  export function VehicleDialog({ children, title, ...props }) {
    return (
      <Dialog {...props}>
        <DialogContent>
          <DialogHeader>{title}</DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    )
  }

---

### Error and loading states

Every component that depends on async data must handle three states:
loading, error, and success. No exceptions.

Use Skeleton components (from shadcn) that match the shape of the
real content — not generic spinners.

  if (isLoading) return <VehicleCardSkeleton />
  if (error) return <ErrorMessage message={error.message} />
  return <VehicleCard vehicle={data} />

For mutations, always handle the error case and surface it to the user.
Silent failures are not acceptable.

---

### Forms and validation

Use react-hook-form + zod for all forms.
Never manage form state manually with useState per field.

  const schema = z.object({
    fipeCode: z.string().min(1, 'FIPE code is required'),
    vehicleType: z.enum(['cars', 'trucks', 'motorcycles']),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { fipeCode: '', vehicleType: 'cars' },
  })

Validation schemas live in the same slice folder as the form component.

---

### File and folder conventions

- Component files: PascalCase — VehicleCard.tsx
- Hook files: camelCase — useVehicleSearch.ts
- Utility files: camelCase — formatPrice.ts
- One component per file — no multiple exports of components from one file
- Index files only when re-exporting a slice's public interface:

  // features/list-vehicles/index.ts
  export { VehicleListContainer } from './VehicleListContainer'

---

### Performance — only when there is a proven problem

Do not add useMemo, useCallback or React.memo preemptively.
Add them only when a measurable performance problem exists.

Premature memoization makes code harder to read and is often wrong.
React Query's caching already eliminates most unnecessary re-fetches.

Exception: useCallback is acceptable when a function is passed as a
prop to a component wrapped in React.memo, because without it the
memo has no effect.

---

### Accessibility basics

- Every interactive element must be reachable by keyboard
- shadcn components handle most of this — do not override role,
  aria-label or tabIndex without a clear reason
- Images always have an alt attribute — empty string if decorative
- Form inputs are always associated with a label via htmlFor / id