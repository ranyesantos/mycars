## Database transactions

### When to use
Use a transaction whenever a single operation requires more than one
DB write, and leaving them partially applied would result in corrupt
or inconsistent data.

The test: if the second write fails, does the first write leave the
database in a state that is wrong or unrecoverable? If yes, wrap both
in a transaction.

### Rules
- Never write to two or more tables in sequence without a transaction
- Never update a row and insert a related row without a transaction
- Reads do not need transactions unless they are part of a
  read-modify-write cycle that must be atomic

### Concrete cases in this project

- Use a transaction:

  - Saving a new vehicle + its years
    vehicles and vehicle_years are always inserted together.
    A vehicle row with no year rows is an incomplete record.

  - Updating prices across multiple vehicle_years rows
    The monthly cron updates many rows in one run. A partial update (some prices updated, others not) is worse than no update at all wrap the entire batch in one transaction.

  - Saving scraping details + updating vehicle.updated_at. Both writes represent the same event. They succeed or fail together.

  - Enqueueing a job + updating the triggering record's status. If the job is enqueued but the status update fails, the system will re-enqueue on restart and process the same job twice.

- Do not use a transaction:

  - Single-row writes (toggle favorite, insert one job) A single statement is atomic by definition in SQLite.

  - Read-only queries. No writes, nothing to roll back.

  - Independent writes that are safe to apply partially If two writes represent unrelated events and partial application is acceptable, a transaction adds overhead with no benefit.

### Pattern with better-sqlite3

better-sqlite3 transactions are synchronous. Use the built-in transaction() wrapper — it commits on success and rolls back on any thrown error automatically.

```typescript
const saveVehicleWithYears = db.transaction(
    (vehicle: Vehicle, years: VehicleYear[]) => {
        const { lastInsertRowid } = db
            .prepare('INSERT INTO vehicles ...')
            .run(vehicle)

        const insertYear = db.prepare('INSERT INTO vehicle_years ...')
        for (const year of years) {
            insertYear.run({ vehicleId: lastInsertRowid, ...year })
        }
    }
)

// Call it like a regular function — throws on failure, rolls back automatically
saveVehicleWithYears(vehicle, years)
```
Never manually call BEGIN / COMMIT / ROLLBACK, always use the db.transaction() wrapper so rollback on error is guaranteed.

### Batch operations
When the cron updates prices for all saved vehicles, do not open one transaction per vehicle. Wrap the entire batch in a single transaction — it is faster and guarantees all-or-nothing semantics.
``` typescript
const updateAllPrices = db.transaction((updates: PriceUpdate[]) => {
    const stmt = db.prepare(
        'UPDATE vehicle_years SET price = ?, price_updated_at = ? WHERE id = ?'
    )
    for (const update of updates) {
        stmt.run(update.price, update.updatedAt, update.id)
    }
})
```