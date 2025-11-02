# Remediation Plan – BookBuddy Mk3

This document expands on the identified issues so Claude (or any teammate picking up the work) has the full rationale, code references, and concrete acceptance criteria for each fix. The sections are ordered by urgency.

---

## 1. Fix Reading Auto-Completion (High Priority)

**Files/Lines**
- `domain/value-objects/reading-status.ts` around lines 88-95
- `domain/services/book-service.ts` around lines 27-33

**Current Behaviour**
- `BookService.updateReadingProgress()` accepts the `currentPage` the user just reported, stores it in a local `updates` object, and then asks `ReadingStatus.shouldAutoMarkAsRead()` whether the book should transition to `read`.
- `ReadingStatus.shouldAutoMarkAsRead()` still looks at the original `book.currentPage` that came from the repository. Since that value has not yet been updated, the method never sees the new page count, so auto-completion never fires.

**Why It Matters**
- The UI relies on the service to automatically mark a book as finished when the reader reaches the final page. Without this, the user is stuck with a book in the “reading” state even after entering the final page, degrading the experience and violating the declared business rule.

**Recommendation**
1. Update the logic so `ReadingStatus` evaluates the pending page number. Options:
   - Create a copy of the `Book` entity that applies the candidate `currentPage` before instantiating `ReadingStatus`.
   - Or, extend `shouldAutoMarkAsRead()` to accept the prospective page number as an argument.
2. Ensure the auto-transition still calls `transitionTo('read')` so timestamps and rating resets continue to work.
3. Add/extend tests for `BookService.updateReadingProgress()`:
   - Given a book with `pageCount = 350` and `currentPage = 349`, when updateProgress is called with `currentPage = 350`, the returned book should have `status === 'read'`, `currentPage === 350`, and `finishedAt` populated.

**Acceptance Criteria**
- Auto-complete scenario transitions books to `read` without additional user input.
- Regression test covers the finishing-book path and fails on the old behaviour.

---

## 2. Keep Goal Completion In Sync with Progress (High Priority)

**Files/Lines**
- `domain/services/goal-service.ts` around lines 36-44 and 102-108

**Current Behaviour**
- Both `syncGoalProgress()` and `updateGoalProgress()` calculate goal progress using the `GoalProgress` value object.
- If `shouldAutoComplete()` returns `true`, they set `updates.completed = true`.
- If the goal later drops below the completion threshold (for example, a finished book gets deleted or its finished date falls outside the window), there is no branch that clears `completed`. The stored goal therefore stays completed forever.

**Why It Matters**
- The UI and statistics rely on the `completed` flag. Once true, it permanently misrepresents progress, inflating completion metrics and preventing alerts (like “overdue”) from showing up again. This is a data integrity bug.

**Recommendation**
1. Populate `updates.completed` based on the newly computed progress every time:
   ```ts
   updates.completed = progress.isCompleted();
   ```
   (or perform an explicit `if/else` to set it to `false` when the condition is not met).
2. Ensure the goal repositories persist the updated flag when toggled back to false.
3. Add tests for both service methods:
   - A goal that crosses the threshold should flip to completed.
   - If progress falls below the threshold, subsequent sync/update calls should set `completed` back to `false`.

**Acceptance Criteria**
- The domain service keeps `goal.completed` aligned with the recalculated progress on every sync/update.
- Tests cover both the “set to true” and “set back to false” scenarios.

---

## 3. Correct Overdue Messaging on Goal Cards (Medium Priority)

**File/Lines**
- `components/GoalCard.tsx` around lines 28-81

**Current Behaviour**
- `daysRemaining` is derived by clamping the difference to a minimum of zero.
- When a goal is overdue, the UI renders `Overdue by {Math.abs(daysRemaining)} days`, which resolves to 0 because the earlier clamp destroyed the negative value.

**Why It Matters**
- Overdue goals communicate wrong information to the user (“Overdue by 0 days”), making the alert useless.

**Recommendation**
1. Calculate both `daysRemainingRaw` (signed difference) and `daysRemaining = Math.max(0, daysRemainingRaw)`.
2. Compute `const daysOverdue = Math.max(0, -daysRemainingRaw)` and render that in the overdue branch.
3. Confirm the rest of the component continues to show the positive countdown for in-progress goals.

**Acceptance Criteria**
- Overdue goals show `Overdue by N days` with the correct day count.
- In-progress goals still show `{daysRemaining} days remaining`.

---

## 4. Repair Route Param Typings (Medium Priority)

**Files/Lines**
- `app/api/books/[id]/route.ts` around line 11
- `app/api/goals/[id]/route.ts` around line 11

**Current Behaviour**
- The route handler signatures are declared as:
  ```ts
  export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  )
  ```
