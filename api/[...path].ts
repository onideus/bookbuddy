import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  handleError,
  checkRateLimit,
  withAuth,
  verifyAuth,
  type AuthenticatedRequest,
  getContainer,
  generateAccessToken,
  generateRefreshToken,
  calculateRefreshTokenExpiry,
} from './_lib';

// Use cases
import { RegisterUserUseCase } from '../application/use-cases/auth/register-user';
import { AddBookUseCase } from '../application/use-cases/books/add-book';
import { UpdateBookUseCase } from '../application/use-cases/books/update-book';
import { DeleteBookUseCase } from '../application/use-cases/books/delete-book';
import { CreateGoalUseCase } from '../application/use-cases/goals/create-goal';
import { UpdateGoalUseCase } from '../application/use-cases/goals/update-goal';
import { DeleteGoalUseCase } from '../application/use-cases/goals/delete-goal';
import { GetUserStreakUseCase } from '../application/use-cases/streaks/get-user-streak';
import { RecordReadingActivityUseCase } from '../application/use-cases/streaks/record-reading-activity';
import { SearchBooksUseCase } from '../application/use-cases/search/search-books';

// Domain
import { UnauthorizedError } from '../domain/errors/domain-errors';
import { sanitizeEmail, sanitizeString } from '../lib/utils/sanitize';

