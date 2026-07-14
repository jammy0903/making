// X(트위터) 크롤러 (비공식 내부 GraphQL 검색 — 직접 스크래핑)
//
// 공식 API는 recent search가 유료 티어라, 무료로 가기 위해 X 웹앱이 쓰는 내부
// GraphQL SearchTimeline 엔드포인트를 로그인 세션 쿠키로 직접 호출한다.
// 주제(등록 밈)별 검색어로 최근 트윗을 모아 "한국어 트윗"만 골라 텍스트를 수집한다.
//
// 검색어 전략: 핀터레스트와 동일 —
//   1) status='steady' 밈 이름을 검색어로(사전 대조 측정과 정합)
//   2) 없거나 DB 미연결이면 밈 성지 폴백 검색어
//
// ⚠️ 매우 볼라틸: 아래 세 가지는 X가 바꾸면 깨진다. 크롤이 조용히 0건이면 여기부터 갱신:
//   (A) SEARCH_QUERY_ID — 브라우저 X 검색 → 개발자도구 Network → "SearchTimeline"
//        요청 URL의 `/graphql/<이 부분>/SearchTimeline` 값으로 교체.
//   (B) FEATURES — 같은 요청의 `features=` 쿼리스트링 JSON을 그대로 복붙 교체
//        (없는 플래그가 있으면 400이 난다).
//   (C) 쿠키 만료 — 아래 env의 auth_token/ct0가 만료되면 재로그인 후 갱신.
//
// 필요 환경변수(로그인 세션 쿠키 — 자기 계정에서 뽑기, 밴 위험 있으니 부계정 권장):
//   X_AUTH_TOKEN = 쿠키 auth_token 값
//   X_CT0        = 쿠키 ct0 값 (csrf 토큰)
//   둘 중 하나라도 없으면 크롤러는 조용히 건너뛴다.

import * as supa from '../supabase.js';

const SOURCE = 'x';
const GQL = 'https://x.com/i/api/graphql';
const SEARCH_OP = 'SearchTimeline';

// (A) 볼라틸: X가 배포할 때마다 바뀜. 깨지면 devtools에서 최신값으로 교체.
const SEARCH_QUERY_ID = 'nKAncKPFVLcuw5YrfL3kdw';

// X 웹앱 공개(게스트) Bearer — 오래도록 안 바뀐 상수.
const BEARER =
  'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

// (B) 볼라틸: SearchTimeline 요청의 features JSON. 400 나면 devtools 값으로 교체.
const FEATURES = {
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

const MAX_TWEETS = 20;    // 검색 1회당 트윗 수
const MAX_TEXT_LEN = 200;
const MAX_QUERIES = 10;   // 과호출/차단 방지

const FALLBACK_QUERIES = ['밈', '유행어', '웃긴 트윗', '드립', '요즘 밈'];

const HEADERS_BASE = {
  authorization: BEARER,
  'x-twitter-auth-type': 'OAuth2Session',
  'x-twitter-active-user': 'yes',
  'x-twitter-client-language': 'ko',
  'content-type': 'application/json',
  'accept-language': 'ko-KR,ko;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function isKorean(text) {
  const kr = (text.match(/[가-힣]/g) || []).length;
  const letters = (text.match(/[가-힣a-zA-Zぁ-んァ-ヶ一-龥]/g) || []).length;
  return letters > 0 && kr / letters >= 0.3;
}

// SearchTimeline 응답에서 트윗 텍스트를 뽑는다 (깊고 버전 의존적이라 방어적으로).
function extractTweets(json) {
  const out = [];
  const instructions =
    json?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions || [];
  for (const ins of instructions) {
    for (const entry of ins.entries || []) {
      const result =
        entry?.content?.itemContent?.tweet_results?.result ||
        entry?.content?.itemContent?.tweet_results?.result?.tweet;
      const legacy = result?.legacy || result?.tweet?.legacy;
      const restId = result?.rest_id || result?.tweet?.rest_id;
      if (!legacy || !restId) continue;
      let text = (legacy.full_text || '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length <= 2 || !isKorean(text)) continue;
      out.push({
        id: `${SOURCE}:${restId}`,
        text: text.length > MAX_TEXT_LEN ? text.slice(0, MAX_TEXT_LEN) : text,
        source: SOURCE,
        timestamp: Date.now(),
        url: `https://x.com/i/status/${restId}`,
      });
    }
  }
  return out;
}

async function crawlQuery(q, cookie, ct0) {
  const variables = {
    rawQuery: `${q} lang:ko`,
    count: MAX_TWEETS,
    querySource: 'typed_query',
    product: 'Latest',
  };
  const url =
    `${GQL}/${SEARCH_QUERY_ID}/${SEARCH_OP}` +
    `?variables=${encodeURIComponent(JSON.stringify(variables))}` +
    `&features=${encodeURIComponent(JSON.stringify(FEATURES))}`;

  const res = await fetch(url, {
    headers: { ...HEADERS_BASE, 'x-csrf-token': ct0, Cookie: cookie },
  });
  if (!res.ok) {
    // 볼라틸 상수/쿠키 문제 진단을 위해 실패는 로그로 드러낸다(핀터레스트와 달리).
    console.error(`[X] 검색 실패 "${q}": ${res.status} (queryId/features/쿠키 확인)`);
    return [];
  }
  const json = await res.json();
  return extractTweets(json);
}

async function buildQueries() {
  try {
    const memes = await supa.fetchSteadyMemes();
    const names = memes.map((m) => (m.name || '').trim()).filter((n) => n.length >= 2);
    if (names.length) return names.slice(0, MAX_QUERIES);
  } catch {
    // DB 미연결 등 → 폴백
  }
  return FALLBACK_QUERIES;
}

export async function crawl() {
  const authToken = process.env.X_AUTH_TOKEN;
  const ct0 = process.env.X_CT0;
  if (!authToken || !ct0) {
    console.error('[X] X_AUTH_TOKEN/X_CT0 미설정 — 건너뜀');
    return [];
  }
  const cookie = `auth_token=${authToken}; ct0=${ct0}`;
  const queries = await buildQueries();

  const results = await Promise.all(
    queries.map((q) => crawlQuery(q, cookie, ct0).catch(() => []))
  );
  return results.flat();
}

export const source = SOURCE;
