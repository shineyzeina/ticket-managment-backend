import { prisma } from '../lib/prisma.js';

export async function listSpecialities(categoryId?: string) {
  return prisma.speciality.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: { category: true },
    orderBy: { name: 'asc' },
  });
}

export async function getSpeciality(id: string) {
  return prisma.speciality.findUniqueOrThrow({
    where: { id },
    include: { category: true, members: { include: { teamMember: true } } },
  });
}

export async function createSpeciality(data: { name: string; description?: string; categoryId: string }) {
  return prisma.speciality.create({ data });
}

export async function updateSpeciality(id: string, data: { name?: string; description?: string; categoryId?: string }) {
  return prisma.speciality.update({ where: { id }, data });
}
