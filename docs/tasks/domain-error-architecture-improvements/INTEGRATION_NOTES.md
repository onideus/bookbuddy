# Integration Notes for Domain Error Architecture Improvements

## Overview
This document provides integration guidance for the Domain Error Architecture improvements completed in this task.

## Required AppContainer.swift Changes

The `AppContainer.swift` needs to be updated to wire up the new `OwnershipValidationService`. Here's the required change pattern:

### Before (Current Pattern)
```swift
// Current use case initialization
lazy var updateBookUseCase = UpdateBookUseCase(
    bookRepository: bookRepository
)

lazy var deleteBookUseCase = DeleteBookUseCase(
    bookRepository: bookRepository
)

lazy var updateGoalUseCase = UpdateGoalUseCase(
    goalRepository: goalRepository
)

lazy var deleteGoalUseCase = DeleteGoalUseCase(
    goalRepository: goalRepository
)
```

### After (Required Pattern)  
```swift
// Add ownership validation service
lazy var ownershipValidationService: OwnershipValidationService = DefaultOwnershipValidationService(
    bookRepository: bookRepository,
    goalRepository: goalRepository
)

// Updated use case initialization
lazy var updateBookUseCase = UpdateBookUseCase(
    bookRepository: bookRepository,
    ownershipValidationService: ownershipValidationService
)

lazy var deleteBookUseCase = DeleteBookUseCase(
    bookRepository: bookRepository,
    ownershipValidationService: ownershipValidationService
)

lazy var updateGoalUseCase = UpdateGoalUseCase(
    goalRepository: goalRepository,
    ownershipValidationService: ownershipValidationService
)

lazy var deleteGoalUseCase = DeleteGoalUseCase(
    goalRepository: goalRepository,
    ownershipValidationService: ownershipValidationService
)
```

## Breaking Changes

### Constructor Signatures Changed
The following use cases now require an additional `OwnershipValidationService` parameter:
- `UpdateBookUseCase`
- `DeleteBookUseCase` 
- `UpdateGoalUseCase`
- `DeleteGoalUseCase`

### Error Types Added
New error cases added to `DomainError`:
- `.ownershipMismatch` - Replaces specific `.unauthorized` cases for ownership
- `.conflict` - For data conflicts
- `.infrastructure(Error)` - For system errors with preserved underlying error

### Import Requirements
Classes using the new ownership validation service need:
```swift
import CoreDomain  // For OwnershipValidationService protocol and new error cases
```

## Enhanced Error Handling

### Granular Error Types
The new error types provide more specific feedback:

**Old Pattern**:
```swift
// Generic error - hard to distinguish between authentication and ownership
throw DomainError.unauthorized("You don't have permission to update this book")
```

**New Pattern**:
```swift
// Specific ownership error with clear user guidance
throw DomainError.ownershipMismatch
// Error automatically provides: "You can only modify items that belong to your account."
```

### Infrastructure Error Handling
System errors are now properly wrapped and preserved:

**Old Pattern**:
```swift
// Infrastructure errors were not distinguished
return try await bookRepository.update(input.bookId, updates: input.updates)
```

**New Pattern**:
```swift
// Infrastructure errors preserve underlying error information
do {
    return try await bookRepository.update(input.bookId, updates: input.updates)
} catch {
    throw DomainError.infrastructure(error)
}
```

## Testing Implications

### Mock Service Creation
For testing, create a mock ownership validation service:
```swift
class MockOwnershipValidationService: OwnershipValidationService {
    var shouldValidateBook = true
    var shouldValidateGoal = true
    var shouldThrowError: DomainError?
    
    func validateBookOwnership(bookId: String, userId: String) async throws -> Bool {
        if let error = shouldThrowError { throw error }
        return shouldValidateBook
    }
    
    func ensureBookOwnership(bookId: String, userId: String) async throws {
        if let error = shouldThrowError { throw error }
        if !shouldValidateBook { throw DomainError.ownershipMismatch }
    }
    
    func validateGoalOwnership(goalId: String, userId: String) async throws -> Bool {
        if let error = shouldThrowError { throw error }
        return shouldValidateGoal
    }
    
    func ensureGoalOwnership(goalId: String, userId: String) async throws {
        if let error = shouldThrowError { throw error }
        if !shouldValidateGoal { throw DomainError.ownershipMismatch }
    }
}
```

