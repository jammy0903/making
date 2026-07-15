// 유튜브 발굴 공급 채널 ④ — 밈이 "태어나는" 곳(영상 제목)에서 후보를 뽑는다.
//   ④-a 급상승: 한국 인기 급상승 영상 제목 (chart=mostPopular, 1 unit)
//   ④-b 스트리머: 지정 채널의 최근 업로드 제목 (uploads 재생목록, 채널당 ~2 unit)
// 제목들을 LLM(Haiku)에 넣어 밈/챌린지/신조어 '이름'만 추출 → discover-search가 onset 게이트로 검증.
// 기존 youtube.js(댓글 수집)와 별개. 실패는 [] 로 격리.

import { fetchJson, reason } from '../crawlers/http.js';
import { askHaikuJson, hasLLMKey } from './llm.js';
import { STREAMERS, UPLOADS_PER_CHANNEL } from './streamers.js';

const API = 'https://www.googleapis.com/youtube/v3';
const REGION = 'KR';
const TRENDING_MAX = 50; // 급상승 최대(1 호출로 다 받음)
const LLM_BATCH = 25; // LLM 호출당 제목 수

const apiKey = () => process.env.youtube_data_api_key || process.env.YOUTUBE_API_KEY;

// ④-a: 인기 급상승 영상 제목
async function fetchTrendingTitles(key) {
  const url = `${API}/videos?part=snippet&chart=mostPopular&regionCode=${REGION}&maxResults=${TRENDING_MAX}&key=${key}`;
  try {
    const data = await fetchJson(url);
    return (data.items || []).map((it) => ({
      title: (it.snippet?.title || '').trim(),
      url: `https://www.youtube.com/watch?v=${it.id}`,
      channel: it.snippet?.channelTitle || null,
      src: 'yt-trending',
    })).filter((t) => t.title);
  } catch (err) {
    console.warn('[yt] 급상승 조회 실패(스킵):', reason(err));
    return [];
  }
}

// 핸들(@name) 또는 채널ID(UC…) → 업로드 재생목록 ID(UU…)
async function resolveUploads(key, handleOrId) {
  const q = handleOrId.startsWith('@')
    ? `forHandle=${encodeURIComponent(handleOrId)}`
    : `id=${encodeURIComponent(handleOrId)}`;
  try {
    const data = await fetchJson(`${API}/channels?part=contentDetails,snippet&${q}&key=${key}`);
    const ch = (data.items || [])[0];
    return ch
      ? { playlist: ch.contentDetails?.relatedPlaylists?.uploads, name: ch.snippet?.title || handleOrId }
      : null;
  } catch (err) {
    console.warn(`[yt] 채널 해석 실패 ${handleOrId}: ${reason(err)}`);
    return null;
  }
}

// ④-b: 스트리머 채널들의 최근 업로드 제목
async function fetchStreamerTitles(key) {
  if (!STREAMERS.length) return [];
  const out = [];
  for (const handle of STREAMERS) {
    const ch = await resolveUploads(key, handle);
    if (!ch?.playlist) continue;
    try {
      const data = await fetchJson(
        `${API}/playlistItems?part=snippet&playlistId=${ch.playlist}&maxResults=${UPLOADS_PER_CHANNEL}&key=${key}`
      );
      for (const it of data.items || []) {
        const title = (it.snippet?.title || '').trim();
        const vid = it.snippet?.resourceId?.videoId;
        if (title) out.push({ title, url: vid ? `https://www.youtube.com/watch?v=${vid}` : null, channel: ch.name, src: 'yt-streamer' });
      }
    } catch (err) {
      console.warn(`[yt] ${ch.name} 업로드 조회 실패: ${reason(err)}`);
    }
  }
  return out;
}

// 제목 목록 → LLM로 밈 term 추출(항목번호로 출처 영상 역참조)
async function extractTerms(videos) {
  if (!hasLLMKey || !videos.length) return [];
  const out = [];
  for (let i = 0; i < videos.length; i += LLM_BATCH) {
    const batch = videos.slice(i, i + LLM_BATCH);
    const listing = batch.map((v, idx) => `${idx + 1}. ${v.title}`).join('\n');
    const prompt = `아래는 유튜브 인기/최신 영상 제목 목록이다. 여기서 실제 밈·챌린지·유행어·신조어 '이름'만 뽑아라.
- 가수/그룹명·곡명·프로그램명·사람 이름·상품명·일반 명사는 제외
- 유행 표현/밈성 단어만. 확실한 것만. 없으면 [] 만 출력
JSON 배열로만(설명 금지): [{"term":"밈이름","from":항목번호}]

${listing}`;
    const arr = await askHaikuJson(prompt);
    for (const r of arr) {
      const v = batch[(Number(r.from) || 0) - 1];
      if (r && r.term) out.push({ term: String(r.term).trim(), url: v?.url, title: v?.title, channel: v?.channel, src: v?.src });
    }
  }
  return out;
}

// 공급: 유튜브 제목에서 추출한 term 후보.
// 반환: [{ term, src:'yt-trending'|'yt-streamer', evidence:{title,url,channel} }]
// dedup(등록밈·기각어·중복)과 onset 검증은 호출측(discover-search)이 담당.
export async function collectYoutubeTerms() {
  const key = apiKey();
  if (!key) { console.warn('[yt] youtube_data_api_key 없음 — 스킵'); return []; }
  if (!hasLLMKey) { console.warn('[yt] claude_key 없음 — LLM 추출 스킵'); return []; }

  const [trending, streamer] = await Promise.all([fetchTrendingTitles(key), fetchStreamerTitles(key)]);
  const videos = [...trending, ...streamer];
  const raw = await extractTerms(videos);

  const best = new Map();
  for (const t of raw) {
    const s = t.term.trim();
    if (!/^[가-힣0-9A-Za-z ]{2,15}$/.test(s)) continue;
    if (!/[가-힣]/.test(s)) continue; // 한글 포함만
    const key2 = s.replace(/\s+/g, '').toLowerCase();
    if (!best.has(key2)) best.set(key2, { term: s, src: t.src, evidence: { title: t.title, url: t.url, channel: t.channel } });
  }
  console.log(`[yt] 급상승 ${trending.length} + 스트리머 ${streamer.length} 제목 → term 추출 ${best.size}개`);
  return [...best.values()];
}
