/**
 * Goals API Routes
 * Handles reading goal CRUD operations
 * Feature: 003-reading-goals
 * Tasks: T024-T027
 */

import { ReadingGoal } from '../../models/reading-goal.js';
import { requireAuth } from '../middleware/auth.js';
import { DateTime } from 'luxon';
import logger from '../../lib/logger.js';
import { query } from '../../db/connection.js';

export default async function goalsRoutes(fastify, options) {
  // All routes require authentication
  fastify.addHook('preHandler', requireAuth);

  /**
   * POST /api/goals - Create new reading goal (T024)
   * Includes timezone calculation and validation (T026, T027)
   */
  fastify.post('/goals', async (request, reply) => {
    const { name, targetCount, daysToComplete, timezone } = request.body;
    const userId = request.readerId; // Set by requireAuth middleware

    try {
      // Input validation (T027)
      const errors = [];

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Goal name is required');
      }

      if (!targetCount || !Number.isInteger(targetCount) || targetCount <= 0) {
        errors.push('Target count must be a positive integer');
      }

      if (!daysToComplete || !Number.isInteger(daysToComplete) || daysToComplete < 1) {
        errors.push('Days to complete must be at least 1 day');
      }

      if (!timezone || typeof timezone !== 'string') {
        errors.push('Timezone is required');
      }

      if (errors.length > 0) {
        return reply.status(400).send({
          error: `Validation failed: ${errors.join(', ')}`,
        });
      }

      // Calculate deadline at end of day in user's timezone (T024)
      const deadlineAtUtc = DateTime.now()
        .setZone(timezone)
        .plus({ days: daysToComplete })
        .endOf('day')
        .toUTC()
        .toISO();

      // Deadline validation - reject past deadlines (T026)
      const deadlineCheck = DateTime.fromISO(deadlineAtUtc);
      const now = DateTime.now();

      if (deadlineCheck <= now) {
        return reply.status(400).send({
          error: 'Deadline must be in the future. Please choose a longer timeframe.',
        });
      }

      // Create goal
      const goal = await ReadingGoal.create({
        userId,
        name: name.trim(),
        targetCount,
        deadlineAtUtc,
        deadlineTimezone: timezone,
      });

      logger.info({
        goalId: goal.id,
        userId,
        targetCount,
        daysToComplete,
        deadlineAtUtc,
      }, 'Reading goal created');

      return reply.status(201).send(goal);
    } catch (error) {
      logger.error({
        error: error.message,
        userId,
        name,
        targetCount,
        daysToComplete,
      }, 'Failed to create reading goal');

      return reply.status(500).send({
        error: 'Failed to create goal',
      });
    }
  });

  /**
   * GET /api/goals/:goalId - Get goal by ID with progress details (T025)
   */
  fastify.get('/goals/:goalId', async (request, reply) => {
    const { goalId } = request.params;
    const userId = request.readerId; // Set by requireAuth middleware

    try {
      const goal = await ReadingGoal.findById(goalId);

      if (!goal) {
        return reply.status(404).send({
          error: 'Goal not found',
        });
      }

      // Verify goal belongs to requesting user (authorization)
      if (goal.userId !== userId) {
        return reply.status(404).send({
          error: 'Goal not found',
        });
      }

      return reply.send(goal);
    } catch (error) {
      logger.error({
        error: error.message,
        goalId,
        userId,
      }, 'Failed to retrieve goal');

      return reply.status(500).send({
        error: 'Failed to retrieve goal',
      });
    }
  });

  /**
   * GET /api/goals - List goals for current user (User Story 2, T048)
   * Supports filtering by status and pagination
   */
  fastify.get('/goals', async (request, reply) => {
    const userId = request.readerId; // Set by requireAuth middleware
    const { status, page = 1, pageSize = 50 } = request.query;

    try {
      const result = await ReadingGoal.findByUser(userId, {
        status,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
      });

      return reply.send(result);
    } catch (error) {
      logger.error({
        error: error.message,
        userId,
        status,
        page,
      }, 'Failed to list goals');

      return reply.status(500).send({
        error: 'Failed to list goals',
      });
    }
  });

  /**
   * PATCH /api/goals/:goalId - Update goal (User Story 3, T068-T071)
   * Allows editing target count and deadline for active goals only
   */
  fastify.patch('/goals/:goalId', async (request, reply) => {
    const { goalId } = request.params;
    const userId = request.readerId; // Set by requireAuth middleware
    const { targetCount, daysToAdd } = request.body;

    try {
      const goal = await ReadingGoal.findById(goalId);

      if (!goal) {
        return reply.status(404).send({
          error: 'Goal not found',
        });
      }

      // Verify ownership
      if (goal.userId !== userId) {
        return reply.status(404).send({
          error: 'Goal not found',
        });
      }

      // Reject editing completed/expired goals (T069)
      if (goal.status !== 'active') {
        return reply.status(400).send({
          error: `Cannot edit ${goal.status} goals. Only active goals can be modified.`,
        });
      }

      const updates = {};

      // Update target count if provided (T070)
      if (targetCount !== undefined) {
        if (!Number.isInteger(targetCount) || targetCount <= 0) {
          return reply.status(400).send({
            error: 'Target count must be a positive integer',
          });
        }
        updates.targetCount = targetCount;

        // Recalculate bonus count
        const newBonusCount = Math.max(0, goal.progressCount - targetCount);
        updates.bonusCount = newBonusCount;

        // Check if goal should be marked completed with new target
        if (goal.progressCount >= targetCount) {
          updates.status = 'completed';
          updates.completedAt = DateTime.now().toISO();
        }
      }

      // Extend deadline if provided (T071)
      if (daysToAdd !== undefined) {
        if (!Number.isInteger(daysToAdd) || daysToAdd < 1) {
          return reply.status(400).send({
            error: 'Days to add must be at least 1',
          });
        }

        const currentDeadline = DateTime.fromISO(goal.deadlineAtUtc);
        const newDeadline = currentDeadline.plus({ days: daysToAdd }).toISO();
        updates.deadlineAtUtc = newDeadline;
      }

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({
          error: 'No valid fields to update',
        });
      }

      // Update the goal
      await query(
        `UPDATE reading_goals
         SET target_count = COALESCE($1, target_count),
             bonus_count = COALESCE($2, bonus_count),
             status = COALESCE($3, status),
             completed_at = COALESCE($4, completed_at),
             deadline_at_utc = COALESCE($5, deadline_at_utc),
             updated_at = NOW()
         WHERE id = $6`,
        [
          updates.targetCount,
          updates.bonusCount,
          updates.status,
          updates.completedAt,
          updates.deadlineAtUtc,
          goalId,
        ]
      );

      const updatedGoal = await ReadingGoal.findById(goalId);

      logger.info({
        goalId,
        userId,
        updates,
      }, 'Goal updated');

      return reply.send(updatedGoal);
    } catch (error) {
      logger.error({
        error: error.message,
        goalId,
        userId,
      }, 'Failed to update goal');

      return reply.status(500).send({
        error: 'Failed to update goal',
      });
    }
  });

  /**
   * DELETE /api/goals/:goalId - Delete goal (User Story 3, T072)
   * Removes goal and all associated progress entries
   */
  fastify.delete('/goals/:goalId', async (request, reply) => {
    const { goalId } = request.params;
    const userId = request.readerId; // Set by requireAuth middleware

    try {
      const goal = await ReadingGoal.findById(goalId);

      if (!goal) {
        return reply.status(404).send({
          error: 'Goal not found',
        });
      }

      // Verify ownership
      if (goal.userId !== userId) {
        return reply.status(404).send({
          error: 'Goal not found',
        });
      }

      // Delete goal (CASCADE will remove progress entries)
      await ReadingGoal.delete(goalId);

      logger.info({
        goalId,
        userId,
      }, 'Goal deleted');

      return reply.status(204).send();
    } catch (error) {
      logger.error({
        error: error.message,
        goalId,
        userId,
      }, 'Failed to delete goal');

      return reply.status(500).send({
        error: 'Failed to delete goal',
      });
    }
  });
}
