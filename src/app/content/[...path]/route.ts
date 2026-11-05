import { promises as fs } from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

/*
 * Daily content feed used by the Studio screen ("Get today's content").
 * Format (same as the original):
 *   /content/index.json               -> { "days": ["2026-10-27", ...] }
 *   /content/<day>/pack.json          -> { "packs": [...question files...], "decks": [{ "id", "name", "file" }] }
 *   /content/<day>/<deck file>        -> presentation file
 * Source, in order: the local ./content folder of this project; else CONTENT_PROXY_BASE (any web folder with the same layout);
 * else an empty index so the screen reports "Already up to date".
 */
const ROOT = path.join(process.cwd(), 'content');
const TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppsx': 'application/vnd.openxmlformats-officedocument.presentationml.slideshow', '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
};
const H = { 'Cache-Control': 'no-store' };

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segs } = await ctx.params;
  if (!segs.length || segs.some((s) => !s || s === '.' || s === '..' || s.includes('/') || s.includes('\\') || s.includes('\0'))) {
    return new Response('not found', { status: 404 });
  }
  const file = path.join(ROOT, ...segs);
  if (!file.startsWith(ROOT + path.sep)) return new Response('not found', { status: 404 });
  try {
    const buf = await fs.readFile(file);
    return new Response(new Uint8Array(buf), { headers: { ...H, 'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream' } });
  } catch { /* not in the local folder */ }

  const base = (process.env.CONTENT_PROXY_BASE || '').replace(/\/+$/, '');
  if (base) {
    try {
      const r = await fetch(base + '/' + segs.map(encodeURIComponent).join('/'), { cache: 'no-store' });
      if (r.ok) {
        return new Response(r.body, { headers: { ...H, 'Content-Type': r.headers.get('content-type') ?? 'application/octet-stream' } });
      }
      return new Response('not found', { status: r.status === 404 ? 404 : 502 });
    } catch {
      return new Response('content source unreachable', { status: 502 });
    }
  }
  if (segs.length === 1 && segs[0] === 'index.json') {
    return new Response(JSON.stringify({ days: [] }), { headers: { ...H, 'Content-Type': TYPES['.json'] } });
  }
  return new Response('not found', { status: 404 });
}
