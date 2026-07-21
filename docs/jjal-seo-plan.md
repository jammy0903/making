# 짤 보관소 SEO 구현 계획

목표: `/jjal`의 짤 3,796개를 **웹(텍스트) 검색**으로 유입시킨다.
관련: [jjal-archive-plan.md](./jjal-archive-plan.md) (스키마·검색), [jjal-crawl-plan.md](./jjal-crawl-plan.md) (수집)

## 0. 전제 — 이미지 검색은 포기한다 (확정)

원본 CDN 직링크를 유지하고 재호스팅하지 않는다(저작권). 그 결과:

- `i.pinimg.com/robots.txt`는 `User-agent: Googlebot-Image / Allow: /` 로 **열려 있다**(2026-07-21 직접 확인). 로봇 차단이 문제는 아니다.
- 그러나 구글 이미지 사이트맵 문서는 크로스도메인 이미지에 대해 *"as long as you verify both domains in Search Console"* 을 요구한다. **`pinimg.com`은 우리가 소유 확인할 수 없다.**
- → 이미지 검색 노출은 통제 불가능한 변수다. **기대치에서 제외하고, 텍스트 검색을 유일한 주 채널로 설계한다.**

이 전제가 바뀌는 유일한 경우는 재호스팅 결정이며, 그건 저작권 판단이 선행되어야 한다.

## 1. 현재 상태 (2026-07-21 코드 감사)

| 항목 | 상태 |
| --- | --- |
| 개별 짤 URL | **없음** — 클릭 시 `sel` state 모달만, URL 불변 → 색인 가능 짤 0개 |
| 짤 검색 | **POST** (`jjal/search/+server.ts`) → 크롤러가 못 따라감 |
| sitemap.xml | 있음(`meme_cards` 전량 + ko/en hreflang) 이나 **`/jjal` 누락** |
| robots.txt | 있음. `User-agent: * / Allow: /` + sitemap. **`Yeti` 명시 없음** |
| `/jjal` 메타 | title·description만. **canonical·og·twitter·JSON-LD 없음** |
| `/jjal` i18n | **미적용** (한국어 하드코딩) |
| RSS | **없음** |

## 2. 설계 원칙 — thin content로 죽지 않기

Giphy·Tenor·Pinterest의 내부 검색결과 페이지는 구글에서 **대량 de-index**됐다
("검색 결과 안에 검색 결과를 보여주지 않는다"). 반대로 Know Your Meme은
밈 1개 = 얕은 고유 슬러그 1페이지에 서술형 텍스트를 실어 성공했다.

따라서:

- **이미지만 있는 페이지를 3,796개 찍어내지 않는다.** 각 페이지에 읽을 텍스트가 있어야 한다.
- **태그/검색 결과 URL을 그대로 색인 대상으로 삼지 않는다.** 랜딩 페이지는 사람이 쓴 도입 문단을 가진 것만 색인한다.
- 크롤 예산은 문제가 아니다(구글 기준 100만 페이지 이상부터). 규모가 아니라 **페이지당 가치**가 관건이다.

## 3. 구현

### Phase 1 — 개별 짤 상세 페이지 (전체 효과의 8할)

`src/routes/jjal/[id]/+page.svelte` + `+page.server.ts` 신설. **SSR 필수**
(네이버 가이드가 "모든 콘텐츠가 JS로 로딩되는 구조"를 미노출 원인으로 명시).

- URL: `/jjal/{id}` — 얕고 고유하게. 기존 `/m/{id}`와 같은 결.
- 페이지 구성: 짤 이미지 + **캡션**(판정 단계에서 만든 한국어 한 문장) + 키워드 칩 + 출처 링크 + 관련 짤 그리드.
- 메타는 **문서마다 고유**하게 생성한다(전 페이지 동일 title은 네이버 불이익):
  - `title`: `{캡션 요약} 짤 — memedics`
  - `description`: 캡션 + 언제 쓰는 짤인지
  - `canonical`, `og:*`(image=해당 짤), `twitter:card`
  - JSON-LD `ImageObject` (`contentUrl`, `caption`, `keywords`)
