'use client';
import Link from 'next/link';
import {
  Sparkles,
  BookmarkPlus,
  FileUp,
  LineChart,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

function useReveal<T extends HTMLElement>(once = true, threshold = 0.18) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            if (once) io.unobserve(e.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold]);
  return { ref, visible };
}

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'reveal-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function StepCard({
  icon,
  title,
  body,
  ctaHref,
  ctaLabel,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className='rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-[2px]'>
        <div className='mb-4 flex items-center gap-2'>
          <div className='inline-flex items-center justify-center bg-brand-gradient p-[2px] rounded-full'>
            <div
              className='h-10 w-10 rounded-full flex items-center justify-center'
              style={{
                background: 'var(--background)',
                color: 'var(--primary)',
              }}
            >
              {icon}
            </div>
          </div>
          <h3 className='text-lg font-semibold'>{title}</h3>
        </div>
        <p className='text-sm text-muted-foreground leading-relaxed'>{body}</p>
        <Button asChild variant='gradient' size='sm' className='mt-5'>
          <Link href={ctaHref}>
            {ctaLabel}
            <ArrowRight className='ml-1 h-4 w-4' />
          </Link>
        </Button>
      </div>
    </Reveal>
  );
}

/** B안: 상태로 토글해 에러 시 이미지를 숨김 (any 제거) */
function SmartImage({
  src,
  alt,
  heightClass,
  mode = 'contain',
  className = '',
  blur = false,
  focal = 'center',
}: {
  src: string;
  alt: string;
  heightClass: string;
  mode?: 'contain' | 'cover';
  className?: string;
  blur?: boolean;
  focal?: string; // e.g., 'center' 또는 '50% 20%'
}) {
  const [hidden, setHidden] = useState(false);

  return (
    <div
      className={`relative w-full ${heightClass} overflow-hidden rounded-lg bg-muted/60`}
    >
      {!hidden && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes='100vw'
          className={`${mode === 'cover' ? 'object-cover' : 'object-contain'} ${
            blur ? 'blur-[1.5px] saturate-90' : ''
          } ${className}`}
          style={{ objectPosition: focal }}
          onError={() => {
            setHidden(true);
          }}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className='min-h-screen bg-background'>
      <Navigation />

      <main className='container mx-auto px-4 py-10'>
        {/* HERO */}
        <section className='relative text-center py-14 md:py-18'>
          <Reveal>
            <div className='max-w-3xl mx-auto space-y-6'>
              <div className='flex items-center justify-center gap-2 mb-2'>
                <Sparkles className='h-7 w-7 text-primary' />
                <Badge variant='secondary' className='text-sm'>
                  취업 코치
                </Badge>
              </div>

              <h1 className='text-4xl md:text-5xl font-bold text-balance'>
                채용 공고에
                <br />
                <span className='text-brand-gradient'>딱 맞는 이력서</span>
              </h1>

              <p className='text-lg md:text-xl text-muted-foreground text-pretty max-w-2xl mx-auto'>
                원하는 기업의 채용 공고에 맞춰
                <span className='block'>
                  AI가 적합도를 분석하고 합격률을 높이는 방법을 제안합니다.
                </span>
              </p>
            </div>
          </Reveal>
        </section>

        {/* HOW IT WORKS */}
        <section className='py-6 md:py-10'>
          <Reveal>
            <h2 className='text-2xl md:text-3xl font-semibold text-center mb-8'>
              3단계로 끝나는 <span className='text-brand-gradient'>C:Fit</span>{' '}
              사용법
            </h2>
          </Reveal>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 items-center'>
            {/* Step 1 */}
            <StepCard
              icon={<BookmarkPlus className='h-5 w-5' />}
              title='1) 관심 공고 등록'
              body='원하는 공고를 저장하고 내 관심 목록을 만듭니다. 크롤러가 매일 최신 정보를 적재하므로 공고 링크만 등록해도 준비 완료!'
              ctaHref='/jobs'
              ctaLabel='관심 공고 찾기'
              delay={50}
            />

            {/* Step 2 */}
            <StepCard
              icon={<FileUp className='h-5 w-5' />}
              title='2) 이력서 업로드'
              body='PDF로 된 이력서를 업로드하면 Vercel Blob에 안전하게 보관됩니다. 대시보드에서 최신 파일을 쉽게 교체할 수 있어요.'
              ctaHref='/dashboard'
              ctaLabel='이력서 업로드'
              delay={150}
            />

            {/* Step 3 */}
            <StepCard
              icon={<LineChart className='h-5 w-5' />}
              title='3) Fit 분석 받기'
              body='선택한 관심 공고와 내 이력서를 매칭해 원클릭으로 Fit 리포트를 생성합니다. 점수/강점/개선점과 함께 구체적인 Next Steps를 제공합니다.'
              ctaHref='/dashboard'
              ctaLabel='분석 시작하기'
              delay={250}
            />
          </div>
        </section>

        <section className='py-12'>
          <Reveal>
            <div className='rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-6 md:p-8'>
              <div className='mx-auto w-full max-w-screen-xl'>
                <h3 className='text-xl md:text-2xl font-semibold text-center mb-8'>
                  이렇게 생성돼요 —{' '}
                  <span className='text-brand-gradient'>
                    관심 공고 + 내 이력서 = Fit 리포트
                  </span>
                </h3>

                <div
                  className='
            grid grid-cols-1
            lg:grid-cols-[minmax(0,1fr)_56px_minmax(0,1.2fr)]
            xl:grid-cols-[minmax(360px,460px)_64px_minmax(560px,720px)]
            lg:grid-rows-[auto_auto_auto]
            gap-x-8 gap-y-6
            items-start
            justify-center        
          '
                >
                  {/* (좌) 상단: 관심 공고 */}
                  <div className='rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3 lg:row-start-1 lg:col-start-1'>
                    <div className='text-sm font-medium mb-2'>관심 공고</div>
                    <SmartImage
                      src='/jd-sample.png'
                      alt='관심 공고'
                      heightClass='h-[220px] md:h-[240px] lg:h-[260px]'
                      mode='contain'
                    />
                  </div>

                  {/* (좌) 가운데: + 기호 (그리드의 2번째 행) */}
                  <div className='flex items-center justify-center text-muted-foreground lg:row-start-2 lg:col-start-1'>
                    <Plus className='h-6 w-6' />
                  </div>

                  {/* (좌) 하단: 이력서 */}
                  <div className='rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3 lg:row-start-3 lg:col-start-1'>
                    <div className='text-sm font-medium mb-2'>내 이력서</div>
                    <SmartImage
                      src='/resume-sample.png'
                      alt='가상의 이력서'
                      heightClass='h-[220px] md:h-[240px] lg:h-[260px]'
                      mode='contain'
                    />
                  </div>

                  {/* (가운데) 화살표 */}
                  <div className='hidden lg:flex lg:col-start-2 lg:row-span-3 place-self-center'>
                    <ArrowRight className='h-10 w-10 text-muted-foreground' />
                  </div>

                  {/* (우) 결과 리포트 */}
                  <div
                    className='rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3
                  lg:col-start-3 lg:row-span-3 h-full flex flex-col'
                  >
                    <div className='text-sm font-medium mb-2'>Fit 리포트</div>
                    <div className='flex-1'>
                      <SmartImage
                        src='/report-blurred.png'
                        alt='분석 리포트 미리보기'
                        heightClass='h-full'
                        mode='contain'
                        blur
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
