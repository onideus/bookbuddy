# Developer Guide - BookTracker

## Quick Start

### Project Structure

```
repo/
├── app/                    # Next.js App Router
│   ├── actions/           # Server actions (UI layer)
│   ├── api/               # API routes (REST endpoints)
│   └── [pages]/           # Page components
├── application/           # Use cases (application logic)
│   └── use-cases/
├── domain/                # Business logic (core)
│   ├── entities/         # Business objects
│   ├── services/         # Domain services
│   ├── value-objects/    # Business rules
│   ├── interfaces/       # Contracts
│   └── errors/           # Domain errors
├── infrastructure/        # External concerns
│   ├── persistence/      # Data access
│   ├── external/         # APIs
│   └── security/         # Crypto
└── lib/
    └── di/              # Dependency injection
```

### Running the Application

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Adding New Features

### Example: Add "Book Notes" Feature

Follow these steps to maintain clean architecture:

#### 1. Create Domain Entity

```typescript
// domain/entities/book-note.ts
export interface BookNote {
  id: string;
  bookId: string;
  userId: string;
  content: string;
  page?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. Create Repository Interface

```typescript
// domain/interfaces/book-note-repository.ts
import { BookNote } from '../entities/book-note';

export interface IBookNoteRepository {
  findByBookId(bookId: string): Promise<BookNote[]>;
  findById(id: string): Promise<BookNote | undefined>;
  create(note: BookNote): Promise<BookNote>;
  update(id: string, updates: Partial<BookNote>): Promise<BookNote | null>;
  delete(id: string): Promise<boolean>;
}
```

#### 3. Implement Repository

```typescript
// infrastructure/persistence/memory/book-note-repository.ts
import { IBookNoteRepository } from '../../../domain/interfaces/book-note-repository';
import { BookNote } from '../../../domain/entities/book-note';
import { memoryDatabase } from './database';

// Add to database.ts first:
// notes: new Map<string, BookNote>(),

