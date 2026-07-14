// 사전 대조 매처 (Dictionary Matcher)
//
// "댓글에서 밈을 발굴"하지 않는다. 등록된 밈의 키워드가 댓글에 나오는지 "측정"만 한다.
// 사전(memes 테이블)에 없는 말은 셀 일이 없으므로 노이즈가 구조적으로 0이다.
//
// 규칙:
//  - 매칭 전 댓글·키워드 양쪽을 동일하게 정규화(공백 제거·소문자화·구두점 제거).
//    단 이모지는 밈 정체성이라 보존한다. (예: "좋🤙다" 는 "좋다"로 뭉개지 않음)
//  - 키워드 매칭 등급 이원화(짧은 키워드 오탐 방지 + 짧은 밈 보존):
//      3글자 이상 → 부분 문자열 매칭 (댓글 어디든 포함되면 매칭)
//      2글자     → 토큰 정확 일치 (공백/구두점 분리 후 그 토큰이 정확히 키워드일 때만)
//      1글자     → 거부(오탐 폭탄)
//  - 인명 단독 키워드는 시드 단계에서 넣지 않는다(밈 언급이 아니라 사람 언급을 세게 됨).
//
// 사전(memes)은 Supabase에서 로드해 prepareMemes()로 등급 분류한 뒤 매칭에 넘긴다.

// 공백·구두점(한글·영숫자·이모지는 보존)
const PUNCT = `\\s.,!?~"'\`^*_\\-()\\[\\]{}<>…·、。！？:;/\\\\|@#$%&+=`;
const PUNCT_RE = new RegExp(`[${PUNCT}]`, 'gu');
const SPLIT_RE = new RegExp(`[${PUNCT}]+`, 'u');

export function normalizeForMatch(text) {
  return (text || '').toLowerCase().replace(PUNCT_RE, '');
}

function glyphLen(s) {
  return [...s].length; // 코드포인트 수 (이모지 대부분 1로 셈)
}

function tokenize(text) {
  return new Set((text || '').split(SPLIT_RE).map(normalizeForMatch).filter(Boolean));
}

// 밈 사전(DB 행: {id, name, keywords[]})을 정규화·등급 분류한다.
export function prepareMemes(rawMemes) {
  const dropped = [];
  const empty = [];

  const memes = rawMemes.map((m) => {
    const subKeywords = []; // 3글자↑ 부분문자열
    const tokenKeywords = []; // 2글자 토큰 정확일치
    for (const kw of m.keywords || []) {
      const norm = normalizeForMatch(kw);
      const len = glyphLen(norm);
      if (len >= 3) subKeywords.push(norm);
      else if (len === 2) tokenKeywords.push(norm);
      else dropped.push({ meme: m.name, keyword: kw });
    }
    if (subKeywords.length === 0 && tokenKeywords.length === 0) empty.push(m.name);
    return { id: m.id, name: m.name, subKeywords, tokenKeywords };
  });

  if (dropped.length) {
    console.warn(
      `[matcher] 1글자 키워드 ${dropped.length}개 거부: ` +
        dropped.map((d) => `${d.meme}:"${d.keyword}"`).join(', ')
    );
  }
  if (empty.length) {
    console.warn(`[matcher] 유효 키워드 0개 → 매칭 불가 밈: ${empty.join(', ')} (시드 보강 필요)`);
  }
  return memes;
}

// 한 댓글이 매칭하는 밈들
function memeHits(text, memes) {
  const dense = normalizeForMatch(text);
  const tokens = tokenize(text);
  return memes.filter(
    (m) =>
      m.subKeywords.some((k) => dense.includes(k)) ||
      m.tokenKeywords.some((k) => tokens.has(k))
  );
}

// DB 삽입용: (댓글, 밈) 매칭을 행으로. comment_id 없는 댓글은 건너뜀.
//  반환: [{ meme_id, comment_id, source }]
export function matchToRows(comments, memes) {
  const rows = [];
  for (const c of comments) {
    if (c.id == null) continue;
    for (const m of memeHits(c.text, memes)) {
      rows.push({ meme_id: m.id, comment_id: c.id, source: c.source });
    }
  }
  return rows;
}

// 로컬 카운트(검증·테스트용). seen 넘기면 이미 센 댓글 id 스킵.
export function matchComments(comments, memes, { seen } = {}) {
  const counts = new Map(memes.map((m) => [m.id, 0]));
  for (const c of comments) {
    if (seen && c.id != null) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
    }
    for (const m of memeHits(c.text, memes)) counts.set(m.id, counts.get(m.id) + 1);
  }
  return memes.map((m) => ({ memeId: m.id, name: m.name, count: counts.get(m.id) }));
}
