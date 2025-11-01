# Task: Comprehensive Testing Suite for TypeScript/Swift Parity

## Task Status

Current: Brainstormed

## Problem Statement

To ensure business logic fidelity between TypeScript and Swift implementations, Codex recommends comprehensive testing at multiple levels. This task will create:

- Regression test for Book.create to verify it matches TypeScript defaults (addedAt, finishedAt, rating, currentPage)
- Unit tests for use case error paths (duplicate, unauthorized, notFound)
- Integration tests comparing TypeScript vs Swift behavior for critical flows (add/update book, register user)

## Context & Constraints

- Tests must use XCTest framework for Swift
- Need to create mock repositories for unit testing
- Integration tests should validate end-to-end behavior
- Tests should catch regressions quickly if TypeScript logic changes

## Expected Outcome

- Book.create test verifies all default field values match TypeScript implementation
- All use cases have error path unit tests with 100% coverage
- Integration tests validate critical user flows match TypeScript behavior
- CI/CD ready test suite that can run automatically
- Clear test documentation for future maintainers

## Task Type

Backend (iOS - Testing)

## Technical Context

### Code Constraints

- Use XCTest framework
- Follow Swift testing conventions
- Tests should be isolated and repeatable
- Use test doubles (mocks/fakes) for repositories

### Architecture Hints

- Test files belong in package `Tests/` directories
- CoreDomain tests: `ios/Packages/CoreDomain/Tests/CoreDomainTests/`
- Application tests: `ios/Packages/Application/Tests/ApplicationTests/`
- Follow naming convention: `[TypeName]Tests.swift`

### Tech Stack Requirements

- XCTest framework
- Swift 5.9+
- Swift Package Manager test targets
- Consider adding swift-testing framework for modern syntax

## Code Guidance

### File Organization

Test files to create:
- `CoreDomain/Tests/CoreDomainTests/Entities/BookTests.swift` (regression test for Book.create)
- `CoreDomain/Tests/CoreDomainTests/Entities/GoalTests.swift`
- `CoreDomain/Tests/CoreDomainTests/Entities/UserTests.swift`
- `Application/Tests/ApplicationTests/UseCases/Books/AddBookUseCaseTests.swift`
- `Application/Tests/ApplicationTests/UseCases/Books/UpdateBookUseCaseTests.swift`
- `Application/Tests/ApplicationTests/UseCases/Books/DeleteBookUseCaseTests.swift`
- `Application/Tests/ApplicationTests/UseCases/Goals/CreateGoalUseCaseTests.swift`
- `Application/Tests/ApplicationTests/UseCases/Goals/UpdateGoalUseCaseTests.swift`
- `Application/Tests/ApplicationTests/UseCases/Goals/DeleteGoalUseCaseTests.swift`
- `Application/Tests/ApplicationTests/UseCases/Auth/RegisterUserUseCaseTests.swift`
- `Application/Tests/ApplicationTests/Integration/BookWorkflowTests.swift` (integration)
- `Application/Tests/ApplicationTests/Integration/GoalWorkflowTests.swift` (integration)

Mock repositories to create:
- `Application/Tests/ApplicationTests/Mocks/MockBookRepository.swift`
- `Application/Tests/ApplicationTests/Mocks/MockGoalRepository.swift`
- `Application/Tests/ApplicationTests/Mocks/MockUserRepository.swift`
- `Application/Tests/ApplicationTests/Mocks/MockPasswordHasher.swift`

### Testing Requirements

- Unit tests should test both success and error paths
- Regression tests should snapshot expected values
- Integration tests should test complete workflows
- All tests must pass before committing
- Aim for 80%+ code coverage on use cases

### Performance Considerations

- Tests should run quickly (< 5 seconds total)
- Use in-memory test doubles, not real database
- Parallel test execution where possible

## Missions

- [ ] Mission 1: Create regression tests for domain entities (Book, Goal, User) verifying TypeScript defaults
- [ ] Mission 2: Create mock repositories and unit tests for all use case error paths
- [ ] Mission 3: Create integration tests for critical workflows (add/update book, create/update goal, register user)

## Mission Summaries

### Mission 1: Create regression tests for domain entities

(Will be filled when mission completes)

### Mission 2: Create mock repositories and unit tests for use case error paths

(Will be filled when mission completes)

### Mission 3: Create integration tests for critical workflows

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
- Based on Codex testing recommendations
- Critical for maintaining TypeScript/Swift parity
- Foundation for preventing future regressions
- Tests document expected behavior
