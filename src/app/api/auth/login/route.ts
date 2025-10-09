import { NextRequest, NextResponse } from 'next/server';
import { login as loginCore } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'MISSING_CREDENTIALS' }, { status: 400 });
  }


  const result = await loginCore(email, password);

  if (!result.success) {
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: result.user, 
  });
}
