import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
