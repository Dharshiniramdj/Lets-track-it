import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GoalService } from '../modules/goals/goal.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { ApiError } from '../common/errors/api-error.js';

const CreateGoalSchema = z.object({
  accountId: z.string().uuid(),
  category: z.string().min(1, 'Category is required'),
  targetAmount: z.number().positive('Target amount must be positive'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format').optional(),
  notes: z.string().optional()
});

export async function goalRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', AuthGuard.authenticate);

  fastify.get('/', async (request, reply) => {
    const user = (request as any).user;
    const query = request.query as any;

    if (!query.accountId) {
      throw ApiError.badRequest('accountId query parameter is required');
    }

    const goalsWithProgress = GoalService.getGoalsWithProgress(
      user.id,
      query.accountId,
      query.month
    );

    reply.send(goalsWithProgress);
  });

  fastify.post('/', async (request, reply) => {
    const user = (request as any).user;
    const parse = CreateGoalSchema.safeParse(request.body);
    if (!parse.success) {
      const details = parse.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw ApiError.unprocessableEntity('Invalid goal configuration payload', details);
    }

    const goal = GoalService.createOrUpdateGoal(user.id, parse.data);
    reply.status(201).send(goal);
  });

  fastify.delete('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    GoalService.deleteGoal(user.id, id);
    reply.send({ success: true, message: 'Savings goal deleted' });
  });
}
