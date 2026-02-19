import { prisma } from '../lib/prisma.js';
import { assignTicket } from './assignment.service.js';
import { suggestCategoryAndSpeciality } from './ai.service.js';

type CreateTicketInput = {
  title: string;
  description: string;
  categoryId?: string;
  specialityId?: string;
  priority?: string;
  source?: string;
  metadata?: string;
};

export async function createTicket(input: CreateTicketInput) {
  let categoryId = input.categoryId ?? null;
  let specialityId = input.specialityId ?? null;
  let priority = input.priority ?? 'Medium';
  let aiSuggestedCategoryId: string | null = null;
  let aiSuggestedSpecialityId: string | null = null;
  let aiConfidence: string | null = null;

  if (!categoryId || !specialityId) {
    const suggestion = await suggestCategoryAndSpeciality(input.title, input.description);
    if (suggestion) {
      aiSuggestedCategoryId = suggestion.categoryId;
      aiSuggestedSpecialityId = suggestion.specialityId;
      aiConfidence = suggestion.confidence;
      if (!categoryId) categoryId = suggestion.categoryId;
      if (!specialityId) specialityId = suggestion.specialityId;
      if (!input.priority && suggestion.priority) priority = suggestion.priority;
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      title: input.title,
      description: input.description,
      status: 'New',
      priority,
      source: input.source ?? 'api',
      categoryId,
      specialityId,
      aiSuggestedCategoryId: aiSuggestedCategoryId || undefined,
      aiSuggestedSpecialityId: aiSuggestedSpecialityId || undefined,
      aiConfidence: aiConfidence || undefined,
      metadata: input.metadata ?? undefined,
    },
    include: { category: true, speciality: true, assignedTo: true },
  });

  if (specialityId) {
    await assignTicket(ticket.id, specialityId);
    return prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
      include: { category: true, speciality: true, assignedTo: true },
    });
  }

  return ticket;
}

export async function listTickets(filters?: {
  status?: string;
  categoryId?: string;
  assignedToId?: string;
  fromDate?: Date;
  toDate?: Date;
}) {
  return prisma.ticket.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters?.assignedToId ? { assignedToId: filters.assignedToId } : {}),
      ...(filters?.fromDate || filters?.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: filters.fromDate } : {}),
              ...(filters.toDate ? { lte: filters.toDate } : {}),
            },
          }
        : {}),
    },
    include: { category: true, speciality: true, assignedTo: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTicket(id: string) {
  return prisma.ticket.findUniqueOrThrow({
    where: { id },
    include: { category: true, speciality: true, assignedTo: true },
  });
}

export async function updateTicket(
  id: string,
  data: { status?: string; priority?: string; categoryId?: string; specialityId?: string; assignedToId?: string }
) {
  return prisma.ticket.update({
    where: { id },
    data,
    include: { category: true, speciality: true, assignedTo: true },
  });
}

export async function assignTicketTo(id: string, teamMemberId: string) {
  return prisma.ticket.update({
    where: { id },
    data: { assignedToId: teamMemberId },
    include: { category: true, speciality: true, assignedTo: true },
  });
}
