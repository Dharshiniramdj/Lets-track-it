import { FastifyInstance } from 'fastify';
import { NotificationService } from '../modules/notifications/notification.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  // All notification routes require valid authentication
  fastify.addHook('preHandler', AuthGuard.authenticate);

  fastify.get('/', async (request, reply) => {
    const user = (request as any).user;
    const query = request.query as any;

    const readFilter = query.read !== undefined ? query.read === 'true' : undefined;
    const notifications = NotificationService.getUserNotifications(user.id, {
      read: readFilter,
      category: query.category
    });
    const unreadCount = NotificationService.getUnreadCount(user.id);

    reply.send({
      notifications,
      unreadCount
    });
  });

  fastify.patch('/:id/read', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const updated = NotificationService.markAsRead(user.id, id);
    reply.send(updated);
  });

  fastify.post('/mark-all-read', async (request, reply) => {
    const user = (request as any).user;
    const result = NotificationService.markAllAsRead(user.id);
    reply.send({ success: true, ...result });
  });

  fastify.delete('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    NotificationService.deleteNotification(user.id, id);
    reply.send({ success: true, message: 'Notification dismissed' });
  });
}
