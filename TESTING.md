# BookTracker Testing Suite

## Overview

This document describes the comprehensive testing strategy and suite for the BookTracker application, following Clean Architecture testing best practices.

## Test Coverage Summary

### Completed (122 tests passing)

#### Domain Layer Tests ✅
- **Value Objects** (69 tests)
  - `GoalProgress` (33 tests) - Progress calculations, completion status, overdue detection
  - `ReadingStatus` (36 tests) - Status transitions, page validation, rating validation

- **Services** (53 tests)
  - `BookService` (28 tests) - Book operations, progress tracking, statistics
  - `GoalService` (25 tests) - Goal management, progress syncing, statistics

### Test Infrastructure

#### Testing Tools
- **Vitest 4.0.6** - Fast unit test framework with native TypeScript support
- **@testing-library/react** - Component testing utilities
- **@testing-library/user-event** - User interaction simulation
- **Happy-DOM** - Lightweight DOM implementation for testing
- **MSW (Mock Service Worker)** - API mocking
- **Faker.js** - Test data generation

#### Test Organization

```
/tests
├── setup.ts                          # Global test configuration
├── mocks/
│   ├── repositories.ts               # Repository mock factories
│   └── external-services.ts          # External service mocks
└── factories/
    └── index.ts                      # Test data factories

/domain
├── value-objects/__tests__/
│   ├── goal-progress.test.ts         # ✅ 33 passing tests
│   └── reading-status.test.ts        # ✅ 36 passing tests
└── services/__tests__/
    ├── book-service.test.ts          # ✅ 28 passing tests
    └── goal-service.test.ts          # ✅ 25 passing tests
```

## Test Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- book-service.test.ts

# Run tests for specific layer
npm test -- domain/
```

## Testing Patterns

### Domain Layer Testing

Domain layer tests focus on pure business logic with no external dependencies:

```typescript
// Example: Testing value objects
describe('GoalProgress', () => {
  it('should calculate progress percentage correctly', () => {
    const goal = createGoal({ currentBooks: 10, targetBooks: 24 });
    const progress = new GoalProgress(goal);

    expect(progress.getProgressPercentage()).toBe(42);
  });
});

// Example: Testing services with mocked repositories
describe('BookService', () => {
  let bookService: BookService;
  let mockBookRepository: IBookRepository;

  beforeEach(() => {
    mockBookRepository = createMockBookRepository();
    bookService = new BookService(mockBookRepository);
  });

  it('should update reading progress', async () => {
    const book = bookFactory({ status: 'reading' });
    setupBookRepositoryMocks(mockBookRepository, [book]);

    const result = await bookService.updateReadingProgress(
      book.id,
      book.userId,
      150
    );

    expect(result.currentPage).toBe(150);
  });
});
```

### AAA Pattern (Arrange, Act, Assert)

All tests follow the AAA pattern for clarity:

```typescript
it('should auto-complete goal when target reached', async () => {
  // Arrange
  const goal = goalFactory({ currentBooks: 0, targetBooks: 24 });
  const completedBooks = createBooks(24, { status: 'read' });
  setupGoalRepositoryMocks(mockGoalRepository, [goal]);
  setupBookRepositoryMocks(mockBookRepository, completedBooks);

  // Act
  const result = await goalService.syncGoalProgress(goal.id, userId);

  // Assert
  expect(result.completed).toBe(true);
  expect(result.currentBooks).toBe(24);
});
```

### Test Data Factories

Factories provide consistent, realistic test data:

```typescript
// Using factories
const user = userFactory();
const book = bookFactory({ userId: user.id, status: 'reading' });
const goal = goalFactory({ userId: user.id, targetBooks: 12 });

// Creating multiple items
const books = createBooks(5, { userId: user.id });