/**
 * Universal API Handler
 * 
 * Routes all API requests to the appropriate handler.
 * This single function approach stays well under Vercel's 12 function limit.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the path from the catch-all route
  // Vercel puts catch-all segments in req.query.path
  // But we also need to handle direct URL parsing as a fallback
  let pathSegments: string[] = [];
  
  const { path } = req.query;
  if (path) {
    // Vercel may pass catch-all params as either an array (expected) or a
    // single string with slashes. Normalize to an array of segments.
    if (Array.isArray(path)) {
      pathSegments = path.flatMap((segment) =>
        typeof segment === 'string' ? segment.split('/').filter(Boolean) : []
      );
    } else if (typeof path === 'string') {
      pathSegments = path.split('/').filter(Boolean);
    }
  } else {
    // Fallback: parse from URL
    const url = req.url || '';
    const urlPath = url.split('?')[0]; // Remove query string
    // Remove /api/ prefix if present
    const match = urlPath.match(/^\/api\/(.*)$/);
    if (match && match[1]) {
      pathSegments = match[1].split('/').filter(Boolean);
    }
  }
  
  const route = pathSegments[0] || '';
  const subPath = pathSegments.slice(1);

  try {
    switch (route) {
      case 'health':
        return handleHealth(req, res);
      case 'auth':
        return handleAuth(req, res, subPath);
      case 'books':
        return handleBooks(req, res, subPath);
      case 'goals':
        return handleGoals(req, res, subPath);
      case 'streaks':
        return handleStreaks(req, res, subPath);
      case 'search':
        return handleSearch(req, res);
      case 'export':
        return handleExport(req, res, subPath);
      default:
        return res.status(404).json({ error: 'Not Found', message: `Unknown route: /${route}` });
    }
  } catch (error) {
    handleError(error, res);
  }
}

// ============================================================================
// Health Check
// ============================================================================

async function handleHealth(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}

// ============================================================================
// Auth Routes
// ============================================================================

async function handleAuth(req: VercelRequest, res: VercelResponse, path: string[]) {
  const action = path[0] || '';

  // Rate limiting for auth (stricter)
  if (!(await checkRateLimit(req, res, true))) {
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  switch (action) {
    case 'register':
      return handleRegister(req, res);
    case 'login':
      return handleLogin(req, res);
    case 'refresh':
      return handleRefresh(req, res);
    case 'logout':
      return handleLogout(req, res);
    default:
      return res.status(404).json({ error: 'Not Found', message: `Unknown auth route: ${action}` });
  }
}

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  try {
    const { email, password, name } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'ValidationError', message: 'Email is required', statusCode: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'ValidationError', message: 'Password must be at least 8 characters', statusCode: 400 });
    }
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'ValidationError', message: 'Name is required', statusCode: 400 });
    }

    const container = getContainer();
    const useCase = new RegisterUserUseCase(container.userRepository, container.passwordHasher);

    const user = await useCase.execute({
      email: sanitizeEmail(email),
      password,
      name: sanitizeString(name),
    });

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshTokenString = generateRefreshToken();

    await container.refreshTokenRepository.create({
      userId: user.id,
      token: refreshTokenString,
      expiresAt: calculateRefreshTokenExpiry(),
    });

    return res.status(201).json({
      accessToken,
      refreshToken: refreshTokenString,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    handleError(error, res);
    return;
  }
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'ValidationError', message: 'Email and password are required', statusCode: 400 });
  }

  const container = getContainer();
  const user = await container.userRepository.findByEmail(sanitizeEmail(email));
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const isValid = await container.passwordHasher.compare(password, user.password);
  if (!isValid) throw new UnauthorizedError('Invalid credentials');

  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshTokenString = generateRefreshToken();

  await container.refreshTokenRepository.create({
    userId: user.id,
    token: refreshTokenString,
    expiresAt: calculateRefreshTokenExpiry(),
  });

  res.status(200).json({
    accessToken,
    refreshToken: refreshTokenString,
    user: { id: user.id, email: user.email, name: user.name },
  });
}

async function handleRefresh(req: VercelRequest, res: VercelResponse) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'ValidationError', message: 'Refresh token is required', statusCode: 400 });
  }

  const container = getContainer();
  const tokenData = await container.refreshTokenRepository.findByToken(refreshToken);

  if (!tokenData || tokenData.revokedAt || tokenData.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await container.userRepository.findById(tokenData.userId);
  if (!user) throw new UnauthorizedError('User not found');

  await container.refreshTokenRepository.revoke(refreshToken);

  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const newRefreshTokenString = generateRefreshToken();

  await container.refreshTokenRepository.create({
    userId: user.id,
    token: newRefreshTokenString,
    expiresAt: calculateRefreshTokenExpiry(),
  });

  res.status(200).json({ accessToken, refreshToken: newRefreshTokenString });
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'ValidationError', message: 'Refresh token is required', statusCode: 400 });
  }

  const container = getContainer();
  const tokenData = await container.refreshTokenRepository.findByToken(refreshToken);
  if (tokenData && !tokenData.revokedAt) {
    await container.refreshTokenRepository.revoke(refreshToken);
  }

  res.status(200).json({ message: 'Logged out successfully' });
}

// ============================================================================
// Books Routes (Protected)
// ============================================================================

async function handleBooks(req: VercelRequest, res: VercelResponse, path: string[]) {
  if (!(await checkRateLimit(req, res))) return;

  let userId: string;
  try {
    const authPayload = verifyAuth(req);
    userId = authPayload.userId;
  } catch {
    return res.status(401).json({ error: 'UnauthorizedError', message: 'Authentication required' });
  }

  const container = getContainer();
  const bookId = path[0];
  const subRoute = path[0];

  // /books/genres
  if (subRoute === 'genres') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const genres = await container.bookRepository.getUniqueGenres(userId);
    return res.status(200).json({ genres });
  }

  // /books or /books/:id
  if (!bookId) {
    // /books - GET list or POST new
    if (req.method === 'GET') {
      const { status, genre, cursor, limit: limitStr } = req.query;
      const limit = limitStr ? Math.min(parseInt(limitStr as string, 10) || 20, 100) : 20;

      if (status && typeof status === 'string') {
        const books = await container.bookRepository.findByStatus(userId, status);
        return res.status(200).json({ books });
      }
      if (genre && typeof genre === 'string') {
        const books = await container.bookRepository.findByGenre(userId, genre);
        return res.status(200).json({ books });
      }

      const result = await container.bookRepository.findByUserIdPaginated(userId, {
        cursor: cursor as string | undefined,
        limit,
      });
      return res.status(200).json({
        books: result.books,
        pagination: { nextCursor: result.nextCursor, hasMore: result.hasMore, totalCount: result.totalCount },
      });
    }

    if (req.method === 'POST') {
      const { googleBooksId, title, authors, thumbnail, description, pageCount, status, genres } = req.body || {};
      if (!title) {
        return res.status(400).json({ error: 'ValidationError', message: 'Title is required', statusCode: 400 });
      }

      const useCase = new AddBookUseCase(container.bookRepository);
      const book = await useCase.execute({
        userId,
        googleBooksId: googleBooksId || `manual-${Date.now()}`,
        title: sanitizeString(title),
        authors: Array.isArray(authors) ? authors.map((a: string) => sanitizeString(a)) : [],
        thumbnail: thumbnail ? sanitizeString(thumbnail) : undefined,
        description: description ? sanitizeString(description) : undefined,
        pageCount: typeof pageCount === 'number' ? pageCount : undefined,
        status: status || 'to-read',
        genres: Array.isArray(genres) ? genres.map((g: string) => sanitizeString(g)) : undefined,
      });

      return res.status(201).json({ book });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // /books/:id - PATCH or DELETE
  if (req.method === 'PATCH') {
    const { status, currentPage, rating, notes, genres, startedAt, finishedAt } = req.body || {};
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (currentPage !== undefined) updates.currentPage = currentPage;
    if (rating !== undefined) updates.rating = rating;
    if (notes !== undefined) updates.notes = sanitizeString(notes);
    if (genres !== undefined && Array.isArray(genres)) {
      updates.genres = genres.map((g: string) => sanitizeString(g));
    }
    if (startedAt !== undefined) updates.startedAt = new Date(startedAt);
    if (finishedAt !== undefined) updates.finishedAt = new Date(finishedAt);

    const useCase = new UpdateBookUseCase(container.bookRepository, container.goalRepository);
    const book = await useCase.execute({ bookId, userId, updates });
    return res.status(200).json({ book });
  }

  if (req.method === 'DELETE') {
    const useCase = new DeleteBookUseCase(container.bookRepository);
    await useCase.execute({ bookId, userId });
    return res.status(200).json({ message: 'Book deleted successfully' });
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================================
// Goals Routes (Protected)
// ============================================================================

async function handleGoals(req: VercelRequest, res: VercelResponse, path: string[]) {
  if (!(await checkRateLimit(req, res))) return;

  let userId: string;
  try {
    const authPayload = verifyAuth(req);
    userId = authPayload.userId;
  } catch {
    return res.status(401).json({ error: 'UnauthorizedError', message: 'Authentication required' });
  }

  const container = getContainer();
  const goalId = path[0];

  if (!goalId) {
    // /goals - GET or POST
    if (req.method === 'GET') {
      const { cursor, limit: limitStr } = req.query;
      const limit = limitStr ? Math.min(parseInt(limitStr as string, 10) || 20, 100) : 20;

      const result = await container.goalRepository.findByUserIdPaginated(userId, {
        cursor: cursor as string | undefined,
        limit,
      });
      return res.status(200).json({
        goals: result.goals,
        pagination: { nextCursor: result.nextCursor, hasMore: result.hasMore, totalCount: result.totalCount },
      });
    }

    if (req.method === 'POST') {
      const { title, description, targetBooks, startDate, endDate } = req.body || {};

      if (!title) return res.status(400).json({ error: 'ValidationError', message: 'Title is required', statusCode: 400 });
      if (!targetBooks || targetBooks < 1) return res.status(400).json({ error: 'ValidationError', message: 'Target books must be at least 1', statusCode: 400 });
      if (!startDate) return res.status(400).json({ error: 'ValidationError', message: 'Start date is required', statusCode: 400 });
      if (!endDate) return res.status(400).json({ error: 'ValidationError', message: 'End date is required', statusCode: 400 });

      const useCase = new CreateGoalUseCase(container.goalRepository);
      const goal = await useCase.execute({
        userId,
        title: sanitizeString(title),
        description: description ? sanitizeString(description) : undefined,
        targetBooks,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      return res.status(201).json({ goal });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // /goals/:id - PATCH or DELETE
  if (req.method === 'PATCH') {
    const { title, description, targetBooks, startDate, endDate } = req.body || {};
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = sanitizeString(title);
    if (description !== undefined) updates.description = sanitizeString(description);
    if (targetBooks !== undefined) updates.targetBooks = targetBooks;
    if (startDate !== undefined) updates.startDate = new Date(startDate);
    if (endDate !== undefined) updates.endDate = new Date(endDate);

    const useCase = new UpdateGoalUseCase(container.goalRepository);
    const goal = await useCase.execute({ goalId, userId, updates });
    return res.status(200).json({ goal });
  }

  if (req.method === 'DELETE') {
    const useCase = new DeleteGoalUseCase(container.goalRepository);
    await useCase.execute({ goalId, userId });
    return res.status(200).json({ message: 'Goal deleted successfully' });
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================================
// Streaks Routes (Protected)
// ============================================================================

async function handleStreaks(req: VercelRequest, res: VercelResponse, path: string[]) {
  if (!(await checkRateLimit(req, res))) return;

  let userId: string;
  try {
    const authPayload = verifyAuth(req);
    userId = authPayload.userId;
  } catch {
    return res.status(401).json({ error: 'UnauthorizedError', message: 'Authentication required' });
  }

  const container = getContainer();
  const subRoute = path[0];

  if (!subRoute) {
    // /streaks - GET
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const useCase = new GetUserStreakUseCase(container.readingActivityRepository);
    const streakStats = await useCase.execute({ userId });
    return res.status(200).json(streakStats);
  }

  if (subRoute === 'activity') {
    // /streaks/activity - POST
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { bookId, pagesRead, minutesRead, date } = req.body || {};
    if ((pagesRead === undefined || pagesRead === null) && (minutesRead === undefined || minutesRead === null)) {
      return res.status(400).json({ error: 'ValidationError', message: 'Either pagesRead or minutesRead must be provided', statusCode: 400 });
    }

    const useCase = new RecordReadingActivityUseCase(container.readingActivityRepository);
    const activity = await useCase.execute({
      userId,
      bookId: bookId || undefined,
      pagesRead: typeof pagesRead === 'number' ? pagesRead : undefined,
      minutesRead: typeof minutesRead === 'number' ? minutesRead : undefined,
      date: date ? new Date(date) : undefined,
    });

    return res.status(201).json({ activity });
  }

  if (subRoute === 'history') {
    // /streaks/history - GET
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { startDate, endDate } = req.query;
    let activities;

    if (startDate && endDate) {
      activities = await container.readingActivityRepository.findByUserIdAndDateRange(
        userId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else {
      activities = await container.readingActivityRepository.findByUserId(userId);
    }

    return res.status(200).json({ activities });
  }

  return res.status(404).json({ error: 'Not Found', message: `Unknown streaks route: ${subRoute}` });
}

// ============================================================================
// Search Route (Protected)
// ============================================================================

async function handleSearch(req: VercelRequest, res: VercelResponse) {
  if (!(await checkRateLimit(req, res))) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    verifyAuth(req);
  } catch {
    return res.status(401).json({ error: 'UnauthorizedError', message: 'Authentication required' });
  }

  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'ValidationError', message: 'Search query is required', statusCode: 400 });
  }

  const container = getContainer();
  const useCase = new SearchBooksUseCase(container.externalBookSearch);
  const results = await useCase.execute({ query: q });

  res.status(200).json({ results });
}

// ============================================================================
// Export Routes (Protected)
// ============================================================================

async function handleExport(req: VercelRequest, res: VercelResponse, path: string[]) {
  if (!(await checkRateLimit(req, res))) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let userId: string;
  try {
    const authPayload = verifyAuth(req);
    userId = authPayload.userId;
  } catch {
    return res.status(401).json({ error: 'UnauthorizedError', message: 'Authentication required' });
  }

  const exportType = path[0];
  const container = getContainer();
  const format = (req.query.format as string)?.toLowerCase() || 'json';

  switch (exportType) {
    case 'books': {
      const books = await container.bookRepository.findByUserId(userId);
      if (format === 'csv') {
        const csv = booksToCSV(books);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="books.csv"');
        return res.status(200).send(csv);
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="books.json"');
      return res.status(200).json({ exportedAt: new Date().toISOString(), count: books.length, books });
    }

    case 'goals': {
      const goals = await container.goalRepository.findByUserId(userId);
      if (format === 'csv') {
        const csv = goalsToCSV(goals);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="goals.csv"');
        return res.status(200).send(csv);
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="goals.json"');
      return res.status(200).json({ exportedAt: new Date().toISOString(), count: goals.length, goals });
    }

    case 'all': {
      const [books, goals, activities] = await Promise.all([
        container.bookRepository.findByUserId(userId),
        container.goalRepository.findByUserId(userId),
        container.readingActivityRepository.findByUserId(userId),
      ]);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="booktracker-export.json"');
      return res.status(200).json({
        exportedAt: new Date().toISOString(),
        books: { count: books.length, data: books },
        goals: { count: goals.length, data: goals },
        readingActivities: { count: activities.length, data: activities },
      });
    }

    default:
      return res.status(404).json({ error: 'Not Found', message: `Unknown export type: ${exportType}` });
  }
}

// ============================================================================
// CSV Helpers
// ============================================================================

function booksToCSV(books: Array<{ id: string; title: string; authors: string[]; status: string; currentPage?: number; pageCount?: number; rating?: number; genres: string[]; addedAt: Date; finishedAt?: Date | null }>): string {
  const headers = ['id', 'title', 'authors', 'status', 'currentPage', 'pageCount', 'rating', 'genres', 'addedAt', 'finishedAt'];
  const rows = books.map((book) => [
    book.id,
    `"${book.title.replace(/"/g, '""')}"`,
    `"${book.authors.join(', ').replace(/"/g, '""')}"`,
    book.status,
    book.currentPage ?? '',
    book.pageCount ?? '',
    book.rating ?? '',
    `"${book.genres.join(', ').replace(/"/g, '""')}"`,
    book.addedAt.toISOString(),
    book.finishedAt?.toISOString() ?? '',
  ]);
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

function goalsToCSV(goals: Array<{ id: string; title: string; description?: string | null; targetBooks: number; currentBooks: number; startDate: Date; endDate: Date; completed: boolean }>): string {
  const headers = ['id', 'title', 'description', 'targetBooks', 'currentBooks', 'startDate', 'endDate', 'completed'];
  const rows = goals.map((goal) => [
    goal.id,
    `"${goal.title.replace(/"/g, '""')}"`,
    `"${(goal.description ?? '').replace(/"/g, '""')}"`,
    goal.targetBooks,
    goal.currentBooks,
    goal.startDate.toISOString(),
    goal.endDate.toISOString(),
    goal.completed,
  ]);
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
