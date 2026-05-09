## SOLID (applied pragmatically)

### S — Single responsibility
Each file does one thing. A repository only touches the database.
A service only contains business logic. A route only handles HTTP concerns.
If a service method is doing more than one conceptual thing, split it.

### O — Open/closed
Design services around interfaces, not concrete implementations.
FipeClient should be an interface. The real implementation uses Axios.
A mock implementation is used in tests. The service doesn't know the difference.

### I — Interface segregation
Keep interfaces narrow. A repository used by one slice should not expose
methods only another slice needs. Split repositories if necessary.

### D — Dependency inversion
High-level modules (services) depend on abstractions (interfaces),
not on concrete classes (repositories, HTTP clients).
This is enforced by the DI pattern above.

Note: L (Liskov) is not a priority in this codebase — inheritance is rarely used.