export class MemoryBookNoteRepository implements IBookNoteRepository {
  async findByBookId(bookId: string): Promise<BookNote[]> {
    return Array.from(memoryDatabase.notes.values())
      .filter(note => note.bookId === bookId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findById(id: string): Promise<BookNote | undefined> {
    return memoryDatabase.notes.get(id);
  }

  async create(note: BookNote): Promise<BookNote> {
    memoryDatabase.notes.set(note.id, note);
    return note;
  }

  async update(id: string, updates: Partial<BookNote>): Promise<BookNote | null> {
    const note = memoryDatabase.notes.get(id);
    if (!note) return null;

    const updated = { ...note, ...updates, updatedAt: new Date() };
    memoryDatabase.notes.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return memoryDatabase.notes.delete(id);
  }
}
```

#### 4. Add to DI Container

```typescript
// lib/di/container.ts
import { IBookNoteRepository } from '../../domain/interfaces/book-note-repository';
import { MemoryBookNoteRepository } from '../../infrastructure/persistence/memory/book-note-repository';

export class Container {
  private static bookNoteRepository: IBookNoteRepository;

  static getBookNoteRepository(): IBookNoteRepository {
    if (!this.bookNoteRepository) {
      this.bookNoteRepository = new MemoryBookNoteRepository();
    }
    return this.bookNoteRepository;
  }
}

export function createRequestContainer() {
  return {
    // ... existing
    bookNoteRepository: Container.getBookNoteRepository(),
  };
}
```

#### 5. Create Use Cases

```typescript
// application/use-cases/book-notes/add-note.ts
import { IBookNoteRepository } from '../../../domain/interfaces/book-note-repository';
import { IBookRepository } from '../../../domain/interfaces/book-repository';
import { BookNote } from '../../../domain/entities/book-note';
import { NotFoundError, UnauthorizedError } from '../../../domain/errors/domain-errors';
import { randomUUID } from 'crypto';

export interface AddBookNoteInput {
  bookId: string;
  userId: string;
  content: string;
  page?: number;
}

export class AddBookNoteUseCase {
  constructor(
    private bookNoteRepository: IBookNoteRepository,
    private bookRepository: IBookRepository
  ) {}

  async execute(input: AddBookNoteInput): Promise<BookNote> {
    // Verify book exists and user owns it
    const book = await this.bookRepository.findById(input.bookId);
    if (!book) {
      throw new NotFoundError('Book', input.bookId);
    }

    if (book.userId !== input.userId) {
      throw new UnauthorizedError('You do not own this book');
    }

    const note: BookNote = {
      id: randomUUID(),
      bookId: input.bookId,
      userId: input.userId,
      content: input.content,
      page: input.page,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.bookNoteRepository.create(note);
  }
}
```

```typescript
// application/use-cases/book-notes/get-book-notes.ts
import { IBookNoteRepository } from '../../../domain/interfaces/book-note-repository';
import { IBookRepository } from '../../../domain/interfaces/book-repository';
import { BookNote } from '../../../domain/entities/book-note';
import { NotFoundError, UnauthorizedError } from '../../../domain/errors/domain-errors';

export interface GetBookNotesInput {
  bookId: string;
  userId: string;
}

export class GetBookNotesUseCase {
  constructor(
    private bookNoteRepository: IBookNoteRepository,
    private bookRepository: IBookRepository
  ) {}

  async execute(input: GetBookNotesInput): Promise<BookNote[]> {
    // Verify book exists and user owns it
    const book = await this.bookRepository.findById(input.bookId);
    if (!book) {
      throw new NotFoundError('Book', input.bookId);
    }

    if (book.userId !== input.userId) {
      throw new UnauthorizedError('You do not own this book');
    }

    return this.bookNoteRepository.findByBookId(input.bookId);
  }
}
```

#### 6. Create Server Actions

```typescript
// app/actions/book-note-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Container } from '@/lib/di/container';
import { AddBookNoteUseCase } from '@/application/use-cases/book-notes/add-note';
import { GetBookNotesUseCase } from '@/application/use-cases/book-notes/get-book-notes';
import { BookNote } from '@/domain/entities/book-note';
import {
  NotFoundError,
  UnauthorizedError,
} from '@/domain/errors/domain-errors';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getBookNotesAction(
  bookId: string
): Promise<ActionResult<BookNote[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const bookNoteRepository = Container.getBookNoteRepository();
    const bookRepository = Container.getBookRepository();
    const useCase = new GetBookNotesUseCase(bookNoteRepository, bookRepository);

    const notes = await useCase.execute({
      bookId,
      userId: session.user.id,
    });

    return { success: true, data: notes };
  } catch (error) {
    console.error('Error fetching book notes:', error);

    if (error instanceof NotFoundError) {
      return { success: false, error: 'Book not found' };
    }

    if (error instanceof UnauthorizedError) {
      return { success: false, error: 'You do not own this book' };
    }

    return { success: false, error: 'Failed to fetch notes' };
  }
}

export async function addBookNoteAction(
  bookId: string,
  content: string,
  page?: number
): Promise<ActionResult<BookNote>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const bookNoteRepository = Container.getBookNoteRepository();
    const bookRepository = Container.getBookRepository();
    const useCase = new AddBookNoteUseCase(bookNoteRepository, bookRepository);

    const note = await useCase.execute({
      bookId,
      userId: session.user.id,
      content,
      page,
    });

    revalidatePath(`/books/${bookId}`);

    return { success: true, data: note };
  } catch (error) {
    console.error('Error adding book note:', error);

    if (error instanceof NotFoundError) {
      return { success: false, error: 'Book not found' };
    }

    if (error instanceof UnauthorizedError) {
      return { success: false, error: 'You do not own this book' };
    }

    return { success: false, error: 'Failed to add note' };
  }
}
```

#### 7. Use in UI

```typescript
// app/books/[id]/page.tsx (simplified example)
'use client';

