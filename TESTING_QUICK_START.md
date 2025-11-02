# Testing Quick Start Guide

## Running Tests

```bash
# Run all tests
npm test

# Run tests for specific layer
npm test -- domain/
npm test -- application/
npm test -- infrastructure/

# Run specific test file
npm test -- book-service.test.ts

# Run tests in watch mode (automatically re-run on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Open coverage report in browser
open coverage/index.html

# Run tests with interactive UI
npm run test:ui
```

## Writing a New Test

### 1. Create test file next to the source file

```
domain/
├── services/
│   ├── book-service.ts
│   └── __tests__/
│       └── book-service.test.ts
```

### 2. Basic test structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourClass } from '../your-class';

describe('YourClass', () => {
  beforeEach(() => {
    // Setup code that runs before each test
  });

  describe('methodName', () => {
    it('should do the expected thing', () => {
      // Arrange - Set up test data and dependencies
      const input = 'test data';

      // Act - Execute the code being tested
      const result = yourClass.method(input);

      // Assert - Verify the result
      expect(result).toBe('expected output');
    });
  });
});
```

### 3. Using test utilities

```typescript
import { userFactory, bookFactory, createBooks } from '@/tests/factories';
import { createMockBookRepository } from '@/tests/mocks/repositories';

// Create test data
const user = userFactory();
const book = bookFactory({ userId: user.id });
const books = createBooks(5);

// Create mocks
const mockRepo = createMockBookRepository();
vi.mocked(mockRepo.findById).mockResolvedValue(book);
```

## Common Test Patterns

### Testing async functions

```typescript
it('should handle async operations', async () => {
  const result = await service.asyncMethod();
  expect(result).toBe(expected);
});
```

### Testing error handling

```typescript
it('should throw error for invalid input', () => {
  expect(() => service.method(invalid)).toThrow(ValidationError);
  expect(() => service.method(invalid)).toThrow('Expected error message');
});

it('should reject promise for async errors', async () => {
  await expect(service.asyncMethod(invalid)).rejects.toThrow(ValidationError);
});
```

### Testing with mocked dependencies

```typescript
it('should call repository with correct parameters', async () => {
  const mockRepo = createMockBookRepository();
  const service = new BookService(mockRepo);

  await service.addBook(data);

  expect(mockRepo.create).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Test' })
  );
  expect(mockRepo.create).toHaveBeenCalledTimes(1);
});
```

### Testing with fake timers

```typescript
it('should handle time-based logic', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-01'));

  const result = service.timeBasedMethod();

  expect(result).toBe(expected);

  vi.useRealTimers(); // Clean up
});
```

## Test Organization Best Practices

### Group related tests

```typescript
describe('BookService', () => {
  describe('addBook', () => {
    it('should add book successfully', () => { /*...*/ });
    it('should throw error for duplicate', () => { /*...*/ });
  });

  describe('updateBook', () => {
    it('should update book successfully', () => { /*...*/ });
    it('should throw error for not found', () => { /*...*/ });
  });
});
```

### Use descriptive test names

```typescript
// ✅ Good
it('should return 404 when book not found')
it('should auto-complete goal when target reached')

// ❌ Bad
it('works')
it('test update')
```

### Keep tests independent

```typescript
// Each test should work in isolation
describe('BookService', () => {
  beforeEach(() => {
    // Fresh setup for each test
    mockRepo = createMockBookRepository();
    service = new BookService(mockRepo);
  });

  it('test 1', () => { /*...*/ });
  it('test 2', () => { /*...*/ }); // Should not depend on test 1
});
```

## Debugging Tests

### Run single test

```bash
# Run only tests matching a pattern
npm test -- -t "should add book"

# Run specific file
npm test -- book-service.test.ts
```

### Use console.log

```typescript
it('debugging test', () => {
  const result = service.method();
  console.log('Result:', result); // Will show in test output
  expect(result).toBe(expected);
});
```

### Use test.only/test.skip

```typescript
// Run only this test (useful for debugging)
it.only('should add book', () => { /*...*/ });

// Skip this test
it.skip('should update book', () => { /*...*/ });
```

## Coverage Reports

### View coverage

```bash
# Generate and view coverage
npm run test:coverage

# Open HTML coverage report
open coverage/index.html
```

### Understanding coverage

- **Statements:** % of code statements executed
- **Branches:** % of if/else branches tested
- **Functions:** % of functions called
- **Lines:** % of lines executed

### Coverage targets

- Domain layer: 90%+
- Application layer: 85%+
- Infrastructure layer: 75%+
- Components: 70%+

## Common Issues

### Mock not working

```typescript
// ❌ Wrong
mockRepo.findById.mockResolvedValue(book);

// ✅ Correct
vi.mocked(mockRepo.findById).mockResolvedValue(book);
```

### Test timeout

```typescript
// Increase timeout for slow tests
it('slow test', async () => {
  // Test code
}, 10000); // 10 second timeout
```

### Fake timers not working

```typescript
// Remember to clean up
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers(); // Important!
});
```

## Useful Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Project TESTING.md](./TESTING.md) - Comprehensive guide

## Quick Commands

```bash
# Most common commands
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
npm test -- domain/         # Test specific directory
npm test -- -t "pattern"    # Test matching pattern
```