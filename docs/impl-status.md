# 구현 진행 상태 · 핸드오프 (그런데 이제)

> 다른 컴퓨터에서 이어서 작업하기 위한 현재 상태 + 다음 스텝. 최종 업데이트 2026-07-10.

## 0. 지금 어디까지

- **설계 완료**: `docs/game-design.md` (정본 스펙 A~F) · `docs/balance-game-plan.md` (근거·역사).
- **Supabase 스키마 적용 완료** (원격 `making` 프로젝트) + MVP 2덱 시드 완료.
- **앱 이름 = "그런데이제"로 통일** (package.json·manifest·i18n `app.title`). 2026-07-10.
- **랭킹게임(과거내역) 전면 삭제 완료.** 코드(`src/lib/ranking`·`stats`·`server`·`share`·`components`·`samples`·`publicTopics`·`domain`·`image`·`storage`·`i18n/topics`)·랭킹 라우트(`create`·`r`·`t`·`api`·image-test)·`scripts/*`·구 문서(설계서·seo-plan·growth-plan·code-review-solid)·미사용 deps(`@huggingface/inference`·`sharp`) 제거.
- **현재 앱 = 최소 셸.** SvelteKit+i18n+레이아웃+홈 플레이스홀더("준비 중")만 남음. `pnpm check && build` 통과. 이미지 자산(`static/gen`·`ads`·`산출물`)은 보존.
- **다음 = 밸런스게임 신규 구현** (§5 체크리스트, 전부 미착수).

## 1. 문서 지도

| 문서 | 역할 |
|---|---|
| `docs/game-design.md` | **정본 게임 스펙** (A 규칙 · B UX · C 콘텐츠 · D 결과·공유 · E 데이터 · F MVP) |
| `docs/balance-game-plan.md` | 피벗 근거·의사결정 히스토리 |
| `docs/consultation-2026-07.md` | 외부 자문 반영 · 개선 로드맵 체크리스트(A/B/C) |
| `docs/game-topic-types.md` | **주제 유형 분류 체계 v2**(속성/인물/상황/획득/가치) · CLT 기반 문체·에스컬레이션 전환 · 바이럴 변수·혼합·페널티 독립성 · 논문 근거 |
| `docs/type-system-plan.md` | **유형 기반 게임 전환 체크리스트**(Phase 0 태그 인프라 → 1 결과 프레이밍 → 2 획득형 → 3 상황형 로직 → 4 UI) |
| `docs/impl-status.md` | (이 문서) 구현 진행·다음 스텝 |

## 2. 게임 핵심 (요약)

- 페널티-온리 밸런스게임 10판. 고른 쪽에만 `그런데 이제 ~해도` 누적, 반대쪽 안 건드림, 리셋 없음.
- 강도 = 판 번호(소프트 곡선). 1판 맨몸, 2~10판 페널티.
- **플레이 중 메커니즘/계산 전부 숨김 → 끝에 결과 "짠".**
- 결과 = 선호편(비용가중 감수 강도) + **버틴 깊이 대조**(카드 한 장 비난 금지, §A-5).
- MVP 2주제: `여름 vs 겨울` / `결혼: 얼굴천재 vs 개그천재`(아키타입). 무-AI. 한국어 온리.

## 3. Supabase (원격 준비 완료)

