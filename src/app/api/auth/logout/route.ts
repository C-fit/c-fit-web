import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/server/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  return clearSessionCookie(res); 
}

export async function GET() {
  const res = NextResponse.json({ ok: true });
  return clearSessionCookie(res);
}
