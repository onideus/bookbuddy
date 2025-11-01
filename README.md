# BookTracker

A modern, mobile-friendly book tracking application built with Next.js that helps you manage your reading journey.

## Features

- **User Authentication**: Secure login and registration system
- **Book Management**: Track books you want to read, are currently reading, or have finished
- **Google Books Integration**: Search and add books using the Google Books API
- **Reading Progress**: Track your progress with easy-to-read progress bars
- **Reading Goals**: Create and monitor reading goals with visual progress tracking
- **Mobile Responsive**: Fully optimized for mobile devices
- **Dark Mode**: Built-in dark mode support

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd repo
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Edit the `.env` file and update the following variables:

```env
# NextAuth Secret - Generate a secure random string
NEXTAUTH_SECRET=your-secret-key-change-this-in-production

# NextAuth URL - Your app's URL
NEXTAUTH_URL=http://localhost:3000

# Google Books API Key (Optional but recommended)
NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY=your-google-books-api-key
```

To get a Google Books API key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Books API"
4. Create credentials (API Key)
5. Copy the API key to your `.env` file

### Running the Application

Development mode:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

Production build:
```bash
npm run build
npm start
```

## Usage

### First Time Setup

1. Navigate to `http://localhost:3000`
2. Click "Sign up" to create a new account
3. Fill in your name, email, and password
4. Log in with your credentials

### Adding Books

1. Navigate to the "Search" page
2. Search for books by title, author, or ISBN
3. Click one of the action buttons to add a book:
   - "Want to Read" - Books you plan to read
   - "Reading" - Books you're currently reading
   - "Read" - Books you've finished

### Managing Books

1. Go to "My Books" to see all your books
2. Filter by status using the tabs
3. For books you're reading:
   - Click "Update" to track your progress
   - Enter your current page number
4. For books you've finished:
   - Rate them using the star rating system
5. Change book status using the dropdown
6. Delete books using the trash icon

### Creating Goals

1. Navigate to the "Goals" page
2. Click "New Goal"
3. Fill in the goal details:
   - Title (e.g., "Read 12 books this year")
   - Description (optional)
   - Target number of books
   - Start and end dates
4. Track progress with visual progress bars

### Dashboard

The dashboard provides an overview of:
- Total books in your library
- Books currently reading
- Books you've finished
- Active goals
- Quick access to currently reading books
- Goal progress

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Authentication**: NextAuth.js with credentials provider
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **API**: Google Books API
- **Language**: TypeScript
- **Password Hashing**: bcryptjs

## Architecture

This application has been refactored to follow **Clean Architecture** and **SOLID principles**. It demonstrates professional software engineering practices with clear separation of concerns.

### 🏗️ Clean Architecture Layers

```
┌─────────────────────────────────────┐
│     UI Layer (Next.js Pages)        │  ← User Interface
├─────────────────────────────────────┤
│  Application Layer (Use Cases)      │  ← Business Logic
├─────────────────────────────────────┤
│  Domain Layer (Entities, Services)  │  ← Core Business Rules
├─────────────────────────────────────┤
│  Infrastructure (Repositories, API) │  ← External Concerns
└─────────────────────────────────────┘
```

### ✅ SOLID Principles

- **S**ingle Responsibility: Each class has one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Implementations are interchangeable
- **I**nterface Segregation: Focused, specific interfaces
- **D**ependency Inversion: Depend on abstractions, not concretions

### 📚 Documentation

Comprehensive documentation available:

- **[FINAL_SUMMARY.md](./FINAL_SUMMARY.md)** - Complete refactoring overview
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture guide
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - How to add features
- **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - Refactoring history

## Database

Currently uses an in-memory database for demo purposes. Thanks to the repository pattern, you can easily swap to a real database by implementing new repositories:

**To switch to PostgreSQL with Prisma:**
1. Implement `PrismaBookRepository` implementing `IBookRepository`
2. Update `lib/di/container.ts` bindings
3. **No other changes needed!** Use cases, services, and UI remain unchanged.

Supported databases:
- PostgreSQL with Prisma
- MongoDB with Mongoose
- Supabase
- Firebase
- Redis (for caching)

## Project Structure

```
repo/
├── app/
│   ├── actions/          # Server actions (type-safe mutations)
│   │   ├── book-actions.ts
│   │   └── goal-actions.ts
│   ├── api/              # API routes (REST endpoints)
│   │   ├── auth/         # NextAuth endpoints
│   │   ├── books/        # Book management
│   │   ├── goals/        # Goals management
│   │   ├── register/     # User registration
│   │   └── search-books/ # Google Books search
│   └── [pages]/          # UI pages
│
├── application/          # Application Layer
│   └── use-cases/       # Business use cases (11 use cases)
│       ├── books/       # Book operations
│       ├── goals/       # Goal operations
│       ├── auth/        # Authentication
│       └── search/      # Book search
│
├── domain/              # Domain Layer (Core Business Logic)
│   ├── entities/       # Business objects (User, Book, Goal)
│   ├── services/       # Domain services (BookService, GoalService)
│   ├── value-objects/  # Business rules (GoalProgress, ReadingStatus)
│   ├── interfaces/     # Contracts (repository interfaces)
│   └── errors/         # Domain errors
│
├── infrastructure/      # Infrastructure Layer
│   ├── persistence/    # Data access
│   │   └── memory/     # In-memory repositories (swap with Prisma)
│   ├── external/       # External APIs (Google Books)
│   └── security/       # Security (bcrypt)
│
├── lib/
│   ├── di/            # Dependency injection container
│   ├── auth.ts        # NextAuth configuration
│   └── db.ts          # Backward compatibility wrapper
│
├── components/         # React components
└── types/             # TypeScript types
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
