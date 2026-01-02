'use client';

import { useEffect, useRef, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Upload, FileText, Sparkles, Loader2 } from 'lucide-react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

type SavedItem = {
  id: string;
  url: string;
  title: string;
  companyName?: string | null;
  jobName?: string | null;
};

type ResumeMeta = {
  id: string;
  originalName: string;
  size: number;
  createdAt: string;
};

type UserShape = { name?: string | null; id?: string };

export function DashboardBody({ user }: { user: UserShape }) {
  const router = useRouter();
  // --- 이력서 업로드 ---
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openRemoveResume, setOpenRemoveResume] = useState(false);
  const [removingResume, setRemovingResume] = useState(false);
  const [resumeOk, setResumeOk] = useState<boolean>(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [resumeMeta, setResumeMeta] = useState<ResumeMeta | null>(null);
  const [openNeedResume, setOpenNeedResume] = useState(false);
  const fmtBytes = (n: number) =>
    n >= 1024 * 1024
      ? `${(n / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.max(1, Math.round(n / 1024))} KB`;

  // --- 관심 공고 목록 ---
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  //--Fit 분석 요청---
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // drag & drop 리스너
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const preventAll: EventListener = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const dt = e.dataTransfer;
      if (!dt || !dt.files?.length) return;
      const f = dt.files[0];
      if (f && f.type === 'application/pdf') {
        setFile(f);
      } else {
        toast({
          variant: 'destructive',
          title: '업로드 실패',
          description: 'PDF 파일만 업로드할 수 있습니다.',
        });
      }
    };

    const dragHoverEvents = ['dragenter', 'dragover', 'dragleave'] as const;
    dragHoverEvents.forEach((t) => el.addEventListener(t, preventAll));
    el.addEventListener('drop', onDrop);

    return () => {
      dragHoverEvents.forEach((t) => el.removeEventListener(t, preventAll));
      el.removeEventListener('drop', onDrop);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/resume', {
          cache: 'no-store',
          credentials: 'include',
        });
        const json = await res.json();
        setResumeOk(!!json.latest?.id); // 최신 이력서가 있으면 true
      } catch {}
    })();
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

  // 페이지 진입 시 최신 이력서 메타 받기
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/resume', {
          cache: 'no-store',
          credentials: 'include',
        });
        const json = await res.json();
        const latest = json?.latest;
        if (latest?.id) {
          setResumeMeta(latest);
          setResumeOk(true);
        } else {
          setResumeMeta(null);
          setResumeOk(false);
        }
      } catch {
        setResumeMeta(null);
      }
    })();
  }, []);

  // 삭제 핸들러
  async function removeSaved(jobId: string) {
    const snapshot = saved;
    setSaved((prev) => prev.filter((s) => s.id !== jobId));
    try {
      const res = await fetch(`/api/saved?id=${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('failed');
      toast({
        title: '관심공고 해제 완료',
        description: '관심공고에서 해제되었습니다.',
      });
    } catch {
      setSaved(snapshot);
      toast({
        variant: 'destructive',
        title: '관심공고 해제 실패',
        description: '잠시 후 다시 시도해 주세요.',
      });
    }
  }

  // 업로드 실행
  async function handleUpload() {
    if (!file)
      return toast({
        variant: 'destructive',
        title: '업로드 실패',
        description: 'PDF 파일을 선택해 주세요.',
      });
    if (file.type !== 'application/pdf')
      return toast({
        variant: 'destructive',
        title: '업로드 실패',
        description: 'PDF 파일만 업로드할 수 있습니다.',
      });
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
      const json = await res.json().catch(() => ({}));
      // 최신 메타 갱신
      if (json?.latest) {
        setResumeMeta(json.latest);
      }
      setResumeOk(true);
      toast({
        title: '업로드 성공',
        description: '이력서가 업로드되었습니다.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: '업로드 실패',
        description: '업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setUploading(false);
    }
  }

  // 업로드된 이력서 삭제
  async function removeResumeConfirmed() {
    setRemovingResume(true);
    try {
      const res = await fetch('/api/resume', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error();

      setResumeMeta(null);
      setResumeOk(false);
      setFile(null);

      toast({
        title: '삭제 완료',
        description: '새로운 이력서를 업로드해 주세요.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: '잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setRemovingResume(false);
      setOpenRemoveResume(false);
    }
  }

  // FIT 분석
  async function analyzeFit(item: SavedItem) {
    if (!resumeOk) {
      setOpenNeedResume(true);
      return;
    }

    setIsAnalyzing(true);

    try {
      // JSON 경로: 서버가 최신 이력서를 자동 사용
      const res = await fetch('/api/fit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jd_url: item.url }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.detail || data?.error || 'analyze failed');

      const resultId = data.resultId || data.id;
      if (resultId) {
        router.push(`/analysis/${resultId}`);
      } else {
        toast({
          title: '분석 요청 접수',
          description:
            '분석 요청이 접수되었습니다. 결과 페이지에서 확인해 주세요.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '분석 요청 실패',
        description: '분석 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setIsAnalyzing(false);
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
              {/* 현재 업로드된 이력서 표시 + 삭제 버튼 */}
              {resumeMeta && (
                <div className='flex items-center justify-between rounded-md border p-3 bg-muted/40'>
                  <div className='min-w-0'>
                    <div className='font-medium truncate'>
                      {resumeMeta.originalName}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {fmtBytes(resumeMeta.size)} ·{' '}
                      {new Date(resumeMeta.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setOpenRemoveResume(true)}
                    className='hover:bg-destructive/10 text-destructive'
                    title='이력서 삭제'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                  <AlertDialog
                    open={openRemoveResume}
                    onOpenChange={setOpenRemoveResume}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          이력서를 삭제할까요?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          삭제하면 현재 업로드된 이력서 파일을 다시 사용할 수
                          없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={removingResume}>
                          취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={removeResumeConfirmed}
                          disabled={removingResume}
                        >
                          {removingResume ? '삭제 중...' : '삭제'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {/* 드롭존: 이미 업로드가 있으면 비활성 안내 */}
              <div
                className={
                  'border-2 border-dashed rounded-xl p-6 text-center transition-colors ' +
                  (resumeMeta
                    ? 'opacity-50 pointer-events-none'
                    : 'hover:bg-muted/50 cursor-pointer')
                }
                onClick={() => !resumeMeta && inputRef.current?.click()}
              >
                <p className='text-sm text-muted-foreground'>
                  이곳에 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요.
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  PDF만 가능, 최대 20MB 권장
                </p>
                {resumeMeta && (
                  <p className='text-xs text-muted-foreground mt-2'>
                    새로운 파일을 올리려면 위의 <b>X</b>로 삭제한 뒤
                    업로드하세요.
                  </p>
                )}
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
                  disabled={!!resumeMeta}
                />
                <Input
                  readOnly
                  value={file ? file.name : ''}
                  placeholder='선택된 파일이 없습니다.'
                  disabled={!!resumeMeta}
                />
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !!resumeMeta || !file}
                >
                  {uploading ? (
                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  ) : null}
                  업로드
                </Button>
              </div>

              {resumeOk && !resumeMeta && (
                <div className='text-sm text-green-600'>
                  이력서 업로드 완료 ✅
                </div>
              )}

              <AlertDialog
                open={openNeedResume}
                onOpenChange={setOpenNeedResume}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      이력서 업로드가 필요합니다
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      FIT 분석을 하려면 먼저 이력서를 업로드해 주세요.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>나중에</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setOpenNeedResume(false);
                        dropRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      업로드하러 가기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {saved.slice(0, 8).map((it) => (
                    <div
                      key={it.id}
                      className='relative box-border overflow-hidden rounded-lg border bg-card p-3 max-w-full'
                    >
                      {/* 닫기(X) */}
                      <button
                        aria-label='관심공고 취소'
                        className='absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted/60'
                        onClick={() => removeSaved(it.id)}
                        title='관심 해제'
                      >
                        <X className='h-4 w-4' />
                      </button>

                      {/* 텍스트 영역 */}
                      <div className='min-w-0 pr-8'>
                        <div className='text-sm font-medium truncate'>
                          {it.title}
                        </div>
                        <div className='text-xs text-muted-foreground mt-1 truncate'>
                          {it.companyName} {it.jobName ? `· ${it.jobName}` : ''}
                        </div>
                      </div>

                      {/* 액션 버튼들 */}
                      <div className='mt-2 flex flex-wrap items-center gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='whitespace-nowrap'
                          onClick={() => window.open(it.url, '_blank')}
                        >
                          공고보기
                        </Button>
                        <Button
                          size='sm'
                          variant='gradient'
                          className='whitespace-nowrap'
                          onClick={() => analyzeFit(it)}
                        >
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
        <Dialog open={isAnalyzing} onOpenChange={setIsAnalyzing}>
          <DialogContent className='sm:max-w-[380px]'>
            <DialogHeader className='space-y-2'>
              <div className='flex items-center gap-3'>
                <Loader2 className='h-5 w-5 animate-spin' />
                <DialogTitle>이력서를 분석 중입니다</DialogTitle>
              </div>
              <DialogDescription>
                잠시만 기다려주세요(1~2분 소요)
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
