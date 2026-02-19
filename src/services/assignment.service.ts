import { prisma } from '../lib/prisma.js';

const DEFAULT_ASSIGNEE_ID = process.env.DEFAULT_ASSIGNEE_ID ?? null;

export async function assignTicket(ticketId: string, specialityId: string): Promise<string | null> {
  const members = await prisma.teamMember.findMany({
    where: {
      isActive: true,
      specialities: { some: { specialityId } },
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  if (members.length === 0) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId: DEFAULT_ASSIGNEE_ID },
    });
    return DEFAULT_ASSIGNEE_ID;
  }

  let state = await prisma.assignmentState.findUnique({
    where: { specialityId },
  });

  if (!state) {
    state = await prisma.assignmentState.create({
      data: { specialityId, lastAssignedId: members[0]!.id },
    });
  }

  const currentIndex = members.findIndex((m) => m.id === state!.lastAssignedId);
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % members.length;
  const nextMember = members[nextIndex]!;

  await prisma.assignmentState.upsert({
    where: { specialityId },
    create: { specialityId, lastAssignedId: nextMember.id },
    update: { lastAssignedId: nextMember.id },
  });

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedToId: nextMember.id },
  });

  return nextMember.id;
}
