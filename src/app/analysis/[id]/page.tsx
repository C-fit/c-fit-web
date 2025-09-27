import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AnalysisClient from '@/components/analysis/analysis-client';

export default async function AnalysisPage(
  props: { params: Promise<{ id: string }> } // ✅ Next 최신: params는 Promise일 수 있음
) {
  const { id } = await props.params; // ✅ 반드시 await
  const session = await getSession().catch(() => null);
  if (!session?.user) redirect(`/login?next=/analysis/${id}`);
  return <AnalysisClient resultId={id} />;
}
