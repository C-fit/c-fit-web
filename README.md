# C-FIT Web · JD-기준 이력서 Fit 분석 플랫폼

채용공고(JD)에 **이력서를 Fit** 해 주는 웹앱입니다.
유저는 관심 공고를 저장하고, PDF 이력서를 업로드한 뒤, **원클릭 분석**으로 Fit 리포트를 받습니다.

> “일자리를 나에게 맞추는 것”이 아니라 **“채용공고의 요구사항에 내 이력서를 Fit”**합니다.

---

## ✨ 핵심 기능

* **관심 공고 등록**: 크롤러가 적재한 공고/URL을 저장 (`/api/saved`)
* **이력서 업로드(PDF)**: Vercel Blob 저장, 메타는 DB (`/api/resume`)
* **원클릭 Fit 분석**: 서버가 `resume + JD_URL`을 업스트림 LLM에 전달 → **정형 JSON raw 저장** (`/api/fit/analyze`)
* **리포트 열람**: 점수/강점/개선점/권고를 시각화 (`/analysis/[id]`)

---

## 🏗️ 아키텍처 & 스택

* **FE/BE**: Next.js 15 (App Router), TypeScript
* **DB/ORM**: Neon(PostgreSQL) + Prisma
* **Storage**: `@vercel/blob` (이력서 PDF)
* **Auth/Session**: 서버 `cookies()` + `jose`(JWT) — **로그인 사용자만 업로드/저장/분석 가능**
* **크롤러(별도 레포)**: `c-fit-crawler` (Wanted 전용, GitHub Actions 스케줄)

---

## 🗂️ 리포지토리 구조

```
c-fit-web/
├─ prisma/
│  └─ schema.prisma              # 데이터 모델
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                # 홈
│  │  ├─ dashboard/page.tsx      # 이력서/관심 공고
│  │  ├─ jobs/page.tsx           # 공고 검색/필터
│  │  ├─ analysis/
│  │  │  ├─ [id]/page.tsx        # 결과 상세
│  │  │  └─ demo/page.tsx        # 샘플 미리보기
│  │  └─ api/
│  │     ├─ resume/route.ts      # GET/POST/DELETE (PDF+메타)
│  │     ├─ saved/route.ts       # 관심 공고 목록/토글/삭제
│  │     ├─ fit/analyze/route.ts # 업스트림 포워딩 & 저장
│  │     └─ jobs/route.ts        # 검색/정렬/페이지네이션
│  ├─ server/auth.ts             # JWT 발급/검증, 쿠키 I/O
│  ├─ lib/db.ts                  # Prisma client
│  └─ lib/fit-parsers.ts         # raw→표준 View 정규화
└─ public/                        # 스크린샷/정적 자산
```

---

## 🔐 환경 변수 (.env.example)

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"

# Auth (JWT)
AUTH_COOKIE_NAME="cfit_session"
JWT_SECRET="paste-a-32+byte-random-secret-hex-or-base64"
JWT_ISSUER="c-fit"
JWT_AUDIENCE="c-fit-web"
JWT_EXPIRES_IN="30d"

# Vercel Blob
BLOB_READ_WRITE_TOKEN="<vercel-blob-rw-token>"

# Upstream LLM
LLM_API_BASE="https://<your-langgraph-or-backend>"
LLM_API_KEY="<your-key>"
LLM_API_KEY_HEADER="Authorization"   # or "x-api-key"
FIT_TIMEOUT_MS="480000"              # 8m
TIMEOUT_MS="1200000"                 # 20m

# Node (optional)
NODE_ENV="development"
```

---

## 🚀 로컬 개발

```bash
# 0) 의존성
pnpm i        # or npm i / yarn

# 1) Prisma
pnpm prisma generate
pnpm prisma migrate dev --name init

