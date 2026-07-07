# SEO 업그레이드 계획 v2 (순위 월드컵 · codeinsight.online)

> 목표: 구글·**네이버** 검색 + SNS(카카오) 유입. 다국어(ko/en/zh) 각각을 검색엔진이 색인하게.
> v2 개정: 로케일-URL 전제, CJK OG, soft-404, host 정규화, ASCII 슬러그, 애널리틱스, 에버그린 반영.

작성: 2026-07-07 · 상태: 계획(개정, 미구현)

---

## 0. 현재 진단 (실측 — 확정)

| 항목 | 현재 | 문제 |
| --- | --- | --- |
| 콘텐츠 렌더링 | 홈·주제 모두 localStorage(클라) | 🔴 크롤러가 빈 페이지 |
| **i18n 구조** | **URL 1개 + 쿠키/Accept-Language** | 🔴 **언어별 URL이 없어 ko·zh가 색인 불가** |
| host | apex(A) + www(CNAME) 둘 다 | 🟠 같은 콘텐츠 2 호스트 = 중복 |
| title | 전역 1개 | 페이지별 없음 |
| description/OG/canonical/hreflang | 없음 | 스니펫·공유·다국어 신호 없음 |
| sitemap | 없음 / robots에 링크 없음 | 색인 유도 불가 |
| URL | `/t/{uuid}` | 🟠 비의미적 |
| 폰트 | Galmuri CDN @import | 🟠 렌더 블로킹 |
| 이미지 alt | 빈 문자열 | 이미지검색·a11y 손실 |
| 애널리틱스 | 없음 | 🟠 개선 루프 불가 |

---

## 1. ⛳ 선행 전제 (Tier 0 이전에 반드시)

### P1. 로케일을 URL 경로로 분리 (가장 중요)
- 현재: `/` 하나에서 쿠키로 언어 전환 → **구글은 보통 en-US 로만 크롤 → 한 언어만 봄. ko·zh 발견 불가.**
- 변경: **`/`(ko 기본) + `/en`, `/zh`** 경로. (라우트를 `[[lang]]` 그룹으로)
  - 각 언어 URL이 생겨 ① prerender 가능 ② hreflang 으로 상호 연결 ③ 3언어 모두 색인.
- **기존 쿠키/헤더 i18n → URL 기반으로 전환** (방금 만든 i18n 리팩터 필요). `+layout` 에서 `lang` 파라미터로 로케일 결정.
- hreflang: **ko / en / zh / x-default** 4개 모두 상호 링크 (계획 v1의 "ko↔en"은 오류).

### P2. host 정규화
- **apex(codeinsight.online)를 정본으로**, `www` → apex **301**(Vercel 도메인 설정에서 redirect).
- 그 위에 canonical 태그. (정규화 없이 canonical만 달면 신호 약함)

### P3. 슬러그는 ASCII, 로케일-중립
- 한글 슬러그(`/t/인기있는-음식-월드컵`)는 `%EC%9D%B8…`로 인코딩돼 지저분 + 3언어 중 어느 언어? 문제.
- 해결: **ASCII 슬러그 1개**를 로케일 무관하게 공유. 예) `/best-food`, `/en/best-food`, `/zh/best-food`.
  - 슬러그는 주제별 고정 ASCII(수기 매핑 또는 로마자). 제목은 언어별로 다르게 표시하되 URL은 동일.

---

## 2. 티어별 계획 (P1~P3 위에서)

