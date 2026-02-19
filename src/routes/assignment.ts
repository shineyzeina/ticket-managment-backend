import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export default async function assignmentRoutes(app: FastifyInstance) {
  app.get('/assignment/rules', async (_req, reply) => {
    const defaultAssigneeId = process.env.DEFAULT_ASSIGNEE_ID ?? null;
    return reply.send({
      strategy: 'round-robin',
      defaultAssigneeId,
    });
  });

  app.patch('/assignment/rules', async (req, reply) => {
    const body = req.body as { defaultAssigneeId?: string | null };
    if (typeof body.defaultAssigneeId !== 'string' && body.defaultAssigneeId !== null) {
      return reply.status(400).send({ error: 'defaultAssigneeId must be a string or null' });
    }
    process.env.DEFAULT_ASSIGNEE_ID = body.defaultAssigneeId ?? '';
    return reply.send({ strategy: 'round-robin', defaultAssigneeId: process.env.DEFAULT_ASSIGNEE_ID || null });
  });
}