# 2) 개발 서버
pnpm dev      # http://localhost:3000
```

---

## 👤 인증 플로우 (요약)

* 서버 라우트가 **JWT 세션 쿠키**를 검사
* 쿠키가 없으면 `/api/resume`·`/api/saved`·`/api/fit/analyze`는 **401**
* 로그인/로그아웃 라우트는 **쿠키 발급/제거**만 담당

> 배포 시 쿠키 도메인/보안 속성(SameSite/Lax, Secure)을 환경에 맞춰 설정하세요.

---

## 🧪 빠른 API 사용 예시

> 사전 조건: 로그인 후 세션 쿠키 보유

```bash
# 1) 최신 이력서 메타
curl -i --cookie "cfit_session=YOUR_TOKEN" http://localhost:3000/api/resume

# 2) 이력서 업로드(PDF)
curl -i -X POST \
  --cookie "cfit_session=YOUR_TOKEN" \
  -F "resume=@/path/to/resume.pdf" \
  http://localhost:3000/api/resume

# 3) 관심 공고 목록
curl -i --cookie "cfit_session=YOUR_TOKEN" http://localhost:3000/api/saved

# 4) 관심 등록/해제
curl -i -X POST \
  --cookie "cfit_session=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "jobId":"<JOB_ID>", "save": true }' \
  http://localhost:3000/api/saved

# 5) 원클릭 분석(JSON 경로: 서버가 최신 이력서 자동 사용)
curl -i -X POST \
  --cookie "cfit_session=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "jd_url":"https://...", "thread_id":"demo-001" }' \
  http://localhost:3000/api/fit/analyze
```

---

## 🗃️ 데이터 모델 (요점)

* **User** — 사용자
* **ResumeFile** — 이력서 메타(Blob URL, mime/size, createdAt)
* **JobPosting** — 공고(원천 URL 유니크, 필터링 필드 포함)
* **SavedJob** — 관심 공고(유저↔공고 M:N)
* **FitResult** — 분석 raw(JSON) & 파생 필드(score/summary/strengths/gaps/recommendations)

> 자세한 필드는 `prisma/schema.prisma` 참고

---

## 🔎 공고 검색 API

* 경력 구간 `careerYears` 배열과 **교집합**이 있으면 매칭 (`hasSome`)
* 정렬: `recent | company | title`
* 안전한 Prisma 타입: `JobPostingWhereInput`

예: `/api/jobs?q=프론트엔드&company=네카라쿠배&minYear=0&maxYear=3&sort=recent&page=1&pageSize=20`

---

## 🧰 개발 팁

* **타입 안정화**: `any` 금지, 런타임 타입가드(`isRecord/isString`)로 파싱
* **훅 경고 제거**: `useCallback` + `useEffect` 의존성 준수
* **드래그앤드롭**: DOM 이벤트 핸들러에 구체 타입(`DragEvent`) 사용
* **401 반복 리다이렉트** 발생 시 점검

  * 쿠키 이름/도메인/경로, `SameSite`/`Secure` 설정
  * 프런트 fetch에 `credentials: 'include'` 적용
  * 서버 라우트에서 `cookies()`를 **await** 사용

---

## 🐍 크롤러 (별도 레포 `c-fit-crawler`)

* 파이프라인: `crawling.py → extract.py → load_to_db.py`
* 스케줄: GitHub Actions (매일 1회)
* 산출물: Neon(Postgres) 적재, 필요시 artifacts 업로드

> 이 웹 레포는 **읽기 전용**으로 DB의 `JobPosting`을 조회합니다.

---

## 📦 배포 체크리스트

* `.env` 모든 값 설정(JWT/DB/BLOB/LLM)
* Prisma 스키마 동기화 (`prisma migrate deploy`)
* Blob 권한 정책(공개/비공개) 검토
* Production 쿠키 보안(HTTPS, `Secure`) 적용

---

## 🗺️ 로드맵

* [ ] 리포트 편집 & 공유 링크
* [ ] 멀티 이력서 관리 + 버전 비교
* [ ] JD 파서 고도화(회사별 템플릿)
* [ ] 알람: 신규 공고/만료 임박/스냅샷 리마인더
* [ ] 모의 면접

---


## 🙌 기여

PR 환영합니다! 커밋은 Conventional Commits를 권장합니다.
버그/제안은 Issue로 남겨주세요.

---
