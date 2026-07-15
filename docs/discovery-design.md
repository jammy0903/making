# 밈 발굴 시스템 설계 (문헌 조사 기반)

> 2026-07-15. 신조어 탐지·버스트 감지·LLM 파이프라인 문헌 ~30편 조사 후 종합한 설계.
> 결론: **"통계 게이트 → 외부 검색량 교차검증 → LLM 분류 → 사람 확정"** 4단 깔때기.
> LLM은 1차 발굴기가 아니라 최종 정제 필터로만 쓴다 (문헌 합의).

## 0. 문헌이 말해주는 것 (핵심 근거)

| 발견 | 근거 | 우리에게 의미 |
|---|---|---|
| LLM을 1차 발굴기로 쓰지 마라. 통계로 후보를 압축한 뒤 LLM은 정제(precision-boosting) 전용 | Rossini & van der Plas 2026 (arXiv:2605.06426, Reddit 5.3억→후보 1,021개, 정밀도 58.7%) · NeoN(arXiv:2505.15426) · Snapchat 프로덕션(arXiv:2604.27131) | 지금 드라이런("텍스트 뭉치에서 밈 골라줘")은 문헌상 가장 약한 형태. 구조 교체 필요 |
| 진짜 신조어는 극희귀 사건 | Grieve et al. 2017: 89억 토큰에서 최종 54개 | 주당 후보 수 개가 정상. "적게 나와도 정확하게"가 목표 |
| 희소 카운트(하루 0~5회)에서 z-score는 부적합, Poisson 꼬리확률이 정답 | Poisson-FOCuS (JASA 2023, 감마선 버스트 감지 — 우리와 동일한 희소 카운트 환경) | 배경률 λ(28일 이동) 대비 P(X≥k)<0.001 + 당일 ≥3회 + ≥2소스 |
| 한국어 교착어 문제는 cohesion+branching entropy로 우회 | soynlp (Jin & Tanaka-Ishii 2006 계열) · 국립국어원 <신어 2023> LLM 협업 연구 | 띄어쓰기 토큰화 대신 문자 n-gram 성장률로 시작, 데이터 쌓이면 soynlp 도입 |
| **내부 데이터가 작으면 외부 검색량으로 검증하라** | Twitter→Google Trends 교차검증 연구 관행 · 네이버 데이터랩 검색어트렌드 API(공식 스펙 확인) | **가장 레버리지 큰 요소.** 우리는 네이버 API 키를 이미 보유 |
| LLM 판정은 "밈 골라줘"가 아니라 후보별 4-way 분류 + 사용 문맥 주입 | 위 2026 파이프라인(entity 클래스 분리로 고유명사 오탐 직접 제거) · KYM 벤치마크(arXiv:2606.05316): 최신 밈은 문맥 주입 없이는 LLM이 모름 | "5세대 아이돌" 같은 오탐이 정확히 이 지점. 분류 스키마 교체 |
| 패널·debate보다 단순 다수결(self-consistency), 그보다 좋은 judge 1개 | Debate or Vote(arXiv:2508.17536) · Nine Judges Two Votes(arXiv:2605.29800, LLM 패널은 오류가 상관됨) | Haiku ×3 다수결 스크리닝 → 통과분만 상위 모델 1회 최종 |
| 사람이 기각한 오탐을 환류하면 fine-tune 없이 최대 정밀도 이득 | NAACL 2024 (arXiv:2404.02323) | 관리자 '반려'가 곧 학습 데이터. negative few-shot + 제외목록으로 재사용 |

## 1. 아키텍처: 4단 깔때기

```
[크롤 원문 ~1,900건/일]  (기존 크롤 재사용, 이미 GH Actions 일1회)
   │
   ▼ ① 누적 + 후보 생성 (통계, 비용 0)
raw_texts 테이블에 원문 누적 (지금은 아무것도 저장 안 함 — 선행 조건)
문자 n-gram(2~6자) + 어절 단위 카운트 → ngram_daily(ngram, day, source, count)
제외: 등록 밈 키워드 매칭분 · 기각 이력(rejected_terms) · 숫자/단일문자
   │
   ▼ ② 버스트 게이트 (통계, 비용 0)
28일 이동 배경률 λ 대비 Poisson 꼬리확률 P(X≥k|λ) < 0.001
AND 당일 카운트 ≥ 3   AND 소스 ≥ 2 (또는 유튜브 영상 ≥ 2)
AND 3일 중 2일 지속            → 하루 0~20개로 압축
   │
   ▼ ③ 외부 교차검증 (네이버 데이터랩, 무료·키 보유)
검색어트렌드 API로 후보의 일간 검색 ratio 조회 (5그룹×20키워드/호출, 일 1,000회 한도)
"최근 7~14일 ratio가 0 → 양수로 전환 or 급상승" = 전 국민 검색에서도 뜨는 중
   │
   ▼ ④ LLM 분류 (여기서만 AI, 후보당 몇 원)
후보별 실제 사용 문맥 3~5개 주입 + 4-way 분류:
  {밈/신조어, 고유명사(인명·그룹·작품), 일반어, 오타/파편}
Haiku 같은 프롬프트 3회 다수결 → '밈/신조어' 합의분만
상위 모델(Sonnet/Opus) 1회 최종 판정 + 뜻 생성
   │
   ▼ ⑤ 사람 확정 (기존 인프라)
discovery_candidates 큐 → 관리자 '후보 검토' 탭에서 등록/반려
반려 → rejected_terms 테이블 (①의 제외목록 + ④의 negative few-shot으로 환류)
```

