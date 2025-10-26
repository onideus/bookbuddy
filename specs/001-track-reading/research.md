# Reading Journey Tracker – Research

## Development Stack

- **Decision**: Build the reading dashboard using Vite 5 with the vanilla JavaScript template and progressive enhancement patterns.  
  **Rationale**: Vite provides fast dev tooling and optimized builds while allowing us to stay close to native HTML/CSS/JS, matching the request to minimize libraries.  
  **Alternatives considered**: React/Vue frameworks (rejected due to added complexity), bundler-free ESBuild (lacked dev ergonomics).

- **Decision**: Adopt optional TypeScript typings for domain models while keeping runtime code in plain ES modules.  
  **Rationale**: Typings improve correctness for state transitions without forcing TS build output; Vite supports `.d.ts` scaffolding seamlessly.  
  **Alternatives considered**: Pure JavaScript with JSDoc (weaker tool support), full TypeScript compilation (higher config cost for minimal gain).

## Testing Strategy

- **Decision**: Use Vitest with Testing Library DOM and Playwright accessibility suites.  
  **Rationale**: Vitest integrates with Vite and supports fast unit/integration runs; Testing Library keeps focus on user interactions; Playwright can automate axe checks for WCAG evidence.  
  **Alternatives considered**: Jest (slower integration with Vite), Cypress (heavier footprint), manual accessibility audits only.

## Storage & Data Access

- **Decision**: Persist reading entries in the existing PostgreSQL 15 cluster via BookBuddy backend services.  
  **Rationale**: PostgreSQL aligns with cross-service reporting, supports transactional status changes, and satisfies user request.  
  **Alternatives considered**: SQLite per-user (sync issues), document stores such as MongoDB (schema consistency risk).

- **Decision**: Model `book`, `reading_entry`, `progress_note`, and `rating` tables with normalized relationships.  
  **Rationale**: Normalization keeps deduped book metadata reusable across readers and supports analytics needs.  
  **Alternatives considered**: Embedding full metadata in reading entries (duplicate data) or denormalized JSONB (harder query optimization).

## Performance & Scale

- **Decision**: Target ≤2s dashboard load and ≤300ms p95 status update latency with batching for large lists.  
  **Rationale**: Matches success criteria (3s update visibility) while keeping UI responsive for libraries up to 5k titles.  
  **Alternatives considered**: No explicit targets (risk of regressions), aggressive caching layer (premature optimization for initial release).

- **Decision**: Paginate lists beyond 50 books per status with incremental fetching.  
  **Rationale**: Prevents DOM bloat and reduces query load for heavy readers.  
  **Alternatives considered**: Infinite scroll (complex accessibility), showing all records at once (performance degradation).

## UX & Accessibility

- **Decision**: Reuse BookBuddy design tokens, list components, and accessible tab navigation.  
  **Rationale**: Ensures consistency with Constitution Principle V and reduces bespoke CSS.  
  **Alternatives considered**: Custom styling (higher maintenance), third-party UI kits (violates minimal library direction).

- **Decision**: Document accessibility verification steps (keyboard flows, screen-reader announcements, color contrast).  
  **Rationale**: Required for Constitution compliance and success criterion SC-004.  
  **Alternatives considered**: Manual QA only (insufficient evidence).