import { useState, useEffect } from 'react';
import { getBookNotesAction, addBookNoteAction } from '@/app/actions/book-note-actions';

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    const result = await getBookNotesAction(params.id);
    if (result.success) {
      setNotes(result.data);
    }
  }

  async function handleAddNote() {
    const result = await addBookNoteAction(params.id, content);
    if (result.success) {
      setContent('');
      await loadNotes();
    }
  }

  return (
    <div>
      {/* Book details... */}

      <div>
        <h2>Notes</h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
        />
        <button onClick={handleAddNote}>Add Note</button>

        <div>
          {notes.map((note) => (
            <div key={note.id}>
              <p>{note.content}</p>
              {note.page && <span>Page {note.page}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Design Patterns Cheat Sheet

### When to Use Each Pattern

**Repository Pattern**:
- ✅ Data access operations
- ✅ When you need to abstract storage
- ❌ Simple in-memory caching

**Use Case Pattern**:
- ✅ Feature-specific business logic
- ✅ Orchestrating multiple services/repositories
- ❌ Simple CRUD with no logic

**Value Object Pattern**:
- ✅ Encapsulating business rules
- ✅ Calculation logic
- ✅ Validation logic
- ❌ Simple data structures

**Service Pattern**:
- ✅ Domain logic spanning multiple entities
- ✅ Complex operations
- ❌ Simple entity methods

## Testing Examples

### Unit Test - Value Object

```typescript
// domain/value-objects/__tests__/reading-status.test.ts
import { ReadingStatus } from '../reading-status';
import { Book } from '../../entities/book';
import { ValidationError } from '../../errors/domain-errors';

describe('ReadingStatus', () => {
  const mockBook: Book = {
    id: '1',
    userId: 'user1',
    googleBooksId: 'abc',
    title: 'Test Book',
    authors: ['Author'],
    status: 'reading',
    pageCount: 300,
    currentPage: 150,
    addedAt: new Date(),
  };

  describe('getReadingProgress', () => {
    it('calculates progress correctly', () => {
      const status = new ReadingStatus(mockBook);
      expect(status.getReadingProgress()).toBe(50);
    });

    it('returns 0 when no page count', () => {
      const book = { ...mockBook, pageCount: undefined };
      const status = new ReadingStatus(book);
      expect(status.getReadingProgress()).toBe(0);
    });
  });

  describe('validatePageProgress', () => {
    it('throws when page exceeds total', () => {
      const status = new ReadingStatus(mockBook);
      expect(() => status.validatePageProgress(400)).toThrow(ValidationError);
    });

    it('allows valid page number', () => {
      const status = new ReadingStatus(mockBook);
      expect(() => status.validatePageProgress(200)).not.toThrow();
    });
  });

  describe('shouldAutoMarkAsRead', () => {
    it('returns true when current page equals total', () => {
      const book = { ...mockBook, currentPage: 300 };
      const status = new ReadingStatus(book);
      expect(status.shouldAutoMarkAsRead()).toBe(true);
    });

    it('returns false when not finished', () => {
      const status = new ReadingStatus(mockBook);
      expect(status.shouldAutoMarkAsRead()).toBe(false);
    });
  });
});
```

### Unit Test - Service with Mocks

```typescript
// domain/services/__tests__/book-service.test.ts
import { BookService } from '../book-service';
import { IBookRepository } from '../../interfaces/book-repository';
import { Book } from '../../entities/book';
import { NotFoundError, ValidationError } from '../../errors/domain-errors';

describe('BookService', () => {
  let mockRepository: jest.Mocked<IBookRepository>;
  let service: BookService;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findByStatus: jest.fn(),
    };
    service = new BookService(mockRepository);
  });

  describe('updateReadingProgress', () => {
    const mockBook: Book = {
      id: '1',
      userId: 'user1',
      googleBooksId: 'abc',
      title: 'Test',
      authors: [],
      status: 'reading',
      pageCount: 300,
      currentPage: 100,
      addedAt: new Date(),
    };

    it('updates progress successfully', async () => {
      mockRepository.findById.mockResolvedValue(mockBook);
      mockRepository.update.mockResolvedValue({ ...mockBook, currentPage: 200 });

      const result = await service.updateReadingProgress('1', 'user1', 200);

      expect(result.currentPage).toBe(200);
      expect(mockRepository.update).toHaveBeenCalledWith('1', { currentPage: 200 });
    });

    it('throws NotFoundError when book not found', async () => {
      mockRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.updateReadingProgress('1', 'user1', 200)
      ).rejects.toThrow(NotFoundError);
    });

    it('validates page exceeds total', async () => {
      mockRepository.findById.mockResolvedValue(mockBook);

      await expect(
        service.updateReadingProgress('1', 'user1', 500)
      ).rejects.toThrow(ValidationError);
    });

    it('auto-marks as read when completed', async () => {
      mockRepository.findById.mockResolvedValue(mockBook);
      mockRepository.update.mockResolvedValue({
        ...mockBook,
        currentPage: 300,
        status: 'read',
        finishedAt: expect.any(Date),
      });

      await service.updateReadingProgress('1', 'user1', 300);

      expect(mockRepository.update).toHaveBeenCalledWith('1',
        expect.objectContaining({
          currentPage: 300,
          status: 'read',
          finishedAt: expect.any(Date),
        })
      );
    });
  });
});
```

### Integration Test - API Route

```typescript
// app/api/books/__tests__/route.test.ts
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';

jest.mock('next-auth');

describe('GET /api/books', () => {
  it('returns books for authenticated user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user1' },
    });

    const request = new Request('http://localhost/api/books');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.books).toBeInstanceOf(Array);
  });

  it('returns 401 for unauthenticated user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new Request('http://localhost/api/books');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
```

## Common Patterns

### Error Handling

```typescript
// In use cases
if (!entity) {
  throw new NotFoundError('Entity', id);
}

if (entity.userId !== userId) {
  throw new UnauthorizedError('You do not own this entity');
}

if (invalidCondition) {
  throw new ValidationError('Invalid input');
}

// In server actions
try {
  const result = await useCase.execute(input);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof NotFoundError) {
    return { success: false, error: error.message };
  }
  // ... handle other errors
  return { success: false, error: 'Unknown error' };
}
```

### Dependency Resolution

```typescript
// Always resolve from container
const repository = Container.getBookRepository();
const service = Container.getBookService();

// Create use case with dependencies
const useCase = new SomeUseCase(repository, service);

// Execute
const result = await useCase.execute(input);
```

### Revalidation

```typescript
// After mutations, revalidate affected paths
await useCase.execute(input);

revalidatePath('/books');        // Specific path
revalidatePath('/dashboard');    // Related paths
revalidatePath('/books', 'page'); // Page only (not layout)
```

## Best Practices

### ✅ DO

- Keep use cases focused on single features
- Validate in domain layer (value objects/services)
- Use dependency injection via constructor
- Return domain errors, not strings
- Revalidate paths after mutations
- Write tests for business logic first
- Document complex business rules

### ❌ DON'T

- Mix business logic with HTTP concerns
- Access database directly from UI
- Skip validation in domain layer
- Use generic error messages
- Forget to revalidate cache
- Test implementation details
- Hardcode dependencies

## Troubleshooting

### Issue: "Repository not found"

**Problem**: Container not initializing repository

**Solution**:
```typescript
// Ensure container has getter method
static getMyRepository(): IMyRepository {
  if (!this.myRepository) {
    this.myRepository = new MemoryMyRepository();
  }
  return this.myRepository;
}
```

### Issue: "Type mismatch in use case"

**Problem**: DTO types don't match entity types

**Solution**:
```typescript
// Define separate input/output types
export interface AddBookInput {
  // Required fields only
  userId: string;
  title: string;
}

export class AddBookUseCase {
  async execute(input: AddBookInput): Promise<Book> {
    // Map input to entity
    const book: Book = {
      id: randomUUID(),
      ...input,
      addedAt: new Date(),
    };
    return this.repository.create(book);
  }
}
```

### Issue: "Validation not working"

**Problem**: Validation in wrong layer

**Solution**:
```typescript
// ✅ Validate in domain layer
export class ReadingStatus {
  validatePageProgress(currentPage: number): void {
    if (currentPage < 0) {
      throw new ValidationError('Page cannot be negative');
    }
  }
}

// ❌ Don't validate in API route
export async function POST(request: Request) {
  if (currentPage < 0) {  // Wrong layer!
    return NextResponse.json({ error: 'Invalid' });
  }
}
```

## Resources

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture documentation
- [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - Refactoring history
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

---

## Related Documentation

- **[README.md](./README.md)** - Quick start and features overview
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture and design patterns  
- **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - Refactoring history and achievements
