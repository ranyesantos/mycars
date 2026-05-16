### Prop drilling — when it becomes a problem and how to solve it

Prop drilling is passing data through intermediate components that
do not use it — they only forward it to a child. It is not always
wrong. Two levels of passing is normal and acceptable. It becomes
a problem when:

- A prop passes through 3 or more components before being used
- An intermediate component receives a prop only to forward it
- Renaming or removing a prop requires touching multiple files
  that have no real relationship to that data

#### Solutions in order of preference

**1. Composition — solve it before it starts**

Most prop drilling can be avoided by restructuring how components
compose, before reaching for Context or a state manager.

Instead of passing data down, pass the already-composed element down:

  // Drilling — Header doesn't use onFavorite, just forwards it
  <Page onFavorite={handleFavorite} />
    <Header onFavorite={onFavorite} />
      <VehicleCard onFavorite={onFavorite} />

  // Composition — Page owns the composition, no drilling
  <Page>
    <Header />
    <VehicleCard onFavorite={handleFavorite} />
  </Page>

Use the children prop and component slots aggressively. If a parent
is only passing things through, it probably should not own them.

**2. React Query for server data**

The most common source of prop drilling in data-heavy apps is server
state being fetched at the top and passed down to consumers. React
Query eliminates this entirely — any component calls useQuery and
gets the data directly from the cache without a network request:

  // Wrong — fetch at the top, drill down
  function VehiclesPage() {
    const { data } = useQuery(...)
    return <VehicleList vehicles={data} />  // VehicleList drills to VehicleCard
  }

  // Correct — each component owns its data access
  function VehicleCard({ id }: { id: number }) {
    const { data: vehicle } = useQuery({
      queryKey: queryKeys.vehicle(id),
      queryFn: () => api.getVehicle(id),
    })
  }

**3. Context for shared UI state**

For client state that is genuinely shared across distant components
with no server backing — modals open state, comparison selection,
active filters — use a focused Context.

Rules for Context usage:
- One context per concern — never a single AppContext holding everything
- Context goes in the slice or feature it belongs to, not in a global
  providers file unless it is truly application-wide
- Never put frequently-changing values (e.g. form input on every
  keystroke) in Context — it re-renders every consumer on every change
- Context is for low-frequency state: which modal is open, which
  vehicles are selected for comparison, current theme

  // context/ComparisonContext.tsx
  interface ComparisonContextValue {
    selectedIds: number[]
    toggle: (id: number) => void
    clear: () => void
  }

  const ComparisonContext = createContext<ComparisonContextValue | null>(null)

  export function useComparison() {
    const ctx = useContext(ComparisonContext)
    if (!ctx) throw new Error('useComparison must be used inside ComparisonProvider')
    return ctx
  }

Always export a named hook (useComparison, useSearchModal) instead of
exposing the context object directly. This enforces the usage boundary
and gives a clear error when used outside its provider.

---

### Bad practices — never do these

#### Storing server data in useState
Server state belongs to React Query. Storing API responses in useState
creates a second source of truth that goes stale silently.

  // Wrong
  const [vehicles, setVehicles] = useState([])
  useEffect(() => {
    api.getVehicles().then(setVehicles)
  }, [])

  // Correct
  const { data: vehicles } = useQuery({
    queryKey: queryKeys.vehicles,
    queryFn: api.getVehicles,
  })

#### useEffect for derived state
If a value can be computed from existing state or props, compute it
inline. Never store derived values in state and sync them with useEffect.

  // Wrong — derived state that must be kept in sync manually
  const [fullName, setFullName] = useState('')
  useEffect(() => {
    setFullName(`${firstName} ${lastName}`)
  }, [firstName, lastName])

  // Correct — compute inline, always up to date
  const fullName = `${firstName} ${lastName}`

#### useEffect for event handling
useEffect is for synchronizing with external systems (DOM APIs,
subscriptions, timers). It is not an event handler.

  // Wrong — using effect to react to a user action
  const [submitted, setSubmitted] = useState(false)
  useEffect(() => {
    if (submitted) api.saveVehicle(vehicle)
  }, [submitted])

  // Correct — call directly in the handler
  function handleSubmit() {
    api.saveVehicle(vehicle)
  }

#### Anonymous functions as props on every render
Defining functions inline in JSX creates a new reference on every render.
When passed to memoized components this defeats the memoization.

  // Wrong
  <VehicleCard onFavorite={(id) => toggleFavorite(id)} />

  // Correct
  <VehicleCard onFavorite={toggleFavorite} />

#### Index as key in dynamic lists
Using array index as the key prop causes React to mis-identify elements
when the list order changes, leading to incorrect renders and state bugs.

  // Wrong
  {vehicles.map((v, index) => <VehicleCard key={index} vehicle={v} />)}

  // Correct — use a stable unique identifier
  {vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}

#### Boolean rendering trap
Rendering a number when the condition is falsy (0) causes unexpected
output because 0 is a renderable value in React.

  // Wrong — renders "0" on screen when list is empty
  {vehicles.length && <VehicleList vehicles={vehicles} />}

  // Correct — explicit boolean
  {vehicles.length > 0 && <VehicleList vehicles={vehicles} />}
  // or
  {!!vehicles.length && <VehicleList vehicles={vehicles} />}

#### Overusing useCallback and useMemo
Memoization has a cost. Wrapping every function and value in useCallback
and useMemo makes code harder to read and rarely improves performance
because most React renders are fast by default.

Add memoization only when:
- A profiler measurement shows a real performance problem
- A function is a prop to a React.memo component and its identity matters
- A computation is measurably expensive (heavy data transformation)

#### Inconsistent or missing loading and error states
Every component that depends on async data must handle all three states.
Rendering nothing during loading or silently ignoring errors are not
acceptable defaults.

  // Wrong — no loading or error handling
  export function VehicleList() {
    const { data } = useQuery(...)
    return <div>{data?.map(...)}</div>
  }

  // Correct
  export function VehicleList() {
    const { data, isLoading, error } = useQuery(...)
    if (isLoading) return <VehicleListSkeleton />
    if (error) return <ErrorMessage message={error.message} />
    return <div>{data.map(...)}</div>
  }

#### Untyped or loosely typed props
Never use any on props. Never omit prop types because "it's a small
component". Every component has an explicit typed interface.

  // Wrong
  export function VehicleCard({ vehicle, onFavorite }: any) {}

  // Correct
  interface VehicleCardProps {
    vehicle: Vehicle
    onFavorite: (id: number) => void
  }
  export function VehicleCard({ vehicle, onFavorite }: VehicleCardProps) {}