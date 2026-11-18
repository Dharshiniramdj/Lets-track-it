import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserService } from '../modules/users/user.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { ApiError } from '../common/errors/api-error.js';

const CreateAccountSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['PERSONAL', 'FAMILY', 'BUSINESS']),
  color: z.string().optional(),
  avatarSeed: z.string().optional()
});

const AddMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'MEMBER', 'VIEWER'])
});

export async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', AuthGuard.authenticate);

  fastify.get('/profile', async (request, reply) => {
    const user = (request as any).user;
    const profile = UserService.getUserProfile(user.id);
    reply.send({
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      currencyPreference: profile.currencyPreference,
      status: profile.status,
      hasBiometrics: !!profile.biometricPublicKey
    });
  });

  fastify.get('/accounts', async (request, reply) => {
    const user = (request as any).user;
    const accounts = UserService.getUserAccounts(user.id);
    reply.send(accounts);
  });

  fastify.post('/accounts', async (request, reply) => {
    const user = (request as any).user;
    const parse = CreateAccountSchema.safeParse(request.body);
    if (!parse.success) {
      throw ApiError.unprocessableEntity('Invalid account payload', [
        { field: 'name', message: 'Account name and valid type required' }
      ]);
    }

    const account = UserService.createAccount(user.id, parse.data);
    reply.status(201).send(account);
  });

  fastify.post('/accounts/:id/members', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const parse = AddMemberSchema.safeParse(request.body);
    if (!parse.success) {
      throw ApiError.unprocessableEntity('Invalid member invitation', [
        { field: 'email', message: 'Valid email and role required' }
      ]);
    }

    const updated = UserService.addAccountMember(user.id, id, parse.data);
    reply.send(updated);
  });
}
