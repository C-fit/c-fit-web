"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, CheckCircle2, ExternalLink } from "lucide-react";
import { normalizeFit, FitView } from "@/lib/fit-parsers";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useSearchParams } from "next/navigation";
import { EXAMPLE_COMPARISON, EXAMPLE_REVIEW } from "@/demo/analysis-examples";


type APIItem = any;

export default function AnalysisClient({ resultId }: { resultId: string }) {
  const [item, setItem] = useState<APIItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notified, setNotified] = useState(false);
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const firstComplete = useRef(false);
  const search = useSearchParams();
  const demo = search.get("demo"); // 'comparison' | 'review' | null
  const demoText = demo === "review" ? EXAMPLE_REVIEW : demo === "comparison" ? EXAMPLE_COMPARISON : null;


  // 1) 폴링으로 결과 대기 (3초 간격)
  useEffect(() => {
    let stop = false;
    // ✅ 데모: 바로 결과 주입
    if (demoText) {
      setItem({
        id: "demo",
        status: "completed",
        raw: demoText,   // 문자열 그대로 저장 → 파서가 읽음
        summary: null,
        score: null,
      });
      setLoading(false);
      return () => { stop = true; };
    }
    async function tick() {
      try {
        const res = await fetch(`/api/fit/${resultId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("load failed");
        const data = await res.json();
        setItem(data.item);
        const done = (data.item?.status ?? "completed") === "completed";
        if (done && !firstComplete.current) {
          firstComplete.current = true;
          fireNotify();
        }
        if (!stop && !done) setTimeout(tick, 3000);
        else setLoading(false);
      } catch {
        if (!stop) setTimeout(tick, 5000);
      }
    }
    tick();
    return () => { stop = true; };
  }, [resultId]);

  // 2) 브라우저 알림
  function askPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission();
  }
  function fireNotify() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted" && !notified) {
      new Notification("FIT 분석 완료", {
        body: "결과가 준비되었습니다. 클릭하면 페이지로 이동합니다.",
      });
      setNotified(true);
    }
  }

  // 3) 뷰 모델
  const view: FitView = useMemo(() => normalizeFit(item ?? {}), [item]);

  const isDone = !!item && item.status === 'completed';
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">FIT 분석 결과</h1>
          {isDone ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-4 w-4" /> 완료
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-4 w-4 animate-spin" /> 분석 중 (약 1~2분)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isDone && (
            <Button variant="outline" size="sm" onClick={askPermission}>
              <Bell className="h-4 w-4 mr-1" />
              완료 알림 받기
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>
      </div>

      {/* Loading skeleton */}
      {!isDone && (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground">
              분석을 진행 중입니다. 잠시만 기다려 주세요… 페이지를 이동해도 알림을 통해 알려드릴 수 있어요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Completed view */}
      {isDone && (
        <>
          {/* 3-1. Score + Summary */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>종합 점수</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8">
                <div
                  className="relative grid place-items-center rounded-full"
                  style={{
                    width: 160, height: 160,
                    background: `conic-gradient(var(--primary) ${Math.max(0, Math.min(100, view.score ?? 0)) * 3.6}deg, hsl(var(--muted)) 0deg)`
                  }}
                >
                  <div className="absolute inset-3 rounded-full bg-background grid place-items-center">
                    <div className="text-4xl font-bold">{view.score ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">/100</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>요약</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap leading-7">
                  {view.summary || "요약이 제공되지 않았습니다."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 3-2. Radar (역량별) + Bar (세부기준) */}
          {view.dimensions?.length ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>역량 레이더</CardTitle>
                </CardHeader>
                <CardContent style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={view.dimensions}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>세부 기준 점수</CardTitle>
                </CardHeader>
                <CardContent style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={view.dimensions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* 3-3. 피드백(강점/보완/추천) – 펼쳐보기 */}
          <div className="grid gap-6 lg:grid-cols-3">
            <FeedbackCard
              title="강점"
              items={view.strengths ?? []}
              open={!!showAll["s"]}
              onToggle={() => setShowAll((s) => ({ ...s, s: !s.s }))}
            />
            <FeedbackCard
              title="보완이 필요한 점"
              items={view.gaps ?? []}
              open={!!showAll["g"]}
              onToggle={() => setShowAll((s) => ({ ...s, g: !s.g }))}
            />
            <FeedbackCard
              title="추천 액션"
              items={view.recommendations ?? []}
              open={!!showAll["r"]}
              onToggle={() => setShowAll((s) => ({ ...s, r: !s.r }))}
            />
          </div>

          {/* 3-4. 원문 보기 (선택) */}
          {item?.rawText || typeof item?.raw === "string" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  원문 리포트
                  <Button variant="ghost" size="sm" asChild>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText((item?.rawText || item?.raw) as string); }}>
                      복사 <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {(item?.rawText || item?.raw) as string}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

/** 접기/펼치기 카드 */
function FeedbackCard({
  title, items, open, onToggle,
}: { title: string; items: string[]; open: boolean; onToggle: () => void }) {
  const MAX = 4;
  const sliced = open ? items : items.slice(0, MAX);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sliced.length ? (
          <ul className="list-disc pl-5 space-y-1">
            {sliced.map((t, i) => <li key={i} className="text-sm leading-6">{t}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">내용이 없습니다.</p>
        )}
        {items.length > MAX && (
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {open ? "간단히 보기" : "자세히 보기"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
