// 짤 태그 랜딩 페이지의 큐레이션 목록(docs/jjal-seo-plan.md Phase 2).
// 도입 문단을 쓸 수 있는 키워드만 승격한다 — 문단 없는 태그 페이지를 양산하면
// thin content로 Giphy 꼴이 난다(색인 제외 원칙). 새 태그는 여기에 문단과 함께 추가.
import { sbGet } from '$lib/server/db';
import type { Jjal } from '$lib/server/jjal';

type Fetch = typeof globalThis.fetch;

export type JjalTag = {
  keyword: string; // jjals.keywords 정확 일치 값이자 URL 경로(/jjal/tag/{keyword})
  title: string; // 검색 결과에 노출될 제목 조각
  intro: string; // 사람이 읽는 도입 문단 — 이게 없으면 색인할 자격이 없다
};

export const JJAL_TAGS: JjalTag[] = [
  // ── 감정/상황 ──
  {
    keyword: '웃김',
    title: '웃긴 짤 모음',
    intro:
      '설명이 필요 없는, 보자마자 웃음이 터지는 짤 모음입니다. 단톡방 분위기를 띄우거나 별말 없이 웃음만 전하고 싶을 때 아무거나 골라 쓰세요.',
  },
  {
    keyword: '병맛',
    title: '병맛 짤 모음',
    intro:
      '맥락도 논리도 없는데 이상하게 웃긴 병맛 짤 모음입니다. 진지한 대화를 무너뜨리고 싶을 때, 대답할 말이 없어서 아무거나 던지고 싶을 때 쓰세요.',
  },
  {
    keyword: '어이없음',
    title: '어이없을 때 쓰는 짤',
    intro:
      '기가 차서 말이 안 나올 때 대신 던지는 짤 모음입니다. 황당한 소리를 들었을 때, 말문이 막혔을 때 표정 하나로 마음을 전하세요.',
  },
  {
    keyword: '분노',
    title: '화날 때 쓰는 짤',
    intro:
      '빡침을 말로 하면 싸움이 되지만 짤로 하면 유머가 됩니다. 화나는 상황을 웃음으로 승화하고 싶을 때 쓰는 분노 짤 모음입니다.',
  },
  {
    keyword: '현타',
    title: '현타 올 때 쓰는 짤',
    intro:
      '갑자기 현실 자각 타임이 왔을 때, 현생에 지쳐 허무해질 때 쓰는 짤 모음입니다. 내 심정을 구구절절 설명하는 대신 짤 하나로 정리하세요.',
  },
  {
    keyword: '당황',
    title: '당황했을 때 쓰는 짤',
    intro:
      '예상 못 한 상황에 말문이 막혔을 때 쓰는 당황 짤 모음입니다. 식은땀 흘리는 표정부터 얼어붙은 리액션까지, 즉답을 피하고 싶을 때도 유용합니다.',
  },
  {
    keyword: '놀람',
    title: '놀랐을 때 쓰는 짤',
    intro:
      '충격적인 소식을 들었을 때 리액션으로 던지는 놀람 짤 모음입니다. 눈이 커지는 표정, 뒷목 잡는 자세 등 놀라움의 강도별로 골라 쓰세요.',
  },
  {
    keyword: '눈물',
    title: '눈물·슬픔 짤 모음',
    intro:
      '슬프거나 감동적이거나, 웃긴데 눈물이 나는 순간에 쓰는 짤 모음입니다. 진지한 슬픔부터 과장된 오열까지 온도별로 있습니다.',
  },
  {
    keyword: '절규',
    title: '절규 짤 모음',
    intro:
      '소리 지르고 싶은 순간을 대신해 주는 절규 짤 모음입니다. 과제 마감, 시험 결과, 월요일 아침 — 말로 못 할 심정을 표현하세요.',
  },
  {
    keyword: '공감',
    title: '공감 짤 모음',
    intro:
      '"그거 완전 나잖아" 소리가 나오는 공감 짤 모음입니다. 상대의 말에 격하게 동의할 때, 리액션이 필요할 때 쓰세요.',
  },
  {
    keyword: '피곤',
    title: '피곤할 때 쓰는 짤',
    intro:
      '기력이 하나도 없을 때, 만사가 귀찮을 때 쓰는 피곤 짤 모음입니다. 눈 풀린 표정과 녹아내리는 자세로 내 상태를 정확히 전달하세요.',
  },
  {
    keyword: '충격',
    title: '충격받았을 때 쓰는 짤',
    intro:
      '믿기지 않는 소식에 할 말을 잃었을 때 쓰는 충격 짤 모음입니다. 뉴스, 스포일러, 반전 소식에 대한 리액션으로 던지세요.',
  },
  {
    keyword: '억울',
    title: '억울할 때 쓰는 짤',
    intro:
      '나는 잘못한 게 없는데 혼날 때, 오해받았을 때 쓰는 억울 짤 모음입니다. 항변 대신 짤 하나로 서러움을 전하세요.',
  },
  // ── 직장/일상 ──
  {
    keyword: '퇴근',
    title: '퇴근 짤 모음',
    intro:
      '퇴근 시간만 기다리는 직장인의 마음을 담은 짤 모음입니다. 칼퇴 선언, 퇴근 5분 전의 설렘, 야근 확정의 절망까지 상황별로 쓰세요.',
  },
  {
    keyword: '직장인',
    title: '직장인 공감 짤',
    intro:
      '회사 생활의 희로애락을 담은 직장인 짤 모음입니다. 월요병, 회의 지옥, 점심 메뉴 고민 — 동료와의 단톡방에서 바로 통하는 짤들입니다.',
  },
  // ── 동물 ──
  {
    keyword: '고양이',
    title: '고양이 짤 모음',
    intro:
      '리액션의 제왕, 고양이 짤 모음입니다. 무표정한 냥이부터 세상 억울한 표정까지 — 어떤 감정이든 고양이로 표현하면 귀여워집니다.',
  },
  {
    keyword: '강아지',
    title: '강아지 짤 모음',
    intro:
      '해맑음과 억울함을 오가는 강아지 짤 모음입니다. 신남, 시무룩, 꼬리 흔들기 — 긍정적인 리액션이 필요할 때 특히 좋습니다.',
  },
  // ── 인물/IP ──
  {
    keyword: '짱구',
    title: '짱구 짤 모음',
    intro:
      '짱구는 못 말려의 명장면 짤 모음입니다. 능청스러운 표정과 철학적인 대사의 갭이 매력 — 장난스러운 대답이 필요할 때 쓰세요.',
  },
  {
    keyword: '도라에몽',
    title: '도라에몽 짤 모음',
    intro:
      '도라에몽과 노진구의 리액션 짤 모음입니다. 절망하는 진구, 한심해하는 도라에몽 — 일상 대화의 온갖 상황에 대입됩니다.',
  },
  {
    keyword: '잔망루피',
    title: '잔망루피 짤 모음',
    intro:
      '뽀로로의 루피가 잔망스러운 표정으로 재탄생한 잔망루피 짤 모음입니다. 귀엽게 화내거나 능청스럽게 넘어가고 싶을 때 최적입니다.',
  },
  {
    keyword: '박명수',
    title: '박명수 짤 모음',
    intro:
      '호통과 명언 사이, 박명수 짤 모음입니다. 무한도전 시절의 버럭부터 어록급 드립까지 — 세게 말하고 싶은데 웃기게 말하고 싶을 때 쓰세요.',
  },
  {
    keyword: '유재석',
    title: '유재석 짤 모음',
    intro:
      '국민 MC 유재석의 리액션 짤 모음입니다. 감탄, 폭소, 정색까지 방송에서 검증된 표정들이라 어떤 대화에도 자연스럽게 녹아듭니다.',
  },
  {
    keyword: '무한도전',
    title: '무한도전 짤 모음',
    intro:
      '한국 밈의 발상지, 무한도전 짤 모음입니다. 방송이 끝난 지 오래지만 짤은 여전히 현역 — 상황별 명장면을 검색해서 쓰세요.',
  },
  {
    keyword: '뽀로로',
    title: '뽀로로 짤 모음',
    intro:
      '뽀로로와 친구들의 짤 모음입니다. 아이들 만화지만 어른들의 대화에서 더 자주 쓰이는 표정들 — 순진한 척 웃기고 싶을 때 쓰세요.',
  },
];

const BY_KEYWORD = new Map(JJAL_TAGS.map((t) => [t.keyword, t]));

export function getTag(keyword: string): JjalTag | null {
  return BY_KEYWORD.get(keyword) ?? null;
}

// 태그 페이지 그리드 — keywords 정확 일치만(검색과 달리 벡터 확장 없음: 색인 페이지는 결정적이어야 한다)
export async function tagJjals(fetch: Fetch, keyword: string, limit = 80): Promise<Jjal[]> {
  const COLS = 'id,image_url,thumb_url,width,height,caption,keywords,source_url,meme_id';
  const enc = encodeURIComponent(keyword);
  return sbGet<Jjal[]>(
    fetch,
    `jjals?select=${COLS}&status=eq.live&keywords=cs.{"${enc}"}&order=id.desc&limit=${limit}`
  );
}
