import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Next.js 15: params는 Promise여서 await 해야 함
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const found = await prisma.fitResult.findUnique({
    where: { id },
  });
  if (!found) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(found);
}
