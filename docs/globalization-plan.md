# 세계화(i18n) 실행 계획서 — 한국어↔영어

> 결정(2026-07-16): **①URL `/en/` 경로 분리 ②밈 내용 LLM 전체 사전번역(_en 컬럼) ③UI는 Paraglide JS**.
> 근거: memedics는 SEO 밈 사전 → 영어 페이지가 독립 URL로 SSR·색인돼야 영어권 검색 유입 발생.
> 단순 토글(?lang)은 구글이 한 URL만 봐서 영어 색인 안 됨 → 세계화 목적에 부적합이라 기각.

## 번역은 두 층 (헷갈리지 말 것)
- **UI 문구**(버튼·메뉴·섹션명·푸터, 수십 개, 유한) → Paraglide 메시지
- **밈 내용**(이름·설명·태그, 370개+, 계속 증가) → DB `_en` 컬럼 + LLM. **세계화의 진짜 가치**
  - 야민정음(네넴띤·푸라면)은 번역이 아니라 **영어로 말놀이 해설** → 영어권엔 없는 유니크 SEO 콘텐츠

## 아키텍처
- **라우팅**: 기본 `ko`(prefix 없음, 기존 URL 유지) + `en`은 `/en/...`. Paraglide v2 `url` strategy + SvelteKit `reroute` 훅.
- **데이터**: `+page.server.ts`에서 locale 보고 `name_en/description_en` 사용(없으면 한국어 폴백).
- **SEO**: `<html lang>` locale별 · hreflang ko↔en · sitemap에 /en/ URL · JSON-LD `inLanguage` locale별.

## 스키마
- `memes`에 `name_en text`, `description_en text`, `tags_en text[]` 추가. `keywords`(매칭용)는 한국어 유지.
- 분류(category)는 고정 셋이라 UI 메시지로 번역(컬럼 불필요).

## Phase (진행하며 체크)
- [x] **P0 스키마** — memes에 `name_en/description_en/tags_en` 추가 (2026-07-16)
- [x] **P1 Paraglide 기반** (2026-07-16) — @inlang/paraglide-js 2.22, `project.inlang`+messages/{ko,en}.json, vite 플러그인(strategy=url,cookie,baseLocale), `src/hooks.ts`(reroute) + `src/hooks.server.ts`(미들웨어), `app.html` `%lang%`, 레이아웃 KO/EN 토글. **검증: /en/about → html lang=en·푸터/메뉴 영어·링크 /en/ 접두** (Supabase는 샌드박스서 못 뚫어 정적페이지로 확인). 생성물 src/lib/paraglide는 gitignore(빌드 재생성)
- [ ] **P2 UI 문구 추출** — 하드코딩 한국어 → 메시지 키로. 레이아웃·홈·상세·all·submit·footer 등
- [ ] **P3 밈 내용 번역** — `scripts/translate-memes.js`: memes 읽어 Haiku/Sonnet로 name_en·description_en·tags_en 생성(말놀이 해설 프롬프트) → DB. 370개 배치
- [ ] **P4 페이지 locale 연동** — /en/에서 _en 서빙(폴백), 정렬 locale, JSON-LD·hreflang·sitemap /en/
- [ ] **P5 신규 밈 자동 번역** — 관리자 등록 시 _en 자동 생성(등록 훅 or 크론 보정)
- [ ] **P6 언어 전환 UI** — 상단바 KO/EN 토글(현재 경로의 반대 locale로 이동)

## 검증
- 각 Phase마다 `npm run build` 통과 + 배포 후 육안. `/en/` 페이지가 영어로 SSR되고 hreflang로 상호 연결되는지.

## 비용
- LLM: 370개 × 1~2회(Haiku 위주, 어려운 것만 Sonnet) ≈ 소액. 신규는 건당 1회.
