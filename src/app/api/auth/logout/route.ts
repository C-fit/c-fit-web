import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

// 선택: GET도 허용하고 싶다면 추가
export async function GET() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