### Test Updates Required
Existing tests for the modified use cases will need:
1. Updated constructor calls with mock ownership service
2. Verification of new error types instead of generic `.unauthorized`
3. Testing of ownership validation scenarios
4. Verification of infrastructure error wrapping

### Example Test Updates
```swift
// Old Test Pattern
func testUpdateBookThrowsWhenUserDoesntOwnBook() async throws {
    let useCase = UpdateBookUseCase(bookRepository: mockRepository)
    // ... test logic
}

// New Test Pattern  
func testUpdateBookThrowsOwnershipMismatchWhenUserDoesntOwnBook() async throws {
    let mockOwnershipService = MockOwnershipValidationService()
    mockOwnershipService.shouldValidateBook = false
    
    let useCase = UpdateBookUseCase(
        bookRepository: mockRepository,
        ownershipValidationService: mockOwnershipService
    )
    
    do {
        _ = try await useCase.execute(input)
        XCTFail("Expected ownershipMismatch error")
    } catch DomainError.ownershipMismatch {
        // Expected error type
    } catch {
        XCTFail("Expected ownershipMismatch, got \(error)")
    }
}
```

## Deployment Considerations

### Backwards Compatibility
- Error handling interfaces remain compatible at the API level
- New error cases provide more granular information without breaking existing flows
- Existing error handling will continue to work, with enhanced specificity

### User Experience Improvements
- `LocalizedError` compliance provides better user-facing messages with:
  - Clear error descriptions
  - Detailed failure reasons  
  - Actionable recovery suggestions
- Ownership errors now clearly distinguish from authentication errors

### Monitoring & Logging
- New `infrastructure(Error)` cases preserve underlying error information for debugging
- Error categorization improved with specific codes (OWNERSHIP_MISMATCH, CONFLICT, INFRASTRUCTURE_ERROR)
- Better error tracking and analytics capabilities

## Verification Steps

1. **Build Verification**: Ensure all packages compile after AppContainer integration
2. **Error Message Testing**: Verify `LocalizedError` messages appear correctly in UI
3. **Ownership Testing**: Test ownership validation with different user scenarios
4. **Infrastructure Error Testing**: Verify underlying errors are preserved and logged
5. **Cross-Platform Testing**: Ensure error handling consistency with TypeScript backend

## Performance Impact

### Positive Impacts
- Centralized ownership logic reduces code duplication across use cases
- Protocol-based design enables efficient testing and mocking
- Granular errors improve debugging capabilities and reduce troubleshooting time

### Considerations
- Additional async call for ownership validation (minimal overhead)
- Service instantiation overhead (mitigated by lazy loading in AppContainer)
- Repository dependency injection (follows established patterns)

## Migration Checklist

### Required Code Changes
- [ ] Update AppContainer.swift with OwnershipValidationService initialization
- [ ] Update use case initializations to include ownership service parameter  
- [ ] Update imports to include CoreDomain where needed
- [ ] Update tests to use mock ownership service

### Documentation Updates
- [ ] Update API documentation with new error types and codes
- [ ] Add ownership validation service usage examples to developer guide
- [ ] Document constructor signature changes in migration notes
- [ ] Update error handling patterns in coding standards

### Quality Assurance
- [ ] Unit tests pass with updated constructors
- [ ] Integration tests verify ownership validation works correctly
- [ ] Error messages display properly in UI
- [ ] Cross-platform error handling remains consistent
- [ ] Performance tests show no regression

This integration maintains clean architecture principles while providing enhanced error handling capabilities, centralized ownership validation, and improved user experience through better error messaging.