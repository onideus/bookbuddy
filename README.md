# BookTracker

A modern book tracking application with a Vercel serverless REST API backend and native iOS SwiftUI app, helping you manage your reading journey.

## Features

### Core Features
- **User Authentication**: Secure JWT-based authentication with bcryptjs password hashing
- **Book Management**: Track books across three statuses (want-to-read, reading, read)
- **Google Books Integration**: Search and add books by title, author, or ISBN
- **Reading Progress**: Track page progress with visual progress bars and automatic status updates
- **Star Ratings**: Rate finished books with a 5-star system
- **Reading Goals**: Create goals with target books, deadlines, and automatic progress tracking
- **Reading Streaks**: Track consecutive days of reading for gamification
- **Book Genres/Tags**: Categorize books for filtering
- **Data Export**: Export your reading data in JSON or CSV format
- **API Rate Limiting**: Protection against brute-force and DoS attacks

## Architecture

This application follows **Clean Architecture** and **SOLID principles** with clear separation of concerns.

### Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend API** | Vercel Serverless Functions (Node.js) |
| **Database** | PostgreSQL with Prisma ORM |
| **iOS App** | SwiftUI |
| **Authentication** | JWT (JSON Web Tokens) |
| **Language** | TypeScript (backend), Swift (iOS) |
| **External API** | Google Books API |

### 🏗️ Clean Architecture Layers

```
┌─────────────────────────────────────┐
│     UI Layer (iOS SwiftUI App)       │  ← User Interface
├─────────────────────────────────────┤
│  Application Layer (Use Cases)       │  ← Business Logic
├─────────────────────────────────────┤
│  Domain Layer (Entities, Services)   │  ← Core Business Rules
├─────────────────────────────────────┤
│  Infrastructure (Repositories, API)  │  ← External Concerns
└─────────────────────────────────────┘
```

### ✅ SOLID Principles

- **S**ingle Responsibility: Each class has one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Implementations are interchangeable
- **I**nterface Segregation: Focused, specific interfaces
- **D**ependency Inversion: Depend on abstractions, not concretions

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm package manager
- Docker (for PostgreSQL) or PostgreSQL installed locally
- Xcode 15+ (for iOS development)

### Backend Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd bookbuddy-mk3
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bookbuddy

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Server
PORT=4000
HOST=0.0.0.0

# Google Books API (Optional but recommended)
GOOGLE_BOOKS_API_KEY=your-google-books-api-key

# Logging
LOG_LEVEL=debug
LOG_FORMAT=human
```

4. Start the database:
```bash
npm run db:setup
```

5. Run database migrations:
```bash
npm run db:migrate
```

6. Start the development server:
```bash
vercel dev
```

The API will be available at [http://localhost:3000](http://localhost:3000)

### iOS App Setup

1. Navigate to the iOS directory:
```bash
cd ios
```

2. Generate the Xcode project:
```bash
xcodegen
```

3. Open in Xcode:
```bash
open BookTrackerApp.xcodeproj
```

4. Build and run on simulator or device

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout and invalidate tokens |

### Books
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/books` | Get user's books (paginated) |
| POST | `/books` | Add a new book |
| PUT | `/books/:id` | Update a book |
| DELETE | `/books/:id` | Delete a book |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/goals` | Get user's goals (paginated) |
| POST | `/goals` | Create a new goal |
| PUT | `/goals/:id` | Update a goal |
| DELETE | `/goals/:id` | Delete a goal |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q=query` | Search Google Books |

### Streaks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/streaks` | Get user's reading streak |
| POST | `/streaks/activity` | Record reading activity |
| GET | `/streaks/history` | Get activity history |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/export/books?format=json` | Export books |
| GET | `/export/goals?format=csv` | Export goals |
| GET | `/export/all?format=json` | Export all data |

## Project Structure

```
bookbuddy-mk3/
├── application/           # Application Layer
│   └── use-cases/        # Business use cases
│       ├── auth/         # Authentication
│       ├── books/        # Book operations
│       ├── goals/        # Goal operations
│       ├── search/       # Book search
│       └── streaks/      # Reading streaks
│
├── domain/               # Domain Layer (Core Business Logic)
│   ├── entities/        # Business objects (User, Book, Goal)
│   ├── services/        # Domain services
│   ├── value-objects/   # Business rules (GoalProgress, ReadingStatus)
│   ├── interfaces/      # Contracts (repository interfaces)
│   └── errors/          # Domain errors
│
├── infrastructure/       # Infrastructure Layer
│   ├── persistence/     # Data access
│   │   ├── memory/      # In-memory repositories (testing)
│   │   └── prisma/      # Prisma repositories (production)
│   ├── external/        # External APIs (Google Books)
│   ├── logging/         # Structured logging
│   └── security/        # Security (bcrypt)
│
├── api/                  # Vercel Serverless Functions
│   ├── [...path].ts     # Universal API handler
│   └── _lib/            # Shared utilities (auth, errors, container)
│
├── lib/
│   ├── config.ts        # Centralized configuration
│   ├── di/              # Dependency injection
│   └── utils/           # Utilities (pagination, sanitization)
│
├── ios/                  # iOS SwiftUI Application
│   ├── BookTrackerApp/  # Main app code
│   └── Packages/        # Swift packages
│       ├── CoreDomain/      # Domain layer (Swift)
│       ├── Application/     # Use cases (Swift)
│       └── InfrastructureIOS/ # Network, persistence
│
├── prisma/
│   └── schema.prisma    # Database schema
│
└── tests/               # Test utilities and mocks
```

## Scripts

| Script | Description |
|--------|-------------|
| `vercel dev` | Start development server |
| `npm run build` | Generate Prisma client |
| `npm run test` | Run test suite |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run db:setup` | Set up PostgreSQL via Docker |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema changes |
| `npm run db:start` | Start database container |
| `npm run db:stop` | Stop database container |

## Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| **[README.md](./README.md)** | Quick start guide and setup | Everyone |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Detailed architecture documentation | Developers/Architects |
| **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** | Guide for adding features | Developers |
| **[DATABASE.md](./DATABASE.md)** | Database schema and setup | Developers |
| **[RECOMMENDATIONS.md](./RECOMMENDATIONS.md)** | Code review findings and roadmap | Technical Leads |

## Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Access and refresh token pattern
- **Rate Limiting**: Global (100/min) and auth-specific (5/min) limits
- **Input Validation**: JSON Schema validation on all endpoints
- **Input Sanitization**: XSS prevention via HTML entity escaping
- **Structured Logging**: Request tracing with unique IDs

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
