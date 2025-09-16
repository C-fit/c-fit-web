import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'uid';

/** 쿠키에서 사용자 식별값을 읽고, DB User를 보장하여 id를 반환합니다. */
export async function getOrCreateUserIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(AUTH_COOKIE)?.value;
  if (!raw) return null;

  // 이메일이면 email 기준 upsert
  if (raw.includes('@')) {
    const user = await prisma.user.upsert({
      where: { email: raw },
      update: {},
      create: { email: raw, passwordHash: 'external-auth' },
      select: { id: true },
    });
    return user.id;
  }

  // 이메일이 아니면 raw를 id로 간주
  const found = await prisma.user.findUnique({
    where: { id: raw },
    select: { id: true },
  });
  if (found) return found.id;

  const placeholderEmail = `user-${raw}@local.invalid`;
  const created = await prisma.user.create({
    data: { id: raw, email: placeholderEmail, passwordHash: 'external-auth' },
    select: { id: true },
  });
  return created.id;
}
