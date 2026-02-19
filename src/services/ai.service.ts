import OpenAI from 'openai';
import { prisma } from '../lib/prisma.js';

const openai = process.env.OPENAI_API_KEY ? new OpenAI() : null;

export type AiSuggestion = {
  categoryId: string;
  specialityId: string;
  priority?: string;
  confidence: 'high' | 'medium' | 'low';
};

export async function suggestCategoryAndSpeciality(
  title: string,
  description: string
): Promise<AiSuggestion | null> {
  if (!openai) return null;

  const categories = await prisma.category.findMany({
    include: { specialities: true },
    orderBy: { name: 'asc' },
  });

  if (categories.length === 0) return null;

  const taxonomy = categories
    .map(
      (c) =>
        `Category id="${c.id}" name="${c.name}"${c.description ? ` description="${c.description}"` : ''}. Specialities: ${c.specialities.map((s) => `id="${s.id}" name="${s.name}"`).join(', ')}`
    )
    .join('\n');

  const prompt = `You are a support ticket classifier. Given a ticket title and description, choose the best matching category and speciality from the list below. Also set priority to one of: Low, Medium, High, Critical based on urgency. Respond with valid JSON only: {"categoryId":"...","specialityId":"...","priority":"...","confidence":"high|medium|low"}.

Taxonomy:
${taxonomy}

Ticket title: ${title}
Ticket description: ${description}

JSON:`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw.replace(/^```json?\s*|\s*```$/g, '')) as {
      categoryId: string;
      specialityId: string;
      priority?: string;
      confidence?: string;
    };

    const specialityIds = new Set(categories.flatMap((c) => c.specialities.map((s) => s.id)));
    if (!specialityIds.has(parsed.specialityId)) return null;

    const speciality = await prisma.speciality.findUnique({ where: { id: parsed.specialityId } });
    const categoryId = speciality?.categoryId ?? parsed.categoryId;
    const priority = ['Low', 'Medium', 'High', 'Critical'].includes(parsed.priority ?? '')
      ? parsed.priority
      : 'Medium';
    const confidence = ['high', 'medium', 'low'].includes(parsed.confidence ?? '') ? parsed.confidence : 'medium';

    return {
      categoryId,
      specialityId: parsed.specialityId,
      priority,
      confidence: confidence as 'high' | 'medium' | 'low',
    };
  } catch {
    return null;
  }
}
