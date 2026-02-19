import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as categoryService from '../services/category.service.js';

const createBody = z.object({ name: z.string().min(1), description: z.string().optional(), parentId: z.string().optional() });
const updateBody = z.object({ name: z.string().min(1).optional(), description: z.string().optional(), parentId: z.string().nullable().optional() });

export default async function categoriesRoutes(app: FastifyInstance) {
  app.get('/categories', async (req, reply) => {
    const parentId = (req.query as { parentId?: string }).parentId;
    const list = await categoryService.listCategories(parentId);
    return reply.send(list);
  });

  app.get<{ Params: { id: string } }>('/categories/:id', async (req, reply) => {
    const category = await categoryService.getCategory(req.params.id);
    return reply.send(category);
  });

  app.post('/categories', async (req, reply) => {
    const body = createBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const category = await categoryService.createCategory(body.data);
    return reply.status(201).send(category);
  });

  app.patch<{ Params: { id: string } }>('/categories/:id', async (req, reply) => {
    const body = updateBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const category = await categoryService.updateCategory(req.params.id, body.data);
    return reply.send(category);
  });
}
