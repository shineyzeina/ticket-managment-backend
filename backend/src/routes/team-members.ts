import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as teamMemberService from '../services/team-member.service.js';

const createBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  specialityIds: z.array(z.string()).min(1),
});
const updateBody = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  specialityIds: z.array(z.string()).optional(),
});

export default async function teamMembersRoutes(app: FastifyInstance) {
  app.get('/team-members', async (req, reply) => {
    const q = req.query as { specialityId?: string; isActive?: string };
    const isActive = q.isActive === 'true' ? true : q.isActive === 'false' ? false : undefined;
    const list = await teamMemberService.listTeamMembers({ specialityId: q.specialityId, isActive });
    return reply.send(list);
  });

  app.get<{ Params: { id: string } }>('/team-members/:id', async (req, reply) => {
    const member = await teamMemberService.getTeamMember(req.params.id);
    return reply.send(member);
  });

  app.post('/team-members', async (req, reply) => {
    const body = createBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const member = await teamMemberService.createTeamMember(body.data);
    return reply.status(201).send(member);
  });

  app.patch<{ Params: { id: string } }>('/team-members/:id', async (req, reply) => {
    const body = updateBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const member = await teamMemberService.updateTeamMember(req.params.id, body.data);
    return reply.send(member);
  });
}
