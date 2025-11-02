# Task: Domain Error Refinement & Architecture Improvements

## Task Status

Current: Brainstormed

## Problem Statement

Following Codex's recommendations, we need to refine error handling and extract shared business logic to improve maintainability and keep TypeScript/Swift implementations in sync. This task will:

- Refine DomainError enum with granular cases (ownershipMismatch, conflict, infrastructure)
- Extract shared ownership validation logic into a domain service
- Verify nil in Swift maps correctly to undefined/null semantics from TypeScript

## Context & Constraints

- Must maintain Clean Architecture principles
- Domain services should live in CoreDomain package
- Error refinement must not break existing error handling
- Need to ensure TypeScript and Swift error semantics remain aligned

## Expected Outcome

- DomainError has specific cases: `.ownershipMismatch`, `.conflict`, `.infrastructure(Error)`
- Shared ownership validation logic extracted to OwnershipValidationService or similar
- Documentation confirming nil/undefined/null semantic mapping
- Use cases use the new domain service for ownership checks
- Consistent error types across TypeScript and Swift implementations

## Task Type

Backend (iOS - Domain layer)

## Technical Context

### Code Constraints

- DomainError is in CoreDomain package
- Must implement LocalizedError for user-facing messages
- Domain services should be protocol-based for testability
- Follow existing domain entity patterns

### Architecture Hints

- DomainError location: `CoreDomain/Sources/CoreDomain/Errors/DomainError.swift`
- Use cases that need ownership validation:
  - UpdateBookUseCase
  - DeleteBookUseCase
  - UpdateGoalUseCase
  - DeleteGoalUseCase
- Create new domain service in: `CoreDomain/Sources/CoreDomain/Services/`

### Tech Stack Requirements

- Swift 5.9+
- Swift Package Manager
- Follow protocol-oriented design

### API Constraints

- Error messages should be clear and actionable
- Infrastructure errors should wrap underlying Error
- Domain service should be injectable via protocols

## Code Guidance

### File Organization

Files to modify:
- `CoreDomain/Sources/CoreDomain/Errors/DomainError.swift`

Files to create:
- `CoreDomain/Sources/CoreDomain/Services/OwnershipValidationService.swift` (protocol)
- `CoreDomain/Sources/CoreDomain/Services/DefaultOwnershipValidationService.swift` (implementation)

Use cases to update:
- `Application/Sources/Application/UseCases/Books/UpdateBookUseCase.swift`
- `Application/Sources/Application/UseCases/Books/DeleteBookUseCase.swift`
- `Application/Sources/Application/UseCases/Goals/UpdateGoalUseCase.swift`
- `Application/Sources/Application/UseCases/Goals/DeleteGoalUseCase.swift`

### Testing Requirements

- Unit tests for new error cases
- Unit tests for ownership validation service
- Verify use cases properly handle new error types
- Test nil handling matches TypeScript behavior

### Performance Considerations

- Domain service validation should be lightweight
- No performance impact from error refinement

## Missions

- [ ] Mission 1: Refine DomainError with granular cases and update use cases
- [ ] Mission 2: Extract ownership validation into domain service
- [ ] Mission 3: Document and verify nil/undefined/null semantic mapping

## Mission Summaries

### Mission 1: Refine DomainError with granular cases

(Will be filled when mission completes)

### Mission 2: Extract ownership validation into domain service

(Will be filled when mission completes)

### Mission 3: Document and verify nil/undefined/null semantic mapping

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
- Based on Codex error handling and architecture recommendations
- Ensures TypeScript/Swift parity in error handling
- Reduces code duplication across use cases
