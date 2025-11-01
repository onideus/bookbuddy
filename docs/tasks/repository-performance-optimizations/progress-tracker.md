# Task: Repository Performance Optimizations

## Task Status

Current: Brainstormed

## Problem Statement

Currently, duplicate checking and existence validation require fetching entire collections from the database, which is inefficient. Codex recommends adding optimized `exists()` methods and using `first(where:)` for short-circuiting searches. This task will:

- Add `exists()` methods to BookRepositoryProtocol and GoalRepositoryProtocol
- Optimize duplicate check in AddBookUseCase to use `first(where:)` or new `exists()` method
- Add pagination support to repository protocols if not already present

## Context & Constraints

- Must maintain Clean Architecture boundaries (protocols in CoreDomain, implementations in InfrastructureIOS)
- Database queries should be efficient (avoid N+1 problems)
- Changes must be backward compatible with existing use cases
- Consider GRDB-specific optimizations for SQL queries

## Expected Outcome

- BookRepositoryProtocol has `exists(userId:googleBooksId:)` method
- GoalRepositoryProtocol has `exists(userId:goalId:)` method
- AddBookUseCase uses optimized existence check instead of fetching full collection
- Repository protocols support pagination for list operations
- Measurable performance improvement for large datasets

## Task Type

Backend (iOS - Repository layer)

## Technical Context

### Code Constraints

- Repository protocols defined in CoreDomain package
- Repository implementations will be in InfrastructureIOS package (future work)
- Follow async/await patterns
- Use Result type or throws for error handling

### Architecture Hints

- BookRepositoryProtocol located at: `CoreDomain/Sources/CoreDomain/Protocols/BookRepositoryProtocol.swift`
- GoalRepositoryProtocol located at: `CoreDomain/Sources/CoreDomain/Protocols/GoalRepositoryProtocol.swift`
- Use cases that need updating: `Application/Sources/Application/UseCases/Books/AddBookUseCase.swift`

### Tech Stack Requirements

- Swift 5.9+
- GRDB for database (when implementing InfrastructureIOS)
- Swift Package Manager

### API Constraints

- New `exists()` methods should return `Bool`
- Pagination should use offset/limit pattern or cursor-based approach
- All methods must be async throws

## Code Guidance

### File Organization

Protocol updates:
- `CoreDomain/Sources/CoreDomain/Protocols/BookRepositoryProtocol.swift`
- `CoreDomain/Sources/CoreDomain/Protocols/GoalRepositoryProtocol.swift`
- `CoreDomain/Sources/CoreDomain/Protocols/UserRepositoryProtocol.swift` (if pagination needed)

Use case updates:
- `Application/Sources/Application/UseCases/Books/AddBookUseCase.swift`

### Testing Requirements

- Add unit tests for new repository protocol methods
- Verify use cases correctly use new exists() methods
- Test pagination edge cases (empty results, last page, etc.)

### Performance Considerations

- exists() should use COUNT or EXISTS SQL queries, not SELECT *
- Pagination prevents memory issues with large datasets
- Consider adding indexes for googleBooksId and other frequently queried fields

## Missions

- [ ] Mission 1: Add exists() methods to BookRepositoryProtocol and GoalRepositoryProtocol
- [ ] Mission 2: Update AddBookUseCase to use optimized exists() check
- [ ] Mission 3: Add pagination support to repository protocols (findByUserId methods)

## Mission Summaries

### Mission 1: Add exists() methods to repository protocols

(Will be filled when mission completes)

### Mission 2: Update AddBookUseCase to use optimized exists() check

(Will be filled when mission completes)

### Mission 3: Add pagination support to repository protocols

(Will be filled when mission completes)

## Agent Usage Tracking

### Mission 1 Agents

- (To be updated during mission execution)

### Mission 2 Agents

- (To be updated during mission execution)

### Mission 3 Agents

- (To be updated during mission execution)

## Sub-Agent Outputs

_Links to detailed agent outputs stored in sub-agents-outputs/ folder_

## Notes

- Task created: 2025-11-01
- Status: Brainstormed → Validated → In dev → Testing → Completed
- Based on Codex performance optimization recommendations
- Implementations in InfrastructureIOS will be handled separately
- Focus is on protocol definitions and use case updates
