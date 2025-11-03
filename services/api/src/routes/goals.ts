import type { FastifyInstance } from 'fastify';
import { Container } from '../../../../lib/di/container';
import { GetUserGoalsUseCase } from '../../../../application/use-cases/goals/get-user-goals';
import { CreateGoalUseCase } from '../../../../application/use-cases/goals/create-goal';
import { UpdateGoalUseCase } from '../../../../application/use-cases/goals/update-goal';
import { DeleteGoalUseCase } from '../../../../application/use-cases/goals/delete-goal';
import { wrapHandler } from '../utils/error-handler';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import type { CreateGoalRequest, UpdateGoalRequest } from '../../../../types/contracts';

export function registerGoalRoutes(app: FastifyInstance) {
  // GET /goals - List user's goals
  app.get(
    '/goals',
    {
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const goalRepository = Container.getGoalRepository();
      const useCase = new GetUserGoalsUseCase(goalRepository);
      const goals = await useCase.execute({ userId });

      reply.send({ goals });
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

      const { title, description, targetBooks, startDate, endDate } = request.body;

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

      const { id } = request.params;
      const updates = { ...request.body };

      // Convert date strings to Date objects if present
      if (updates.startDate) {
        updates.startDate = new Date(updates.startDate);
      }
      if (updates.endDate) {
        updates.endDate = new Date(updates.endDate);
      }

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

      const { id } = request.params;

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
