// components/jobs/job-card.tsx
'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, ExternalLink } from 'lucide-react';
import { useState } from 'react';

type Item = {
  id: string;
  url: string;
  companyName?: string | null;
  title: string;
  jobName?: string | null;
  techStacks: string[];
  experienceLevel?: string | null;
  careerYears: number[];
  location?: string | null;
  deadline?: string | null;
  saved?: boolean;
};

export function JobCard({
  item,
  onSavedChange,
}: {
  item: Item;
  onSavedChange?: (id: string, saved: boolean) => void;
}) {
  const [pending] = useState(false);
  const [saved, setSaved] = useState(!!item.saved);

  async function toggleSave() {
    try {
      const res = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ← 쿠키 포함
        body: JSON.stringify({ jobId: item.id, save: !saved }),
      });
      if (res.status === 401) {
        // 로그인 만료/미로그인: 로그인 페이지로 유도
        window.location.href =
          '/login?next=' + encodeURIComponent(window.location.pathname);
        return;
      }
      if (!res.ok) throw new Error('save failed');
      const data = await res.json();
      setSaved(!!data.saved);
      onSavedChange?.(item.id, !!data.saved);
    } catch (e) {
      console.error(e);
      alert('관심공고 저장에 실패했습니다.');
    }
  }

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='space-y-1'>
        <CardTitle className='text-lg leading-tight'>{item.title}</CardTitle>
        <div className='text-sm text-muted-foreground'>
          {item.companyName ?? '-'}
        </div>
      </CardHeader>
      <CardContent className='flex-1 space-y-2'>
        <div className='text-sm'>{item.jobName ?? ''}</div>
        <div className='text-xs text-muted-foreground'>
          경력: {item.experienceLevel ?? '경력무관'} · 연차:{' '}
          {Math.min(...item.careerYears)}~{Math.max(...item.careerYears)}년
        </div>
        {item.techStacks?.length > 0 && (
          <div className='flex flex-wrap gap-2 mt-2'>
            {item.techStacks.slice(0, 8).map((t) => (
              <span key={t} className='text-xs border rounded px-2 py-0.5'>
                {t}
              </span>
            ))}
            {item.techStacks.length > 8 && (
              <span className='text-xs text-muted-foreground'>
                +{item.techStacks.length - 8}
              </span>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className='flex gap-2 justify-end'>
        <Button
          variant='ghost'
          size='icon'
          onClick={toggleSave}
          disabled={pending}
          title={saved ? '저장 해제' : '저장'}
        >
          <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
        </Button>
        <a href={item.url} target='_blank' rel='noreferrer'>
          <Button variant='secondary' size='sm'>
            상세보기 <ExternalLink className='h-4 w-4 ml-1' />
          </Button>
        </a>
      </CardFooter>
    </Card>
  );
}
