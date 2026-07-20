// 하이로우 게임 SSR — 최신 스냅샷의 상장 풀만 출전.
// 상장 기준: naver_trend 주간 유량 ≥ 1 (유량 없는 롱테일은 동전던지기라 제외).
// 비교 지표는 합성 score가 아니라 유량(trend_value) — 저량(누적 문서수) 오염 방지.
import { error } from '@sveltejs/kit';
import { sbGet, isEnLocale, isKoreanRequest } from '$lib/server/db';
import type { PageServerLoad } from './$types';

type Row = {
  meme_id: number;
  trend_value: number;
  memes: { name: string; name_en: string | null; photo_url: string | null; tags: string[] | null };
};

export const load: PageServerLoad = async ({ fetch, setHeaders, request }) => {
  // 원래는 "최신 snapshot_date 조회 → 그 날짜로 다시 조회" 2회 순차 호출이었다(왕복 2배).
  // snapshot_date.desc, trend_rank.asc로 한 번에 정렬하면 최신 날짜의 상위 랭크가 먼저
  // 나오므로 limit만으로 같은 결과를 한 번의 호출로 얻는다(day는 화면에서 안 써서 버림).
  const rows = await sbGet<Row[]>(
    fetch,
    'rank_snapshots?select=meme_id,trend_value,memes(name,name_en,photo_url,tags)&trend_value=gte.1&order=snapshot_date.desc,trend_rank.asc&limit=100'
  );
  if (!rows.length) throw error(503, '지수 준비 중입니다');

  // IP 기준 국가 필터 — 한국 IP는 한국밈만, 그 외는 미국밈만 출제 (tags의 '#미국'로 원산지 판정)
  const kr = isKoreanRequest(request);
  const filtered = rows.filter((r) => (r.memes.tags || []).includes('#미국') !== kr);
  if (filtered.length < 4) throw error(503, '지수 준비 중입니다');

  const en = isEnLocale();
  const pool = filtered.map((r) => ({
    id: r.meme_id,
    name: (en && r.memes.name_en) || r.memes.name,
    photo: r.memes.photo_url || '',
    // 화면용 지수 — anchor("밈") 대비 검색 비율 ×10 정수. 동점이면 어느 쪽을 골라도 정답 처리.
    idx: Math.round(r.trend_value * 10),
  }));

  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=3600', vary: 'x-vercel-ip-country, accept-language' }); // 스냅샷이 일 1회라 1시간 캐시
  return { pool };
};
