import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TransactionService } from '../modules/transactions/transaction.service.js';
import { NotificationService } from '../modules/notifications/notification.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { ApiError } from '../common/errors/api-error.js';
import { handleIdempotency, IdempotencyManager } from '../common/interceptors/idempotency.middleware.js';

const CreateTransactionSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive('Amount must be greater than zero'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  mode: z.enum(['UPI', 'CASH', 'CARD', 'NET_BANKING', 'OTHER']),
  platform: z.string().min(1, 'Platform is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  category: z.string().min(1, 'Category is required'),
  date: z.string().optional(),
  shoppingDetails: z.object({
    appName: z.string(),
    productName: z.string(),
    forWhom: z.string().optional(),
    orderedDate: z.string().optional(),
    deliveryDate: z.string().optional(),
    status: z.enum(['ORDERED', 'SHIPPED', 'DELIVERED', 'RETURNED']).optional(),
    subItems: z.array(z.object({
      name: z.string(),
      qty: z.number(),
      price: z.number()
    })).optional()
  }).optional()
});

export async function transactionRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', AuthGuard.authenticate);

  fastify.get('/', async (request, reply) => {
    const user = (request as any).user;
    const query = request.query as any;

    const transactions = TransactionService.getTransactions(user.id, {
      accountId: query.accountId,
      startDate: query.startDate,
      endDate: query.endDate,
      category: query.category,
      type: query.type,
      isShoppingOnly: query.isShopping === 'true'
    });

    reply.send(transactions);
  });

  fastify.get('/summary', async (request, reply) => {
    const user = (request as any).user;
    const query = request.query as any;

    const summary = TransactionService.getFinancialSummary(
      user.id,
      query.accountId,
      query.month
    );

    reply.send(summary);
  });

  fastify.post('/', async (request, reply) => {
    const isReplay = await handleIdempotency(request, reply);
    if (isReplay) return;

    const user = (request as any).user;
    const parse = CreateTransactionSchema.safeParse(request.body);
    if (!parse.success) {
      const details = parse.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw ApiError.unprocessableEntity('Invalid transaction creation payload', details);
    }

    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
    const created = TransactionService.createTransaction(user.id, parse.data, idempotencyKey);

    if (idempotencyKey) {
      IdempotencyManager.set(idempotencyKey, 201, created);
    }

    // Emit transaction & budget notifications
    NotificationService.createNotification(user.id, {
      title: 'Transaction Logged',
      message: `${created.purpose} (₹${created.amount}) recorded in ${created.category}`,
      type: 'success',
      category: 'TRANSACTION'
    });

    if (created.type === 'EXPENSE') {
      NotificationService.checkBudgetThresholds(user.id, created.accountId, created.category);
    }

    reply.status(201).send(created);
  });

  fastify.patch('/:id/delivery-status', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    if (!body.status || !['ORDERED', 'SHIPPED', 'DELIVERED', 'RETURNED'].includes(body.status)) {
      throw ApiError.unprocessableEntity('Invalid delivery status', [
        { field: 'status', message: 'Status must be ORDERED, SHIPPED, DELIVERED, or RETURNED' }
      ]);
    }

    const updated = TransactionService.updateDeliveryStatus(
      user.id,
      id,
      body.status,
      body.deliveryDate
    );

    NotificationService.createNotification(user.id, {
      title: 'Delivery Status Updated',
      message: `Package for ${updated.shoppingDetails?.productName || updated.purpose} updated to ${body.status}`,
      type: 'info',
      category: 'DELIVERY'
    });

    reply.send(updated);
  });

  fastify.delete('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    TransactionService.deleteTransaction(user.id, id);

    NotificationService.createNotification(user.id, {
      title: 'Transaction Deleted',
      message: 'Transaction was removed from your financial ledger',
      type: 'info',
      category: 'TRANSACTION'
    });

    reply.send({ success: true, message: 'Transaction deleted' });
  });
}
