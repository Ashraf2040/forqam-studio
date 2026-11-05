import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** Wrap a route handler: ApiError -> {error,...extra} with its status; anything else -> 503 offline-style error. */
export function handle<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A) => {
    try {
      return await fn(...a);
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.message, ...(e.extra ?? {}) }, e.status);
      console.error('api error', e);
      return json({ error: 'service temporarily unavailable, please try again' }, 503);
    }
  };
}

export async function readBody(req: Request): Promise<Record<string, any>> {
  try {
    const b = await req.json();
    return b && typeof b === 'object' ? b : {};
  } catch {
    return {};
  }
}
