import { prisma } from '../lib/prisma.js';

export async function listCategories(parentId?: string | null) {
  return prisma.category.findMany({
    where: parentId === undefined ? undefined : { parentId: parentId ?? null },
    include: { specialities: true },
    orderBy: { name: 'asc' },
  });
}

export async function getCategory(id: string) {
  return prisma.category.findUniqueOrThrow({
    where: { id },
    include: { specialities: true, children: true },
  });
}

export async function createCategory(data: { name: string; description?: string; parentId?: string }) {
  return prisma.category.create({ data });
}

export async function updateCategory(id: string, data: { name?: string; description?: string; parentId?: string }) {
  return prisma.category.update({ where: { id }, data });
}