- 프로젝트: **making** (ref `faofjruxrabdbtesrkub`, ap-northeast-2).
- 테이블: `public.decks`(콘텐츠, 공개읽기 RLS) · `public.plays`(익명 로그, 삽입만 RLS). 랭킹게임 스키마 11테이블+함수2 전면 폐기됨.
- 스키마 = `supabase/migrations/0001_init.sql`, 시드 = `supabase/seed.sql`(2덱, 각 9+9장 적용됨).
- **다른 컴터 셋업**: `.env`에 `PUBLIC_SUPABASE_URL`(=https://faofjruxrabdbtesrkub.supabase.co) + `PUBLIC_SUPABASE_ANON_KEY` 넣기(Supabase 대시보드에서 복사, git 커밋 금지).

## 4. 현재 코드베이스 (랭킹게임 삭제 후 클린 슬레이트)

랭킹게임 코드·자산·구 문서는 **삭제 완료**(§0). 밸런스게임은 아래 셸 위에 신규 구현한다.

**남은 셸 (전부 재활용)**:
- 빌드 셋업: SvelteKit+Vite+adapter-vercel+pnpm+vitest.
- `src/lib/i18n/` (엔진 + 로케일 파라미터·hooks). 현재 문구는 `app.title`·`nav.home`·`lang.label`만 — 밸런스게임 화면 만들며 키 추가.
- `src/routes/+layout.svelte` (헤더·언어전환·광고 슬롯·SEO 셸), `+error.svelte`, `sitemap.xml`.
- `src/routes/[[lang=locale]]/+page.*` = 홈 **플레이스홀더("준비 중")** → decks 그리드로 교체(§B-4).
- `src/lib/site.ts`(도메인), `params/locale.ts`, `hooks.server.ts`(호스트 정규화·로케일).
- 이미지 자산 `static/gen`·`static/ads`·`산출물` 보존.

**신규로 만들 것** (기존 코드 없음 — §5에서 상술):
- Supabase 클라이언트 연결 · 익명 세션 · decks 로드 어댑터.
- 게임 상태/엔진(선택배열·누적 페널티·스위치) · 2-카드 play UI · 결과 계산(§A-5).
- 결과 카드 + PNG 이미지화 · 10판 선택배열 공유 코덱 · plays 로그 저장.

## 5. 다음 스텝 체크리스트 (impl-todo)

한 항목씩, `pnpm check && pnpm build` 통과 후 커밋. (loop 하네스로도 사용 가능)

**Phase 1 · 연결·골격**
- [ ] `pnpm add @supabase/supabase-js` + `src/lib/supabase.ts` 클라이언트 + `.env`
- [ ] 익명 세션 id 유틸(localStorage에 uuid)
- [ ] `storage.ts` → Supabase 어댑터(decks 로드)
- [ ] 홈 라우트: decks 그리드(주제 선택, PIKU식)

**Phase 2 · 게임 엔진**
- [ ] 게임 상태 모델(선택배열·사이드별 누적 페널티·스위치) — 새 store/state
- [ ] play 화면: 2-카드 UI 변형, 강도=판번호 카드 append, **메커니즘 숨김**
- [ ] 결과 계산(§A-5): 선호편(비용가중 감수강도) + 완주강도 + 버틴 깊이 대조 문구

**Phase 3 · 결과·공유**
- [ ] 결과 카드 화면(§D-2 버틴 깊이 막대 레이아웃)
- [ ] PNG 이미지화(html2canvas 등 신규)
- [ ] 공유 URL 코덱 변형(10판 선택배열) + 결과 재현 라우트
- [ ] plays 로그 저장(익명, 표시는 안 함)

**Phase 4 · 정리**
- [ ] 폐기 코드/자산 삭제(§4 목록)
- [ ] i18n 정리(한국어 온리) · SEO 문구 갱신
- [ ] `pnpm check && build` 전체 통과

## 6. 열린 결정 (아직)

- 강도곡선 세부(§A-3 커브볼 배치) · 과한 연출 구체화(§B-3 후보) · 저작 도구(손저작→UGC) · 주제 확장.
- 외부 자문 반영 진행: A그룹(문장형 라벨·위치 랜덤화·조건 접힘·오실레이션 유형·1판 가중치) **구현 완료**.
  B그룹 전체(B-1 결과 비교 `?vs=` · B-2 상위 N% RPC · B-3 스위치 아까움 연출 · B-4 3막 강도 재배치 ·
  B-5 데이터 윤리) **구현 완료**. → `docs/consultation-2026-07.md`. (남은 C그룹은 보류 항목)
- Supabase 연동 라이브: `@supabase/supabase-js`, `src/lib/supabase.ts`, RPC `record_play`(migrations 0002).
  `.env`의 `PUBLIC_SUPABASE_*` 필요(로컬 채워짐). **Vercel 배포 시 동일 env 등록 필요.**