설계 철학 유지: 기계는 어디까지나 **제안**(④까지), 결정은 사람(⑤). 기존 "탄생도 죽음도 기계는 제안, 사람이 결정"과 일치.

## 2. 새로 필요한 것

| 항목 | 내용 | 비용 |
|---|---|---|
| `raw_texts` 테이블 | 크롤 원문 누적 (text, source, video/topic, day). 90일 보존 후 삭제 | Supabase 무료 한도 내 (하루 2천 행) |
| `ngram_daily` 테이블 | n-gram 일별 카운트. upsert 누적 | 〃 |
| `rejected_terms` 테이블 | 사람이 반려한 후보 (환류용) | 〃 |
| 데이터랩 API 연동 | 기존 naver/client.js 재사용, 엔드포인트만 추가 (POST /v1/datalab/search) | 무료 (일 1,000회) |
| LLM 호출 | 하루 후보 ~10개 × Haiku 3회 + 상위모델 1회 | 월 1천 원 미만 추정 |
| discovery_candidates 확장 | term/meaning/evidence/score 컬럼 추가 (현재 title/url 기반) | 스키마 마이그레이션 1회 |

## 3. 단계별 도입 순서 (작게 → 크게)

- **Phase 0 (지금 즉시)**: `raw_texts` + `ngram_daily` 누적 시작. **배경률에 최소 14~28일 필요하므로 이것부터 돌려놓는 게 급선무.** 감지 로직 없이 누적만.
- **Phase 1 (누적 2주 후)**: Poisson 버스트 게이트 + 데이터랩 교차검증 스크립트. 드라이런(콘솔 출력)으로 품질 확인.
- **Phase 2**: LLM 4-way 분류 붙이고 discovery_candidates에 저장, 관리자 검토 연결.
- **Phase 3 (누적 2~3달 후)**: soynlp cohesion/branching entropy로 n-gram보다 정확한 단어 경계 추출로 업그레이드. 기각 환류 자동화.

## 4. 기대치 (정직하게)

- Grieve 기준으로 우리 규모면 **진짜 밈은 주당 0~5개** 수준이 정상. 매일 쏟아지지 않는다.
- 유튜브 편중(주제 10개 × 영상 5개)이라 커버리지 한계 존재 — 데이터랩 교차검증이 이를 보완.
- 정밀도 목표: 관리자 큐에 올라온 것 중 절반 이상이 "등록할 만한 것" (Reddit 파이프라인의 58.7%가 문헌상 달성치).

## 5. 참고 문헌 (조사 에이전트 3개 종합)

- Rossini & van der Plas 2026, *From 124M Tokens to 1,021 Neologisms* (arXiv:2605.06426) — 전체 구조의 원형
- Snapchat, *LLM-Enhanced Topical Trend Detection* (arXiv:2604.27131) — 프로덕션 하이브리드
- Ward et al., *Poisson-FOCuS* (JASA 2023) — 희소 카운트 버스트
- Kleinberg 2002 *Bursty and Hierarchical Structure in Streams* · TwitterMonitor (SIGMOD 2010) — 버스트→동시출현 그룹핑
- Grieve, Nini & Guo 2017 — 제외사전→최소출현→성장률 3단 필터, 신조어 희귀성
- soynlp (lovit) · Jin & Tanaka-Ishii 2006 — 한국어 비지도 단어 추출
- 국립국어원 <신어 2023> 말뭉치·LLM·인간 협업 연구 — 한국어판 실증
- *I Know What You Meme* (arXiv:2606.05316) — 문맥 주입 필수
- *Debate or Vote* (arXiv:2508.17536) · *Nine Judges, Two Effective Votes* (arXiv:2605.29800) — 다수결>패널
- NAACL 2024 *Knowledge of Slang in LLMs* (arXiv:2404.02323) — 오탐 환류의 가치
- 네이버 데이터랩 검색어트렌드 API 공식 스펙 (api.ncloud-docs.com)