### Tier 0 — 렌더링 기반
1. 공개(샘플) 주제 **SSR** — `+page.server.ts`가 `publicTopics`(슬러그·서버데이터) 렌더. (기반 파일 일부 작성됨)
2. **로케일별로** 홈·주제 페이지 SSR/prerender (P1 위에서).
3. **soft-404 방지 (#5)**: 사용자 `uuid` 주제는 서버에 없음 → 서버가 `X-Robots-Tag: noindex` 헤더 + `<meta robots noindex>` 반환(HTTP 200 유지, 클라는 localStorage 렌더). 크롤 예산 낭비 차단.

### Tier 1 — 메타 / OG
4. **로케일별** title·description(동적).
5. OpenGraph/Twitter + canonical + **hreflang(ko/en/zh/x-default)**.
6. **동적 OG 이미지 (#3, #4 반영)**:
   - `@vercel/og`(Satori)에 **CJK 웹폰트 로드**(한글·중국어 두부 방지) — 폰트 서브셋 로딩 비용 포함.
   - **기본 = 텍스트형 OG**(🏆 + 제목 + 브랜딩). **콜라주는 이미지 있는 주제(5개)만.** 27개는 텍스트형.
   - 이미지 있는 주제 중 **Bing 출처(저작권) 이미지는 OG 재호스팅 제외** — FLUX 생성분(과일·새끼동물·세계음식)만 콜라주 허용.
   - 로케일별 OG(제목 언어 반영) → 언어당 1장.
7. 이미지 **alt** 채우기(후보명), 시맨틱 heading.

### Tier 2 — 색인
8. **로케일 반영 sitemap.xml** — 각 언어 URL + hreflang alternates. robots에 Sitemap 라인(작성됨).
9. **JSON-LD** — WebSite(+SearchAction), 홈 ItemList, 주제 ItemList/Breadcrumb. `inLanguage` 로케일 반영.
10. **구글 Search Console + 네이버 서치어드바이저** 등록. 인증 메타는 내가, 계정·사이트맵 제출은 사용자.

### Tier 2.5 — 측정 (신규, #8)
11. **애널리틱스** — Vercel Web Analytics(1줄, 프라이버시 친화) + 선택 GA4. 유입·CTR·체류 측정 → 개선 루프.

### Tier 3 — 성능(CWV)
12. Galmuri 폰트 **self-host + `font-display: swap`**(CDN @import 제거). CJK OG 폰트와 별개.
13. Lighthouse → LCP/CLS/INP. 이미지 `loading="lazy"` + `width/height`(CLS 방지).

### Tier 4 — 부가
14. **로케일별 PWA manifest**(name/description 번역, #10) + apple-touch-icon.
15. 커스텀 404, 카카오 공유 SDK, 접근성 경고 정리.

---

## 3. 콘텐츠 전략 (신규, #9)

- 현재 샘플은 **시의성 고유명사**(2026 아이돌·배우) 비중이 큼 → 인기 변동으로 **랜딩이 금방 낡고 얇음 + 검색 경쟁 치열**.
- **에버그린 주제(음식·동물·사물)를 SEO 전면에** — 오래가고, **다국어에도 보편적**(번역·검색 다 유리).
- 인물/캐릭터 주제는 유지하되 **SEO 우선순위·OG 투자에서 후순위**(또는 시의성 큰 건 noindex 고려).

---

## 4. 실행 순서 (개정)

| 단계 | 내용 |
| --- | --- |
| **P** | 선행: 로케일-URL(P1) + host 301(P2) + ASCII 슬러그(P3) |
| **A** | Tier 0: 샘플 SSR(로케일별) + soft-404 차단 |
| **B** | Tier 1: 메타/OG(CJK·텍스트형 기본)/canonical/hreflang |
| **C** | Tier 2 + 2.5: sitemap/JSON-LD/서치콘솔 + 애널리틱스 |
| **D** | Tier 3: 폰트·CWV |
| **E** | Tier 4: PWA·공유·404 |

각 단계 끝에 **뷰소스(실제 HTML)·Lighthouse·리치결과 테스트**로 검증.

---

## 5. 결정 (확정 2026-07-07)

- [x] **로케일 URL**: `/`(ko 기본) + `/en`, `/zh`. x-default=ko.
- [x] **정본 host**: **apex**(codeinsight.online), www → apex 301.
- [x] **슬러그**: ASCII, 로케일-중립(수기 매핑, 예 `best-food`).
- [x] **애널리틱스**: **Vercel Web Analytics**.
- [x] **콘텐츠**: 에버그린(음식·동물) 색인 우선·OG 투자, 시의성 인물 주제는 **색인하되 후순위**.

---

## 6. 한계 (변함없음)
- localStorage 구조라 **사용자 생성 주제는 크롤 대상 아님**. 이번 SEO 범위 = **공개(홈+샘플)**. 전 주제 색인은 2단계(Supabase).
- 다국어 SEO는 **P1(로케일-URL)이 없으면 전부 무효** — v2의 핵심 교정.
