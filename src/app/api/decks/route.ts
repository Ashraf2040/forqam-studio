import { prisma } from '@/lib/db';
import { requireMe } from '@/lib/auth';
import { handle, json } from '@/lib/http';
export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  const me = await requireMe();
  if (!['teacher', 'admin'].includes(me.role)) return json({ decks: [] });
  const rows = await prisma.deck.findMany({ where: { schoolId: me.schoolId, owner: me.name }, orderBy: { deckId: 'asc' } });
  return json({
    decks: rows.map((d) => ({ id: d.deckId, name: d.name, version: d.version, deleted: d.deleted, updated_at: d.updatedAt })),
  });
});
