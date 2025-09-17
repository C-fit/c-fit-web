'use client';

import { useEffect, useRef, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Sparkles, Loader2 } from 'lucide-react';

type SavedItem = {
  id: string;
  url: string;
  title: string;
  companyName?: string | null;
  jobName?: string | null;
};

type UserShape = { name?: string | null; id?: string };

export function DashboardBody({ user }: { user: UserShape }) {
  // --- 이력서 업로드 ---
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resumeOk, setResumeOk] = useState<boolean>(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- 관심 공고 목록 ---
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // drag & drop 리스너
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      const dt = e.dataTransfer;
      if (!dt || !dt.files?.length) return;
      const f = dt.files[0];
      if (f && f.type === 'application/pdf') {
        setFile(f);
      } else {
        alert('PDF 파일만 업로드할 수 있습니다.');
      }
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((t) =>
      el.addEventListener(t, prevent as any)
    );
    el.addEventListener('drop', onDrop as any);

    return () => {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((t) =>
        el.removeEventListener(t, prevent as any)
      );
      el.removeEventListener('drop', onDrop as any);
    };
  }, []);

  // 관심 공고 불러오기
  useEffect(() => {
    (async () => {
      setSavedLoading(true);
      try {
        const res = await fetch('/api/saved', {
          cache: 'no-store',
          credentials: 'include', // 쿠키 포함
        });
        const json = await res.json().catch(() => ({ items: [] }));
        setSaved(json.items ?? []);
      } catch {
        setSaved([]);
      } finally {
        setSavedLoading(false);
      }
    })();
  }, []);

  // 업로드 실행
  async function handleUpload() {
    if (!file) return alert('PDF 파일을 선택해 주세요.');
    if (file.type !== 'application/pdf')
      return alert('PDF 파일만 업로드할 수 있습니다.');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const res = await fetch('/api/resume', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('upload failed');
      setResumeOk(true);
      alert('이력서가 업로드되었습니다.');
    } catch {
      alert('업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setUploading(false);
    }
  }

  // FIT 분석
  async function analyzeFit(item: SavedItem) {
    if (!resumeOk) {
      const go = confirm(
        '이력서가 업로드되어 있어야 합니다. 지금 업로드하시겠어요?'
      );
      if (go) dropRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    try {
      const res = await fetch('/api/fit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobUrl: item.url }),
      });
      if (!res.ok) throw new Error('analyze failed');
      const data = await res.json();
      const resultId = data.resultId || data.id || '';
      if (resultId) {
        window.location.href = `/analysis/${resultId}`;
      } else {
        alert('분석 요청이 접수되었습니다. 결과 페이지에서 확인해 주세요.');
      }
    } catch {
      alert('분석 요청에 실패했습니다.');
    }
  }

  return (
    <div className='min-h-screen bg-background'>
      <Navigation />

      <main className='container mx-auto px-4 py-8 space-y-8'>
        <div>
          <h1 className='text-3xl font-bold'>
            안녕하세요, {user?.name ?? '사용자'}님 👋
          </h1>
          <p className='text-muted-foreground mt-1'>
            이력서를 업로드하고, 저장해 둔 관심 공고를 바로 분석해 보세요.
          </p>
        </div>

        <div className='grid gap-6 lg:grid-cols-2'>
          {/* 왼쪽: 이력서 업로드 */}
          <Card ref={dropRef}>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Upload className='h-5 w-5' />
                이력서 업로드(PDF)
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div
                className='border-2 border-dashed rounded-xl p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer'
                onClick={() => inputRef.current?.click()}
              >
                <p className='text-sm text-muted-foreground'>
                  이곳에 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요.
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  PDF만 가능, 최대 20MB 권장
                </p>
              </div>

              <div className='flex items-center gap-2'>
                <Input
                  ref={inputRef}
                  id='resumeInput'
                  type='file'
                  accept='application/pdf'
                  className='hidden'
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                />
                <Input
                  readOnly
                  value={file ? file.name : ''}
                  placeholder='선택된 파일이 없습니다.'
                />
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? (
                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  ) : null}
                  업로드
                </Button>
              </div>

              {resumeOk && (
                <div className='text-sm text-green-600'>
                  이력서 업로드 완료 ✅
                </div>
              )}
            </CardContent>
          </Card>

          {/* 오른쪽: 관심 공고 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <FileText className='h-5 w-5' />내 관심 공고
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {savedLoading ? (
                <div className='text-sm text-muted-foreground'>
                  불러오는 중…
                </div>
              ) : saved.length === 0 ? (
                <div className='text-sm text-muted-foreground'>
                  아직 관심 공고가 없습니다.{' '}
                  <Button
                    variant='link'
                    className='px-1'
                    onClick={() => (window.location.href = '/jobs')}
                  >
                    채용공고 보러가기
                  </Button>
                </div>
              ) : (
                <div className='grid sm:grid-cols-2 gap-3'>
                  {saved.slice(0, 8).map((it) => (
                    <div key={it.id} className='p-3 rounded-lg border'>
                      <div className='text-sm font-medium line-clamp-2'>
                        {it.title}
                      </div>
                      <div className='text-xs text-muted-foreground mt-1'>
                        {it.companyName} {it.jobName ? `· ${it.jobName}` : ''}
                      </div>
                      <div className='flex items-center gap-2 mt-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => window.open(it.url, '_blank')}
                        >
                          공고보기
                        </Button>
                        <Button size='sm' onClick={() => analyzeFit(it)}>
                          <Sparkles className='h-4 w-4 mr-1' />
                          FIT 분석하기
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
