import { prisma } from '../lib/prisma.js';

export async function listTeamMembers(filters?: { specialityId?: string; isActive?: boolean }) {
  return prisma.teamMember.findMany({
    where: {
      ...(filters?.specialityId
        ? { specialities: { some: { specialityId: filters.specialityId } } }
        : {}),
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    },
    include: { specialities: { include: { speciality: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getTeamMember(id: string) {
  return prisma.teamMember.findUniqueOrThrow({
    where: { id },
    include: { specialities: { include: { speciality: true } } },
  });
}

export async function createTeamMember(data: { name: string; email: string; specialityIds: string[] }) {
  const { specialityIds, ...rest } = data;
  return prisma.teamMember.create({
    data: {
      ...rest,
      specialities: {
        create: specialityIds.map((specialityId) => ({ specialityId })),
      },
    },
    include: { specialities: { include: { speciality: true } } },
  });
}

export async function updateTeamMember(
  id: string,
  data: { name?: string; email?: string; isActive?: boolean; specialityIds?: string[] }
) {
  const { specialityIds, ...rest } = data;
  if (specialityIds !== undefined) {
    await prisma.teamMemberSpeciality.deleteMany({ where: { teamMemberId: id } });
    if (specialityIds.length > 0) {
      await prisma.teamMemberSpeciality.createMany({
        data: specialityIds.map((specialityId) => ({ teamMemberId: id, specialityId })),
      });
    }
  }
  return prisma.teamMember.update({
    where: { id },
    data: rest,
    include: { specialities: { include: { speciality: true } } },
  });
}
