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
import { useToast } from '@/hooks/use-toast';

type Item = {
  id: string;
  url: string;
  companyName?: string | null;
  title: string;
  jobName?: string | null;
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
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(Boolean(item.saved));

  async function toggleSave() {
    if (pending) return;

    const prev = saved;
    const next = !prev;

    setPending(true);
    setSaved(next);
    onSavedChange?.(item.id, next);
    try {
      const res = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId: item.id, save: next }),
      });
      if (res.status === 401) {
        setSaved(prev);
        onSavedChange?.(item.id, prev);

        toast({
          variant: 'destructive',
          title: '로그인 필요',
          description: '관심공고 저장을 위해 로그인 해주세요.',
        });

        const nextUrl =
          window.location.pathname +
          window.location.search +
          window.location.hash;
        window.location.href = '/login?next=' + encodeURIComponent(nextUrl);
        return;
      }
      if (!res.ok) throw new Error('save failed : ${res.status}');

      const data = (await res.json().catch(() => ({}))) as { saved?: boolean };
      const serverSaved = Boolean(data.saved);
      setSaved(serverSaved);
      onSavedChange?.(item.id, serverSaved);
    } catch (e) {
      setSaved(prev);
      onSavedChange?.(item.id, prev);
      toast({
        variant: 'destructive',
        title: '관심공고 저장 실패',
        description:
          '관심공고 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      });
      console.error(e);
    } finally {
      setPending(false);
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
          경력: {item.experienceLevel ?? '경력무관'}
        </div>
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
