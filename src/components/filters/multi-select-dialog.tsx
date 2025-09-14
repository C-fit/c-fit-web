// src/components/filters/multi-select-dialog.tsx
"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  triggerLabel: string;     // 버튼 텍스트 (예: "기술스택")
  options: string[];        // 선택지
  value: string[];          // 현재 선택값
  onChange: (next: string[]) => void;
  placeholder?: string;     // 검색 placeholder
};

export function MultiSelectDialog({
  triggerLabel, options, value, onChange, placeholder
}: Props) {
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState("");

  const filtered = useMemo(() => {
    if (!kw.trim()) return options;
    const k = kw.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(k));
  }, [kw, options]);

  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt));
    else onChange([...value, opt]);
  };

  const clear = () => onChange([]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {triggerLabel}{value.length ? ` (${value.length})` : ""}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <Input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder={placeholder || "검색어를 입력하세요."}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[360px] overflow-auto">
          {filtered.map((opt) => {
            const active = value.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className={`rounded-full border px-3 py-1.5 text-sm transition
                  ${active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
              >
                {opt}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground py-8 text-center">
              결과가 없습니다.
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={clear}>초기화</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={() => setOpen(false)}>적용</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
