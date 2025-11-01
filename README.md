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

## Database

Currently uses an in-memory database for demo purposes. For production use, you should replace the `lib/db.ts` implementation with a real database:

- PostgreSQL with Prisma
- MongoDB with Mongoose
- Supabase
- Firebase
- Any other database of your choice

## Project Structure

```
repo/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth endpoints
│   │   ├── books/        # Book management endpoints
│   │   ├── goals/        # Goals endpoints
│   │   └── search-books/ # Google Books search
│   ├── dashboard/        # Dashboard page
│   ├── books/           # Book management page
│   ├── search/          # Book search page
│   ├── goals/           # Goals page
│   ├── login/           # Login page
│   ├── register/        # Registration page
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page (redirects to login)
├── components/
│   ├── BookCard.tsx     # Book display component
│   ├── GoalCard.tsx     # Goal display component
│   ├── Navigation.tsx   # Navigation bar
│   ├── ProgressBar.tsx  # Progress bar component
│   └── Providers.tsx    # Session provider wrapper
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   └── db.ts            # Database operations (in-memory)
├── types/
│   └── next-auth.d.ts   # NextAuth type definitions
└── middleware.ts        # Route protection middleware
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
