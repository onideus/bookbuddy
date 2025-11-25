import type { FastifyInstance } from 'fastify';
import { Container } from '../../../../lib/di/container';
import { CreateGoalUseCase } from '../../../../application/use-cases/goals/create-goal';
import { UpdateGoalUseCase } from '../../../../application/use-cases/goals/update-goal';
import { DeleteGoalUseCase } from '../../../../application/use-cases/goals/delete-goal';
import { wrapHandler } from '../utils/error-handler';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import type { CreateGoalRequest, UpdateGoalRequest } from '../../../../types/contracts';
import type { Goal } from '../../../../domain/entities/goal';

interface GoalQuerystring {
  cursor?: string;
  limit?: string;
}

export function registerGoalRoutes(app: FastifyInstance) {
  // GET /goals - List user's goals with pagination
  app.get<{ Querystring: GoalQuerystring }>(
    '/goals',
    {
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;
      const query = request.query as GoalQuerystring;
      const { cursor, limit: limitStr } = query;

      const goalRepository = Container.getGoalRepository();
      const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 20, 100) : 20;

      const result = await goalRepository.findByUserIdPaginated(userId, { cursor, limit });

      reply.send({
        goals: result.goals,
        pagination: {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
          totalCount: result.totalCount,
        },
      });
    })
  );

  // POST /goals - Create a goal
  app.post<{
    Body: CreateGoalRequest;
  }>(
    '/goals',
    {
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const { title, description, targetBooks, startDate, endDate } = request.body as CreateGoalRequest;

      const goalRepository = Container.getGoalRepository();
      const useCase = new CreateGoalUseCase(goalRepository);

      const goal = await useCase.execute({
        userId,
        title,
        description,
        targetBooks,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      reply.code(201).send({ goal });
    })
  );

  // PATCH /goals/:id - Update a goal
  app.patch<{
    Params: { id: string };
    Body: UpdateGoalRequest;
  }>(
    '/goals/:id',
    {
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const { id } = request.params as { id: string };
      const body = request.body as UpdateGoalRequest;

      // Convert date strings to Date objects if present and build properly typed updates
      const updates: Partial<Goal> = {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.targetBooks !== undefined && { targetBooks: body.targetBooks }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
      };

      const goalRepository = Container.getGoalRepository();
      const useCase = new UpdateGoalUseCase(goalRepository);

      const goal = await useCase.execute({
        goalId: id,
        userId,
        updates,
      });

      reply.send({ goal });
    })
  );

  // DELETE /goals/:id - Delete a goal
  app.delete<{
    Params: { id: string };
  }>(
    '/goals/:id',
    {
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const { id } = request.params as { id: string };

      const goalRepository = Container.getGoalRepository();
      const useCase = new DeleteGoalUseCase(goalRepository);

      await useCase.execute({
        goalId: id,
        userId,
      });

      reply.send({ message: 'Goal deleted successfully' });
    })
  );
}