- Next.js actually invokes the handler with `{ params: { id: string } }`.
- Because the code `await`s the params, it works at runtime but the typing is incorrect, bypassing compiler checks.

**Why It Matters**
- TypeScript’s structural typing currently lets this slip by, but stricter compiler settings (or future Next.js updates) will break this path.
- Keeping accurate type contracts reduces surprises and aligns with the clean architecture goals.

**Recommendation**
1. Update both route files to:
   ```ts
   export async function PATCH(
     request: Request,
     { params }: { params: { id: string } }
   )
   ```
   (and the same for DELETE).
2. Run TypeScript or eslint to confirm no further adjustments are needed.

**Acceptance Criteria**
- Both routes compile without type assertions or `await params`.
- No runtime behaviour changes.

---

## 5. Address Global In-Memory State (Lower Priority, Strategic)

**Files/Lines**
- `lib/di/container.ts` around lines 14-70
- `infrastructure/persistence/memory/database.ts` around lines 6-11

**Current Behaviour**
- The DI container lazily instantiates memory repositories and stores them on static singleton fields.
- These repositories share a single `memoryDatabase` map.
- In multi-user or serverless environments, this leaks data between requests, does not persist state, and is wiped on cold starts.
- Documentation claims the app is “production ready,” but the current infrastructure invalidates that claim.

**Why It Matters**
- The architecture promises Clean Architecture benefits, but the shared singleton undermines those guarantees once we leave local development.
- Transitioning to a real datasource (e.g., Prisma + PostgreSQL) becomes harder if request scope and lifecycle are not thought through early.

**Recommendation**
1. Roadmap the migration to persistent adapters (the repo already includes `@prisma/client`):
   - Implement `PrismaBookRepository`, `PrismaUserRepository`, etc., under `infrastructure/persistence/prisma/`.
   - Wire them into the container behind an environment toggle or configuration object.
2. Revisit DI strategy:
   - Provide request-scoped factories (e.g., using `createRequestContainer`) that create repositories/services per request instead of relying purely on singletons.
   - Document how the container should be used in server actions versus API routes.
3. Update the architecture documentation so the deployment expectations match reality.

**Acceptance Criteria**
- Plan exists (and is documented) for swapping the memory layer for a persistent store.
- The DI container no longer shares mutable state globally once the migration is complete.
- Documentation calls out the development-only nature of the memory implementation until the migration ships.

---

### Suggested Execution Order
1. Implement fixes #1 and #2 together—they touch the domain layer and should ship with unit tests.
2. Knock out the UI/typing fixes (#3 and #4); they are small but improve polish and maintainability.
3. Flesh out the persistence/DI plan (#5) and align the documentation with the intended production story.

---

## Task Breakdown for Claude

### Task A – Reading Auto-Completion
1. Update the domain logic so `ReadingStatus` evaluates the pending page number (choose approach and document in code comments if necessary).
2. Adjust `BookService.updateReadingProgress()` to pass the pending page state into the value object before checking for auto-completion.
3. Add unit tests that cover: (a) normal progress update, (b) finishing the last page triggers `status = 'read'` and `finishedAt` timestamp, (c) validation errors still propagate.
4. Run tests to ensure the new path passes; update docs/changelogs if relevant.

### Task B – Goal Completion Synchronization
1. Modify both `syncGoalProgress()` and `updateGoalProgress()` to set `updates.completed = progress.isCompleted()` (or equivalent).
2. Confirm repository update paths correctly persist `false`.
3. Write tests covering toggling to complete and back to incomplete.
4. Verify goal statistics still behave as expected; adjust tests/fixtures if they rely on old behaviour.

### Task C – GoalCard Overdue Messaging
1. Refactor `GoalCard.tsx` to compute `daysRemainingRaw`, `daysRemaining`, and `daysOverdue`.
2. Update the overdue branch to display `daysOverdue`.
3. Sanity-check the UI manually or via screenshot tests (if available) to ensure no regressions in other branches.

### Task D – Route Param Typings
1. Update the handler signatures in both `[id]/route.ts` files to remove `Promise`.
2. Remove the unnecessary `await params` usage.
3. Run `tsc --noEmit` (or the project’s lint script) to confirm type safety.

### Task E – Persistence & DI Strategy
1. Draft a short design note (or expand existing docs) outlining the move from memory repositories to Prisma-based ones.
2. Prototype request-scoped container usage, ensuring shared mutable state is eliminated.
3. Update `ARCHITECTURE.md`/`DEVELOPER_GUIDE.md` to explain the interim state and migration path.
4. Optional follow-up: create actual Prisma repository implementations and wiring (can be separate sub-task if preferred).

Feel free to assign tasks individually or bundle them into a single refactor, but shipping the high-priority domain fixes first will address the most impactful bugs.
