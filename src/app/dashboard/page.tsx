'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { DashboardBody } from './parts/DashboardBody';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 인증 게이트만 처리 (Hook은 항상 최상단에서 호출)
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return null;

  // 실제 UI/로직은 모두 자식에서 처리 → Hook 호출 순서 안정
  return <DashboardBody user={user} />;
}
