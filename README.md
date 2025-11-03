# C:Fit — JD 기반 이력서 Fit 분석 웹

“관심 공고 + 이력서 → Fit 리포트”를 **원클릭**으로 만드는 웹 서비스입니다.
이력서를 공고에 맞춰 정렬하고, 점수·요약·강점·개선·추천을 한 화면에서 확인할 수 있어요.

* 배포: **[https://c-fit-web.vercel.app/](https://c-fit-web.vercel.app/)**
* 레포: **[https://github.com/C-fit/c-fit-web](https://github.com/C-fit/c-fit-web)**

---

## 🧱 스택

* **Web**: Next.js 15(App Router), TypeScript, Tailwind + shadcn/ui
* **DB**: Prisma + Neon(PostgreSQL)
* **File**: Vercel Blob(이력서 PDF 저장)
* **Auth**: jose(JWT) + httpOnly Cookie
* **Infra**: GitHub Actions(크롤러 스케줄링)

---

## ✨ 구현 기능(핵심)

### 화면 & UX

* **분석(Analysis) — Bento Grid**: 점수/요약/강점/개선/추천을 카드로 나눠 한눈에. 파싱 실패 시에도 **원문 텍스트 기반 fallback** 요약 보장.
* **채용공고(Jobs)**: 키워드/직무(다중)/회사/경력 레이블 + **경력 슬라이더(0~20년)** + 정렬, 페이지/페이지당 개수.
  상태 ↔ **URLSearchParams 직렬화**로 서버 where 조건과 1:1 매칭.
* **메인(Home)**: HERO 문구 + **3-Step 온보딩**(공고 저장 → 이력서 업로드 → 분석), 샘플 시각화, 작은 reveal-in 인터랙션.

### 서버 & API

* **원클릭 분석 API**

  * 입력 2가지:

    1. `multipart/form-data`(PDF 업로드 + JD URL)
    2. `application/json`(서버가 **최신 이력서 Blob**을 찾아 **FormData**로 변환 후 업스트림 LLM 호출)
  * **fetchWithTimeout + AbortController**로 타임아웃/리트라이.
  * **응답 저장 전략**: **원문(raw JSON) 보존** + 부분 파싱(score/summary/strengths/gaps/recommendations) **동시 저장** → 재파싱 가능 + 조회 최적화.
* **인증/권한**

  * `/api/resume`, `/api/saved`, `/api/fit/analyze`는 **JWT 쿠키 필수(401)**
  * 프런트 fetch는 **`credentials:'include'`**로 세션 일관성 유지.
* **타입 안정화**

  * 검색 `where`를 **Prisma WhereInput**으로 구성해 `any` 제거.
  * `fit-parsers`에 타입 가드/보수적 파싱 유틸 적용.

---

## 🚀 빠른 시작(로컬)

### 1) 요구사항

* Node 18+ / 20+, PNPM 또는 NPM
* Neon(Postgres) 또는 로컬 Postgres
* Vercel Blob 토큰(개발용 가능)

### 2) 환경변수 `.env` (예시)

```bash
# DB
DATABASE_URL="postgresql://<user>:<pass>@<host>/<db>?sslmode=require"

# JWT
JWT_SECRET="change-me"

# Vercel Blob
BLOB_READ_WRITE_TOKEN="vercel-blob-rw-xxx"

# 분석 업스트림
UPSTREAM_FIT_API_URL="https://your-llm-service/analyze"
UPSTREAM_FIT_API_KEY="sk-xxx"
```

### 3) 설치 & DB 준비

```bash
pnpm i
pnpm prisma db push   # 또는 prisma migrate dev
```

### 4) 개발 서버

```bash
pnpm dev  # http://localhost:3000
```

> 프런트에서 세션 유지가 필요하면 **항상** `fetch(..., { credentials: 'include' })`를 사용하세요.

---

## 📦 폴더 구조(요약)

```
src/
  app/
    (routes)
    api/
      auth/   # login/logout/me
      jobs/   # 검색/페이지네이션
      resume/ # 업로드/목록/삭제
      saved/  # 즐겨찾기
      fit/    # analyze
  components/
  lib/
    db.ts
  server/
    auth.ts  # JWT, 쿠키 헬퍼, getSession/requireAuth
  lib/fit-parsers.ts
prisma/
  schema.prisma
```

---

## 🔌 API 요약(대표)

### Auth

* `POST /api/auth/login` — { email, password } → 세션 쿠키 설정
* `POST /api/auth/logout` — 세션 쿠키 제거
* `GET /api/auth/me` — 현재 로그인 사용자

### Jobs

* `GET /api/jobs?q=&job=&company=&exp=&minYear=&maxYear=&sort=&page=&pageSize=`

  * 필터 ↔ 서버 where 조건 **1:1 매핑**
  * `exp`는 '신입' | '경력무관' | (기타: 전체)

### Resume

* `POST /api/resume` — PDF 업로드(Vercel Blob에 저장), 메타는 DB
* `GET /api/resume` — 최신본 조회
* `DELETE /api/resume/:id` — 삭제

### Fit(분석)

* `POST /api/fit/analyze`

  * **JSON 모드**: `{ jobUrl }` → 서버가 최신 이력서 Blob 읽어 업스트림 호출
  * **Multipart 모드**: `resume_file` + `jobUrl` 직접 업로드
* 응답 저장: **raw JSON** + **부분 파싱 필드** 동시

---

## 🧠 설계 포인트

* **원문 보존** → 모델/스키마가 바뀌어도 과거 분석을 재파싱 가능.
* **부분 파싱 인덱스** → 리스트/조회는 빠르게.
* **타임아웃/리트라이/에러 페이로드 표준화** → 운영 이슈 추적 쉬움.
* **Node 런타임 + bcryptjs** → Edge 환경 불일치/네이티브 모듈 이슈 회피.

---

## 🔧 크롤러(워크플로)

* GitHub Actions로 **스케줄 실행**(원티드 등 적재) → DB에 공고 반영.

---