- `alt`: 밈 이름 + 상황 서술형. 이미지 검색이 막힌 상황에서 유일하게 남은 통제 수단.
- 그리드에서 상세로 가는 링크는 반드시 **`<a href>`** — `onClick` 기반은 네이버·구글 모두 크롤 불가.
  모달은 유지하되 앵커를 감싸는 형태로 바꾼다(클릭은 모달, 크롤러는 href).

> 캡션 품질이 곧 SEO 품질이다. 판정 단계에서 캡션에 공을 들인 이유가 여기서 회수된다.

### Phase 2 — 키워드 랜딩 페이지

`/jjal/tag/{keyword}` — 실제 검색어 패턴 3층을 그대로 URL로.

1. 감정/상황: 웃긴, 병맛, 빡침, 멘붕, 현타, 억울, 황당
2. 직장/일상: 퇴근, 월요병, 야근, 퇴사, 출근, 시험
3. 인물/IP: 박명수, 무한도전, 침착맨, 짱구, 뽀로로, 도라에몽 — 2차 크롤로 확보한 축

**각 페이지에 사람이 읽을 도입 문단(2~3문장, 언제 쓰는 짤인지)을 반드시 넣는다.**
없으면 Giphy 꼴이 난다. 도입 문단이 없는 태그는 색인 대상에서 뺀다(`noindex`).

키워드는 `jjals.keywords` 빈도 상위에서 뽑되, 문단을 쓸 수 있는 것만 승격한다.

### Phase 3 — 색인 인프라

- **sitemap.xml 확장**(`src/routes/sitemap.xml/+server.ts`): `/jjal`, `/jjal/{id}` 전량, 색인 대상 태그 페이지. 기존 ko/en `xhtml:link` 패턴 유지.
- **robots.txt**(`src/routes/robots.txt/+server.ts`): `User-agent: Yeti / Allow: /` 명시 추가. 네이버 봇 UA다.
- **RSS 신설** `/jjal/rss.xml`: 최근 등록 짤. 네이버가 사이트맵과 **별도로** 요구한다.
- `/jjal` 자체에도 canonical·og·JSON-LD 추가, **i18n(paraglide) 적용**.

### Phase 4 — 검색엔진 등록

- **다음 먼저** (`register.search.daum.net`) — 심사 5일, 네이트에도 노출. 진입장벽이 낮아 초기 유입이 먼저 터질 가능성이 높다.
- 네이버 서치어드바이저 — 호스트 단위(`https://memedics.space`) 등록 후 사이트맵 + RSS 제출.
- 구글 Search Console — 사이트맵 제출, `site:` 로 색인 확인.

### Phase 5 — 검색 외 유입

커뮤니티·메신저 공유가 실제 주 유통 경로다.
- 개별 짤 URL의 og 카드가 카톡·디스코드에서 예쁘게 뜨도록 확인.
- "짤 원본 출처 찾는 사이트" 포지션 — 이 수요는 아카라이브 등에 실재한다.

## 4. 하지 않을 것

- 재호스팅 (저작권)
- 태그 페이지 무제한 양산 — 도입 문단 없는 것은 색인하지 않는다
- 무한스크롤만 있는 목록 — 크롤 가능한 링크가 없으면 구글이 차단을 권고한다. 페이지네이션을 병행한다
- 키워드 스터핑 alt/title

## 5. 미확인 (실측 필요)

- 키워드별 실제 검색량 — 네이버 데이터랩/키워드도구 미조회
- 네이버 이미지 탭의 외부 사이트 노출 조건 — 공개 가이드에 문서화돼 있지 않음
- 상세 페이지 도입 후 실제 색인률 — Search Console로 사후 측정할 것

## 출처

- [Google image SEO](https://developers.google.com/search/docs/appearance/google-images)
- [Image sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)
- [Crawl budget](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget)
- [네이버 서치어드바이저 가이드](https://searchadvisor.naver.com/guide/seo-basic-intro), [웹 검색 미노출 FAQ](https://searchadvisor.naver.com/guide/faq-serpmissing)
- [Daum 검색등록](https://register.search.daum.net/index.daum)
- [Onely: Giphy de-index 분석](https://www.onely.com/blog/giphys-visibility-drops-conspiracy-or-consequence/)
- [Know Your Meme 구조 예시](https://knowyourmeme.com/memes/doge)
