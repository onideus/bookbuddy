# TypeScript → Swift Use Case Review

## Business Logic Fidelity

- Validate that `Book.create` reproduces the UUID generation, `addedAt`, `finishedAt`, `rating`, and `currentPage` defaults the TypeScript path sets; add a regression test that builds an input matching the TS example and snapshots the resulting `Book`.
- The duplicate check mirrors TS logic, but pulling the entire bookshelf can become heavy; consider a `bookRepository.exists(userId:googleBooksId:)` endpoint (or domain service) so the Swift version cannot diverge under pagination/caching.
- For update/delete flows, double-check that `nil` in Swift maps to the same "remove value" semantics as `undefined`/`null` in TypeScript, especially for `thumbnail`, `currentPage`, and `finishedAt`.
- Ensure registration/goal flows still enforce every domain invariant (hashing, goal progress recalculation, etc.) inside domain factories so business rules live in one place and stay cross-platform.

## Swift Idioms & Best Practices

- `AddBookInput` looks Swifty; give it `Sendable` (and optionally `Equatable`) conformance since each use case is `async` and may hop threads.
- Keeping the use case as a `final class` is fine; if you want value semantics you can convert to a `struct` with a nonmutating `execute`, but the current style is consistent with DI containers.
- Consider adding lightweight documentation comments on each use case describing the business rule enforced; it helps future call sites and Xcode quick help.
- If `Book` has factory initialisers for other flows, prefer static convenience initialisers over free functions so the API reads naturally (`Book.makeNew(...)`).

## Clean Architecture Observations

- The use case depends only on `BookRepositoryProtocol` and domain entities, so the boundary remains clean; keep repository wiring in the composition root.
- Centralising entity construction in `Book.create` is ideal—ensure those factories live in the domain module to keep the application layer thin.
- Where several use cases share the same guard clauses (ownership checks, goal completion recalculation), extract them into domain services/utilities to avoid knowledge leaks.
- For infrastructure errors that bubble up (e.g., GRDB), consider mapping them in the repository to `DomainError` before hitting the use case boundary.

## Error Handling

- `DomainError.duplicate` maps the TS `DuplicateError`; ensure repositories never leak lower-level errors (e.g., networking) but normalise them into domain-specific cases.
- If the UI needs to distinguish validation from infrastructure issues, refine `DomainError` into cases like `.validation(reason:)`, `.notFound`, `.conflict`, `.infrastructure(cause:)` for consistent presentation.
- Add unit tests that exercise both success and duplicate paths to guarantee the async error propagation is correct.
- When updating goals/books, prefer throwing granular errors (e.g., `.ownershipMismatch`) instead of a generic `.forbidden` so TS and Swift stay in sync.

## Async/Await Usage

- `execute` properly awaits repository calls; confirm repositories hop to background queues so suspension does not block the main actor.
- If a use case will be invoked from actors, mark inputs/entities as `Sendable` (or add `@unchecked Sendable`) to satisfy concurrency checks.
- Use cases themselves generally do not need to be actors; prefer keeping repositories/clients responsible for thread safety to avoid unnecessary isolation.
- For read-mostly operations (`GetUserBooksUseCase`), consider exposing synchronous overloads that wrap async to reduce boilerplate where the repository already caches results.

## Optimisations & Concerns

- The duplicate search could short-circuit as soon as a match is found by using `first(where:)`; if `findByUserId` streams results, maintain streaming semantics to avoid loading everything.
- Make sure repositories expose paging so `GetUserBooksUseCase` mirrors any TS pagination; otherwise Swift might eagerly fetch huge datasets.
- Cross-check the Swift search use case still debounces/limits like the TS version to avoid overloading the external API.
- Add integration tests at the application layer comparing TS vs Swift behaviours for the most critical flows (add/update book, register user) to detect regressions quickly.

## Responses to Questions

**Q1: Is the protocol-oriented approach (UseCase protocol with associated types) better than class inheritance?**
Protocol with associated types keeps each use case strongly typed; stick with it and add a type-erased wrapper (`AnyUseCase`) if you need heterogenous storage.

**Q2: Should we use `final class` for use cases or make them structs?**
`final class` is acceptable; switch to `struct` only if you want copy semantics or to leverage implicit immutability—no functional issue either way.

**Q3: Are input structs the right approach vs. individual parameters?**
Input structs scale better than long parameter lists and keep binary compatibility; continue using them, adding semantic factory methods where helpful.

**Q4: Is dependency injection via initializer the best pattern for iOS?**
Initialiser injection lines up with Clean Architecture; compose them in the DI container (or SwiftUI environment) to keep the use case layer pure.

**Q5: Should we add more granular error types or is DomainError sufficient?**
Expand `DomainError` as needed, but keep error translation inside repositories/domain so the use cases throw only domain-level errors.

**Q6: Are there any Swift-specific optimizations we're missing?**
Consider `Sendable` conformance, repository-level existence checks, and lazy sequences to avoid unnecessary copies; otherwise the implementation is already lean.

**Q7: Should use cases be actors for thread safety?**
Make use cases actors only if they hold mutable shared state; prefer keeping repositories/clients actor-isolated instead of the orchestration layer.
