import { ReadingSession } from '../../../domain/entities/reading-session';
import { ReadingSessionRepository } from '../../../domain/interfaces/reading-session-repository';
import { ValidationError } from '../../../domain/errors/domain-errors';

export interface StartSessionInput {
  userId: string;
  bookId?: string;
}

/**
 * Use case for starting a new reading session
 *
 * Business rules:
 * - A user can only have one active session at a time
 * - If there's an existing active session, throw an error
 */
export class StartSessionUseCase {
  constructor(private sessionRepository: ReadingSessionRepository) {}

  async execute(input: StartSessionInput): Promise<ReadingSession> {
    // Check if user already has an active session
    const activeSession = await this.sessionRepository.findActiveByUserId(input.userId);
    if (activeSession) {
      throw new ValidationError(
        'You already have an active reading session. Please end it before starting a new one.'
      );
    }

    // Create new session
    const session = await this.sessionRepository.create({
      userId: input.userId,
      bookId: input.bookId,
      startTime: new Date(),
    });

    return session;
  }
}