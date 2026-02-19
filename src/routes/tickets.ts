import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as ticketService from '../services/ticket.service.js';

const createBody = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  categoryId: z.string().optional(),
  specialityId: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  source: z.string().optional(),
  metadata: z.string().optional(),
});
const updateBody = z.object({
  status: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  categoryId: z.string().nullable().optional(),
  specialityId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
});
const assignBody = z.object({ teamMemberId: z.string().min(1) });

export default async function ticketsRoutes(app: FastifyInstance) {
  app.post('/tickets', async (req, reply) => {
    const body = createBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const ticket = await ticketService.createTicket(body.data);
    return reply.status(201).send(ticket);
  });

  app.get('/tickets', async (req, reply) => {
    const q = req.query as {
      status?: string;
      categoryId?: string;
      assignedToId?: string;
      fromDate?: string;
      toDate?: string;
    };
    const fromDate = q.fromDate ? new Date(q.fromDate) : undefined;
    const toDate = q.toDate ? new Date(q.toDate) : undefined;
    const list = await ticketService.listTickets({
      status: q.status,
      categoryId: q.categoryId,
      assignedToId: q.assignedToId,
      fromDate,
      toDate,
    });
    return reply.send(list);
  });

  app.get<{ Params: { id: string } }>('/tickets/:id', async (req, reply) => {
    const ticket = await ticketService.getTicket(req.params.id);
    return reply.send(ticket);
  });

  app.patch<{ Params: { id: string } }>('/tickets/:id', async (req, reply) => {
    const body = updateBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const ticket = await ticketService.updateTicket(req.params.id, body.data);
    return reply.send(ticket);
  });

  app.post<{ Params: { id: string } }>('/tickets/:id/assign', async (req, reply) => {
    const body = assignBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const ticket = await ticketService.assignTicketTo(req.params.id, body.data.teamMemberId);
    return reply.send(ticket);
  });
}
