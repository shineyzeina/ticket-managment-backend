import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as specialityService from '../services/speciality.service.js';

const createBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),
});
const updateBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
});

export default async function specialitiesRoutes(app: FastifyInstance) {
  app.get('/specialities', async (req, reply) => {
    const categoryId = (req.query as { categoryId?: string }).categoryId;
    const list = await specialityService.listSpecialities(categoryId);
    return reply.send(list);
  });

  app.get<{ Params: { id: string } }>('/specialities/:id', async (req, reply) => {
    const speciality = await specialityService.getSpeciality(req.params.id);
    return reply.send(speciality);
  });

  app.post('/specialities', async (req, reply) => {
    const body = createBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const speciality = await specialityService.createSpeciality(body.data);
    return reply.status(201).send(speciality);
  });

  app.patch<{ Params: { id: string } }>('/specialities/:id', async (req, reply) => {
    const body = updateBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const speciality = await specialityService.updateSpeciality(req.params.id, body.data);
    return reply.send(speciality);
  });
}
