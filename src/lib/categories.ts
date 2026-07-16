// 밈 분류 선택지 (관리자 편집·상세 편집 드롭다운 공용). 실제 DB 사용 빈도순 큐레이션.
// ⚠️ static/admin.js에도 동일 목록(CATEGORIES)이 있으니 여길 바꾸면 거기도 맞출 것.
export const CATEGORIES = [
  '일반인', '크리에이터', '방송인', '배우', '가수', '래퍼',
  '프로그램', '게임', '캐릭터', '신조어', '외국', '기타',
];

// 분류 영어 라벨 (표시용 — 필터 값은 원본 유지). 한국 분류 + US 영어 슬러그 모두 커버.
export const CATEGORY_EN: Record<string, string> = {
  '일반인': 'General public', '크리에이터': 'Creator', '방송인': 'TV personality',
  '배우': 'Actor', '가수': 'Singer', '래퍼': 'Rapper', '프로그램': 'TV show',
  '게임': 'Game', '캐릭터': 'Character', '신조어': 'Slang', '외국': 'Foreign', '기타': 'Other',
  '축구': 'Football', '유행어': 'Buzzword', '유튜브': 'YouTube',
  format: 'Format', reaction: 'Reaction', animal: 'Animal', character: 'Character',
  video: 'Video', celebrity: 'Celebrity', brainrot: 'Brainrot', catchphrase: 'Catchphrase', sus: 'Sus',
};
// en이면 영어 라벨(모르면 원본), 아니면 원본.
export function catLabel(cat: string, en: boolean): string {
  return en ? (CATEGORY_EN[cat] || cat) : cat;
}