// Scenario factories
const { user, books, goals } = createCompleteUserScenario();
```

## Coverage Thresholds

The test suite enforces minimum coverage thresholds:

- **Domain Layer**: 90% (branches, functions, lines, statements)
- **Application Layer**: 85% (branches, functions, lines, statements)
- **Infrastructure Layer**: 75% (branches, functions, lines, statements)
- **Components**: 70% (branches, functions, lines, statements)

View coverage report:
```bash
npm run test:coverage
```

## Test Categories

### Unit Tests
Test individual units (functions, classes, value objects) in isolation:
- Domain value objects
- Domain services (with mocked dependencies)
- Pure utility functions

### Integration Tests (Planned)
Test multiple units working together:
- Application use cases with repository implementations
- API routes with database
- Component interactions

### Component Tests (Planned)
Test React components in isolation:
- Rendering with different props
- User interactions
- State management
- Accessibility

## Writing New Tests

### 1. Domain Layer Tests

When adding new domain logic:

```typescript
// domain/value-objects/__tests__/your-value-object.test.ts
import { describe, it, expect } from 'vitest';
import { YourValueObject } from '../your-value-object';

describe('YourValueObject', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });

    it('should handle edge case', () => {
      // Test edge cases
    });

    it('should throw error for invalid input', () => {
      expect(() => valueObject.method(invalid)).toThrow(ValidationError);
    });
  });
});
```

### 2. Service Tests with Mocks

```typescript
// domain/services/__tests__/your-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { YourService } from '../your-service';
import { createMockRepository } from '@/tests/mocks/repositories';

describe('YourService', () => {
  let service: YourService;
  let mockRepo: IRepository;

  beforeEach(() => {
    mockRepo = createMockRepository();
    service = new YourService(mockRepo);
  });

  it('should perform operation successfully', async () => {
    // Arrange
    setupRepositoryMocks(mockRepo, testData);

    // Act
    const result = await service.operation(params);

    // Assert
    expect(result).toEqual(expected);
    expect(mockRepo.method).toHaveBeenCalledWith(expectedArgs);
  });
});
```

## Best Practices

### ✅ DO:
- Test behavior, not implementation details
- Use descriptive test names that explain the expected behavior
- Follow AAA pattern consistently
- Mock at appropriate boundaries (repositories, external services)
- Test edge cases and error conditions
- Use factories for test data generation
- Keep tests independent and isolated

### ❌ DON'T:
- Test private methods directly
- Share mutable state between tests
- Hardcode test data when factories exist
- Skip error case testing
- Write tests dependent on execution order
- Mock everything (test real logic where appropriate)

## Continuous Integration

Tests run automatically on:
- Pre-commit hooks (optional)
- Pull requests
- Main branch commits

## Next Steps

### Remaining Test Implementation

1. **Application Layer Tests** (Highest Priority)
   - Use case tests with mocked repositories
   - Business rule validation
   - Error handling

2. **Infrastructure Tests**
   - Repository implementations with test database
   - External service integrations with MSW
   - Password hashing utilities

3. **API Route Tests**
   - Request/response handling
   - Authentication/authorization
   - Error responses

4. **Component Tests**
   - UI rendering
   - User interactions
   - State management

5. **End-to-End Tests** (Future)
   - Critical user workflows
   - Cross-layer integration

## Troubleshooting

### Common Issues

**Tests failing due to time-based logic:**
```typescript
vi.useFakeTimers();
vi.setSystemTime(new Date('2024-01-01'));
// ... test code ...
vi.useRealTimers(); // Cleanup in afterEach
```

**Mock not working as expected:**
```typescript
// Ensure you're using vi.mocked() for TypeScript
vi.mocked(mockRepo.method).mockResolvedValue(value);
```

**Coverage not meeting thresholds:**
- Check which lines aren't covered: `npm run test:coverage`
- Open `coverage/index.html` in browser for detailed report
- Add tests for uncovered branches

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Clean Architecture Testing Principles](https://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html)
- [Test Data Builders](https://www.jamesshore.com/v2/blog/2006/test-data-builders)

## Maintenance

### Updating Tests
- When refactoring code, update tests to match new behavior
- Keep test descriptions accurate
- Remove obsolete tests
- Update mocks when interfaces change

### Performance
- Run specific test files during development
- Use `--watch` mode for rapid feedback
- Parallelize tests (Vitest does this by default)
- Keep unit tests fast (< 100ms each)

---

**Last Updated:** November 2, 2025
**Test Suite Version:** 1.0.0
**Total Tests:** 122 passing
**Coverage:** Domain layer at 100%