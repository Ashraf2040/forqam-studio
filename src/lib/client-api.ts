// Browser-side fetch helper for the shell: same contract the original page used (network errors become a 503 Response).
export async function apiFetch(path: string, init: { method?: string; body?: unknown } = {}): Promise<Response> {
  try {
    const method = (init.method ?? 'GET').toUpperCase();
    const req: RequestInit = { method, credentials: 'same-origin', cache: 'no-store' };
    if (init.body !== undefined && method !== 'GET') {
      req.body = JSON.stringify(init.body);
      req.headers = { 'Content-Type': 'application/json' };
    }
    return await fetch(path, req);
  } catch {
    return new Response(JSON.stringify({ error: 'network error', offline: true }), {
      status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
