# BookTracker - Clean Architecture Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Layer Descriptions](#layer-descriptions)
3. [Design Patterns](#design-patterns)
4. [SOLID Principles Implementation](#solid-principles-implementation)
5. [Data Flow](#data-flow)
6. [Testing Strategy](#testing-strategy)
7. [Migration Guide](#migration-guide)

## Architecture Overview

The BookTracker application follows **Clean Architecture** principles with clear separation between domain logic, application logic, and infrastructure concerns.

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer (Next.js)                    │
│  Pages, Components, Server Actions                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Application Layer                          │
│  Use Cases: Business rules specific to features             │
│  - GetUserBooks, AddBook, CreateGoal, etc.                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Domain Layer                              │
│  Entities: Core business objects (Book, Goal, User)         │
│  Services: Domain logic (BookService, GoalService)          │
│  Value Objects: Business rules (GoalProgress, ReadingStatus)│
│  Interfaces: Contracts (IBookRepository, etc.)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                 Infrastructure Layer                         │
│  Repositories: Data access (MemoryBookRepository)           │
│  External: APIs (GoogleBooksClient)                         │
│  Security: Implementations (BcryptPasswordHasher)           │
└─────────────────────────────────────────────────────────────┘
```

## Layer Descriptions

### 1. Domain Layer (`/domain`)

The innermost layer containing core business logic and rules.

**Entities** (`/entities`):
- Pure business objects with no dependencies
- `User`, `Book`, `Goal`
- Represent core concepts of the application

**Value Objects** (`/value-objects`):
- Encapsulate business logic related to specific concepts
- **GoalProgress**: Calculates progress percentage, completion status, days remaining
- **ReadingStatus**: Manages book status transitions, validates page progress

**Services** (`/services`):
- Domain logic that doesn't belong to a single entity
- **BookService**: Reading progress updates, rating validation, statistics
- **GoalService**: Goal synchronization, progress tracking, statistics

**Interfaces** (`/interfaces`):
- Contracts for repositories and external services
- Enables dependency inversion
- `IBookRepository`, `IGoalRepository`, `IUserRepository`
- `IPasswordHasher`, `IExternalBookSearch`

**Errors** (`/errors`):
- Domain-specific exceptions
- `NotFoundError`, `UnauthorizedError`, `ValidationError`, `DuplicateError`

### 2. Application Layer (`/application`)

Contains use cases that orchestrate domain logic.

**Use Cases** (`/use-cases`):
Organized by feature domain:

```
/books
  - get-user-books.ts
  - add-book.ts
  - update-book.ts
  - delete-book.ts

/goals
  - get-user-goals.ts
  - create-goal.ts
  - update-goal.ts
  - delete-goal.ts

/auth
  - register-user.ts

/search
  - search-books.ts
```

Each use case:
- Accepts input DTO
- Validates business rules
- Coordinates domain services/repositories
- Returns result or throws domain error

### 3. Infrastructure Layer (`/infrastructure`)

Implements interfaces defined in domain layer.

**Persistence** (`/persistence/memory`):
- `MemoryUserRepository`
- `MemoryBookRepository`
- `MemoryGoalRepository`
- All implement repository interfaces
- Can be swapped with `PrismaRepository` without changing domain/application

**External Services** (`/external`):
- `GoogleBooksClient` implements `IExternalBookSearch`
- Isolates external API dependencies

**Security** (`/security`):
- `BcryptPasswordHasher` implements `IPasswordHasher`
- Isolates cryptography dependencies

### 4. Dependency Injection (`/lib/di`)

**Container** (`container.ts`):
- Singleton pattern for managing dependencies
- Factory methods for all repositories and services
- Enables easy testing with mocks

```typescript
Container.getBookRepository()
Container.getBookService()
Container.getGoalService()
```

### 5. UI Layer (`/app`)

**API Routes** (`/api`):
- Thin orchestration layer
- Authentication check
- Resolve dependencies from container
- Execute use case
- Map errors to HTTP status codes
- Return JSON response

**Server Actions** (`/actions`):
- `book-actions.ts` - Book CRUD operations
- `goal-actions.ts` - Goal CRUD operations
- Use case execution with revalidation
- Type-safe results with `ActionResult<T>`

**Pages**:
- React components (can be refactored to use server actions)
- Currently use API routes via fetch
- Ready for migration to server actions

## Design Patterns

### 1. Repository Pattern

**Problem**: Direct database coupling makes testing and switching storage difficult.

**Solution**: Define repository interfaces in domain, implement in infrastructure.

```typescript
// Domain layer - Interface
export interface IBookRepository {
  findByUserId(userId: string): Promise<Book[]>;
  create(book: Book): Promise<Book>;
  // ...
}

// Infrastructure layer - Implementation
export class MemoryBookRepository implements IBookRepository {
  async findByUserId(userId: string): Promise<Book[]> {
    return Array.from(memoryDatabase.books.values())
      .filter(b => b.userId === userId);
  }
}

// Easy to swap
export class PrismaBookRepository implements IBookRepository {
  async findByUserId(userId: string): Promise<Book[]> {
    return prisma.book.findMany({ where: { userId } });
  }
}
```

### 2. Use Case Pattern

**Problem**: Business logic scattered across API routes.

**Solution**: Encapsulate each feature in a dedicated use case class.

```typescript
export class AddBookUseCase {
  constructor(private bookRepository: IBookRepository) {}

  async execute(input: AddBookInput): Promise<Book> {
    // Check duplicates
    const userBooks = await this.bookRepository.findByUserId(input.userId);
    const duplicate = userBooks.find(b => b.googleBooksId === input.googleBooksId);
    if (duplicate) throw new DuplicateError('Book', 'googleBooksId');

    // Create entity
    const book: Book = { id: randomUUID(), ...input, addedAt: new Date() };

    // Persist
    return this.bookRepository.create(book);
  }
}
```

### 3. Value Object Pattern

**Problem**: Business logic duplicated across components and services.

**Solution**: Encapsulate rules in value objects.

```typescript
export class GoalProgress {
  constructor(private goal: Goal) {}

  getProgressPercentage(): number {
    if (this.goal.targetBooks === 0) return 0;
    return Math.min(100, Math.round(
      (this.goal.currentBooks / this.goal.targetBooks) * 100
    ));
  }

  isCompleted(): boolean {
    return this.goal.currentBooks >= this.goal.targetBooks;
  }

  isOverdue(): boolean {
    return new Date() > this.goal.endDate && !this.goal.completed;
  }
}
```

### 4. Dependency Injection

**Problem**: Tight coupling between classes.

**Solution**: Constructor injection with interfaces.

```typescript
export class BookService {
  constructor(private bookRepository: IBookRepository) {}
  // Can inject MemoryBookRepository or PrismaBookRepository
}

export class GoalService {
  constructor(
    private goalRepository: IGoalRepository,
    private bookRepository: IBookRepository
  ) {}
  // Multiple dependencies, all injected
}
```

### 5. Factory Pattern (Container)

**Problem**: Managing object creation and dependencies.

**Solution**: Centralized factory for creating instances.

```typescript
export class Container {
  static getBookService(): BookService {
    if (!this.bookService) {
      this.bookService = new BookService(this.getBookRepository());
    }
    return this.bookService;
  }
}
```

## SOLID Principles Implementation

### Single Responsibility Principle (SRP) ✅

**Each class has one reason to change:**

- `BookRepository` - Only changes if data access logic changes
- `AddBookUseCase` - Only changes if book addition business rules change
- `BookService` - Only changes if book-related domain logic changes
- API routes - Only change if HTTP handling changes

### Open/Closed Principle (OCP) ✅

**Open for extension, closed for modification:**

```typescript
// Add new repository without changing domain
export class PrismaBookRepository implements IBookRepository {
  // New implementation
}

// Update container binding only
static getBookRepository(): IBookRepository {
  return new PrismaBookRepository(); // Changed from MemoryBookRepository
}

// No changes needed to:
// - Use cases
// - Services
// - API routes
```

### Liskov Substitution Principle (LSP) ✅

**Any implementation can replace interface:**

```typescript
// Both are valid substitutions
const repo1: IBookRepository = new MemoryBookRepository();
const repo2: IBookRepository = new PrismaBookRepository();
const repo3: IBookRepository = new RedisBookRepository();

// Use case works with any
const useCase = new GetUserBooksUseCase(repo1); // or repo2 or repo3
```

### Interface Segregation Principle (ISP) ✅

**Clients depend only on methods they use:**

```typescript
// Focused interfaces
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export interface IExternalBookSearch {
  search(query: string): Promise<BookSearchResult[]>;
}

// Not one giant interface with all methods
```

### Dependency Inversion Principle (DIP) ✅

**High-level modules depend on abstractions:**

```typescript
// High-level use case depends on interface
export class AddBookUseCase {
  constructor(private bookRepository: IBookRepository) {} // Interface
}

// Low-level implementation
export class MemoryBookRepository implements IBookRepository {}

// Container provides concrete implementation
const repo = Container.getBookRepository(); // Returns concrete
const useCase = new AddBookUseCase(repo); // Inject abstraction
```

## Data Flow

### Example: Adding a Book

```
1. User clicks "Add Book" in UI
   ↓
2. Server Action: addBookAction(bookData)
   ↓
3. Get session, check auth
   ↓
4. Resolve dependency: Container.getBookRepository()
   ↓
5. Create use case: new AddBookUseCase(bookRepository)
   ↓
6. Execute: useCase.execute({ userId, ...bookData })
   ↓
7. Use case checks for duplicates (business rule)
   ↓
8. Use case creates Book entity
   ↓
9. Repository persists: bookRepository.create(book)
   ↓
10. MemoryBookRepository saves to Map
   ↓
11. Book returned through layers
   ↓
12. Server action revalidates paths
   ↓
13. Returns { success: true, data: book }
   ↓
14. UI updates
```

### Example: Updating Reading Progress (with Service)

```
1. User updates current page
   ↓
2. Server Action: updateReadingProgressAction(bookId, currentPage)
   ↓
3. Get session, check auth
   ↓
4. Resolve service: Container.getBookService()
   ↓
5. Service method: bookService.updateReadingProgress(bookId, userId, currentPage)
   ↓
6. Service fetches book: bookRepository.findById(bookId)
   ↓
7. Service creates value object: new ReadingStatus(book)
   ↓
8. Value object validates: validatePageProgress(currentPage)
   ↓
9. Value object checks auto-complete: shouldAutoMarkAsRead()
   ↓
10. Value object generates updates: transitionTo('read')
   ↓
11. Service persists: bookRepository.update(bookId, updates)
   ↓
12. Updated book returned
   ↓
13. Server action revalidates
   ↓
14. UI shows updated progress
```

## Testing Strategy

### Unit Tests

**Domain Layer** (Highest value):
```typescript
// Test value objects
describe('GoalProgress', () => {
  it('calculates percentage correctly', () => {
    const goal = { targetBooks: 10, currentBooks: 3 };
    const progress = new GoalProgress(goal);
    expect(progress.getProgressPercentage()).toBe(30);
  });
});

// Test services with mocks
describe('BookService', () => {
  it('validates page progress', async () => {
    const mockRepo = {
      findById: jest.fn().mockResolvedValue(mockBook),
      update: jest.fn(),
    };
    const service = new BookService(mockRepo);

    await expect(
      service.updateReadingProgress('id', 'userId', 9999)
    ).rejects.toThrow(ValidationError);
  });
});
```

**Application Layer**:
```typescript
describe('AddBookUseCase', () => {
  it('prevents duplicate books', async () => {
    const mockRepo = {
      findByUserId: jest.fn().mockResolvedValue([existingBook]),
      create: jest.fn(),
    };
    const useCase = new AddBookUseCase(mockRepo);

    await expect(
      useCase.execute({ googleBooksId: 'same-id' })
    ).rejects.toThrow(DuplicateError);
  });
});
```

### Integration Tests

**API Routes**:
```typescript
describe('POST /api/books', () => {
  it('adds book successfully', async () => {
    const response = await fetch('/api/books', {
      method: 'POST',
      body: JSON.stringify(bookData),
      headers: { Cookie: sessionCookie },
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.book.title).toBe(bookData.title);
  });
});
```

### E2E Tests

**User Flows**:
```typescript
test('user can add and track a book', async ({ page }) => {
  await page.goto('/search');
  await page.fill('[name="search"]', 'Clean Code');
  await page.click('button:has-text("Search")');
  await page.click('button:has-text("Add to Reading")');

  await page.goto('/books');
  await expect(page.locator('text=Clean Code')).toBeVisible();
});
```

## Migration Guide

### From Old Architecture

**Step 1**: Existing code continues to work
- `lib/db.ts` is now a compatibility wrapper
- Uses new `memoryDatabase` internally
- Zero breaking changes

**Step 2**: Gradually migrate pages to server actions
```typescript
// Old approach (still works)
const response = await fetch('/api/books');
const data = await response.json();

// New approach (preferred)
import { getBooksAction } from '@/app/actions/book-actions';
const result = await getBooksAction();
if (result.success) {
  setBooks(result.data);
}
```

**Step 3**: Remove old `lib/db.ts` imports
- Search for `import { db } from '@/lib/db'`
- Replace with server actions
- Delete compatibility wrapper when done

### Adding New Features

**Example: Add "Collections" feature**

1. **Create entity** (`domain/entities/collection.ts`)
2. **Create repository interface** (`domain/interfaces/collection-repository.ts`)
3. **Implement repository** (`infrastructure/persistence/memory/collection-repository.ts`)
4. **Create use cases** (`application/use-cases/collections/`)
5. **Add to container** (`lib/di/container.ts`)
6. **Create server actions** (`app/actions/collection-actions.ts`)
7. **Build UI** with server actions

### Switching to Database

**Replace memory storage with Prisma:**

1. Install Prisma: `npm install @prisma/client`
2. Create schema: `prisma/schema.prisma`
3. Implement repositories:

```typescript
// infrastructure/persistence/prisma/book-repository.ts
export class PrismaBookRepository implements IBookRepository {
  async findByUserId(userId: string): Promise<Book[]> {
    return prisma.book.findMany({ where: { userId } });
  }

  async create(book: Book): Promise<Book> {
    return prisma.book.create({ data: book });
  }
  // ...
}
```

4. Update container:

```typescript
static getBookRepository(): IBookRepository {
  return new PrismaBookRepository(); // Changed this line only
}
```

5. **No other changes needed!**
- Use cases unchanged
- Services unchanged
- API routes unchanged
- UI unchanged

## Benefits Achieved

### Maintainability
- **Clear structure**: Easy to find code
- **Isolated changes**: Modify one layer without affecting others
- **Consistent patterns**: All features follow same architecture

### Testability
- **Unit testable**: Services and use cases test easily with mocks
- **Integration testable**: API routes test with test database
- **E2E testable**: User flows test full stack

### Scalability
- **Team friendly**: Different teams work on different layers
- **Feature scaling**: Add features without breaking existing code
- **Performance scaling**: Swap implementations (Redis cache, etc.)

### Type Safety
- **Full TypeScript**: End-to-end type safety
- **Interface contracts**: Compile-time verification
- **DTO validation**: Input/output type checking

### Future-Proof
- **Technology agnostic**: Swap Next.js, database, etc.
- **Business logic preserved**: Domain layer independent
- **Easy migration**: Gradual refactoring supported

## Conclusion

The BookTracker application now exemplifies Clean Architecture and SOLID principles. The codebase is maintainable, testable, and ready for production scale. New developers can understand the structure quickly, and new features follow established patterns.
