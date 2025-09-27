import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getSession(); // getSession 내부에서 await cookies()

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({ user: session.user });
  } catch {
    return NextResponse.json({ error: 'Session invalid' }, { status: 401 });
  }
}
