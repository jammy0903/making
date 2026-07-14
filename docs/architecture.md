# 밈 사전 — 아키텍처 (v1)

## 맥락
- **제품**: 등록된 밈의 활성도를 여러 소스에서 측정해 순위로 보여주는 공개 사이트.
  원칙: **기계는 밈을 등록하지 않는다. 측정과 후보 제안만.**
- **현재**: MVP 작동(크롤 → Supabase → 정적 프론트). 첫 실데이터 산출 완료.
- **목표**: MVP → 유지보수·확장 가능한 제대로 된 사이트. 단, 빅뱅 재작성 금지.

## 결정 (ADR 요약)
1. **백엔드 API 도입** — SvelteKit 서버 라우트(`+page.server.ts`/`+server.ts`)가 API 경계.
   브라우저 ↔ DB 직결 종료(서버가 service_role 키를 쥠, RLS는 2차 방어).
   → 프론트는 스키마가 아니라 API 계약에 의존(결합 끊김).
2. **프론트 = SvelteKit SSR** — 밈 사전은 SEO 필수(클라 전용 SPA면 색인 안 됨).
3. **호스팅 = 당분간 서버리스** (adapter-vercel/cloudflare). 나중에 adapter-node + VPS/AWS로,
   **연결 문자열만 교체**(Supabase도 RDS도 Postgres).
4. **마이그레이션 = 스트랭글러** — 얇은 수직 슬라이스로 한 라우트씩 이전. 구 정적 사이트는
   파리티 도달까지 병행 유지 후 스왑.
5. **집계·순위 = SQL에 유지** — 대량 집계를 앱으로 끌어와 재구현하지 않는다(성능·단순성).
   도메인 TS에는 **판단/정책 + 매칭**만(스테디 판정, 후보 승격 조건, 사전 대조 등 = 데이터가 아닌 판단).
6. **추상화 최소(YAGNI)** — 인터페이스는 **SourcePort 하나만**(유튜브·네이버·커뮤니티 = 진짜 다형성).
   Repo 인터페이스·DI 컨테이너·전면 헥사고날은 **두 번째 구현이 실제로 생길 때** 도입.
   미리 추상화하는 게 SOLID가 아니라, **바뀔 축을 아는 것**이 SOLID.

## 구조
```
src/
  routes/                        페이지·API·admin (얇게 — 조립만)
    +page.server.ts / .svelte      SSR 순위표
    memes/[slug]/…                 상세 (SEO·OG)
    api/comments  api/votes        application 호출
    (admin)/…                      밈 등록·후보 검수
  lib/
    server/
      services/                  유스케이스: measure·rank·register·review·comment·vote
      sources/                   SourcePort + 어댑터  ← 유일한 인터페이스
      db/                        Drizzle 쿼리 모듈. 집계·순위는 SQL.
    domain/                      순수 TS: matcher, 정책/규칙  ← 유닛테스트
    components/                  Svelte UI
  hooks.server.ts                인증(Supabase Auth)
scripts/crawl.ts                 GitHub Actions가 호출 (services 재사용)
```

## 데이터 흐름
```
브라우저 → SvelteKit 라우트 → services → { SQL 집계 | domain 판단 } → Postgres
```

## 마이그레이션 (스트랭글러 — 각 Phase 배포 가능)
- **Phase 1 (얇은 수직 슬라이스)**: SvelteKit+TS 골격 + **순위 SSR 1페이지 end-to-end**
  (`+page.server.ts` → services/ranking → SQL) + `domain/matcher.ts` 이식 + 유닛테스트 + 서버리스 배포.
  → 새 아키텍처 전체를 최고가치 페이지 하나로 실증.
- **Phase 2**: 새로 올라온 / 스테디 / 상세(SEO).
- **Phase 3**: 댓글·투표 → API 경계.
- **Phase 4**: 인증 + admin(밈 등록·후보 408건 검수).
- **Phase 5**: 크롤러 `scripts/crawl.ts`로 통합(도메인 공유). 그전까지 기존 JS 크롤러 유지.

## 재사용 vs 재작성
- **재사용**: DB 스키마, 순위/집계 SQL(meme_ranking 등), 크롤러 로직, GH Actions cron, 디자인/UX.
- **이식**: matcher·판단 로직 → `domain/`(TS)+테스트, 크롤러 → SourcePort.
- **재작성**: 프론트(바닐라 → Svelte 컴포넌트), 데이터 접근(직결 → services).

## 원칙
- **YAGNI** — 축이 실제로 바뀔 때 추상화.
- **DB가 잘하는 건 DB에** — 집계·순위는 SQL.
- 각 Phase는 **배포 가능한 상태**로.
