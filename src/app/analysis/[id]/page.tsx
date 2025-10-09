import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth'; // 사용 중인 세션 헬퍼에 맞춰서
import AnalysisClient from '@/components/analysis/analysis-client';

type PageProps = { params: Promise<{ id: string }> };

export default async function AnalysisPage({ params }: PageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session?.user) {
    redirect(`/login?next=/analysis/${id}`);
  }

  return <AnalysisClient resultId={id} />;
}
