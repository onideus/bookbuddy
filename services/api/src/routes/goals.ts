import type { FastifyInstance } from 'fastify';
import { Container } from '../../../../lib/di/container';
import { CreateGoalUseCase } from '../../../../application/use-cases/goals/create-goal';
import { UpdateGoalUseCase } from '../../../../application/use-cases/goals/update-goal';
import { DeleteGoalUseCase } from '../../../../application/use-cases/goals/delete-goal';
import { wrapHandler } from '../utils/error-handler';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import type { CreateGoalRequest, UpdateGoalRequest } from '../../../../types/contracts';
import type { Goal } from '../../../../domain/entities/goal';
import { sanitizeString } from '../../../../lib/utils/sanitize';

interface GoalQuerystring {
  cursor?: string;
  limit?: string;
}

// JSON Schema for GET /goals
const getGoalsSchema = {
  querystring: {
    type: 'object',
    properties: {
      cursor: { type: 'string', format: 'uuid' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
};

// JSON Schema for POST /goals
const createGoalSchema = {
  body: {
    type: 'object',
    required: ['title', 'targetBooks', 'startDate', 'endDate'],
    properties: {
      title: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      targetBooks: { type: 'number', minimum: 1 },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        goal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            targetBooks: { type: 'number' },
            currentBooks: { type: 'number' },
          },
        },
      },
    },
  },
};

// JSON Schema for PATCH /goals/:id
const updateGoalSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      targetBooks: { type: 'number', minimum: 1 },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        goal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            targetBooks: { type: 'number' },
          },
        },
      },
    },
  },
};

// JSON Schema for DELETE /goals/:id
const deleteGoalSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
};

export function registerGoalRoutes(app: FastifyInstance) {
  // GET /goals - List user's goals with pagination
  app.get<{ Querystring: GoalQuerystring }>(
    '/goals',
    {
      schema: getGoalsSchema,
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
      schema: createGoalSchema,
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const { title, description, targetBooks, startDate, endDate } = request.body as CreateGoalRequest;

      const goalRepository = Container.getGoalRepository();
      const useCase = new CreateGoalUseCase(goalRepository);

      const goal = await useCase.execute({
        userId,
        title: sanitizeString(title),
        description: description ? sanitizeString(description) : description,
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
      schema: updateGoalSchema,
      preHandler: authenticate,
    },
    wrapHandler(async (request: AuthenticatedRequest, reply) => {
      const userId = request.user!.userId;

      const { id } = request.params as { id: string };
      const body = request.body as UpdateGoalRequest;

      // Convert date strings to Date objects if present and build properly typed updates
      const updates: Partial<Goal> = {
        ...(body.title !== undefined && { title: sanitizeString(body.title) }),
        ...(body.description !== undefined && { description: sanitizeString(body.description) }),
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
      schema: deleteGoalSchema,
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
