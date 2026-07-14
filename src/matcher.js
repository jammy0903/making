// 사전 대조 매처 (Dictionary Matcher)
//
// "댓글에서 밈을 발굴"하지 않는다. 등록된 밈의 키워드가 댓글에 몇 번 나오는지 "측정"만 한다.
// 사전에 없는 말(감사합니다 등)은 셀 일이 없으므로 노이즈가 구조적으로 0이다.
//
// 규칙:
//  - 매칭 전 댓글·키워드 양쪽을 동일하게 정규화(공백 제거·소문자화·구두점 제거).
//    단 이모지는 밈 정체성이라 보존한다. (예: "좋🤙다" 는 "좋다"로 뭉개지 않음)
//  - 키워드 매칭 등급 이원화(짧은 키워드 오탐 방지 + 짧은 밈 보존):
//      3글자 이상 → 부분 문자열 매칭 (댓글 어디든 포함되면 카운트)
//      2글자     → 토큰 정확 일치 (공백/구두점 분리 후 그 토큰이 정확히 키워드일 때만)
//      1글자     → 거부(오탐 폭탄)
//    → "밤티"는 단독 단어로 쓰이면 잡히고 "밤티셔츠"엔 안 묻음. (조사 붙은 "밤티가"는 미매칭 — 필요 시 3글자 변형을 시드에 추가)
//  - 인명 단독 키워드는 시드 단계에서 넣지 않는다(밈 언급이 아니라 사람 언급을 세게 됨).

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// 댓글을 토큰 집합으로 (2글자 토큰 정확 일치용)
function tokenize(text) {
  return new Set(
    (text || '')
      .split(SPLIT_RE)
      .map(normalizeForMatch)
      .filter(Boolean)
  );
}

// 시드를 로드하면서 키워드를 정규화·검증·등급 분류한다.
function loadMemes() {
  const raw = JSON.parse(readFileSync(join(__dirname, 'memes.seed.json'), 'utf-8'));
  const dropped = [];
  const empty = [];

  const memes = raw.map((m) => {
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

export const memes = loadMemes();

// 댓글 목록에서 밈별 언급 횟수를 센다.
//  - seen: 이미 센 댓글 id 집합(중복 카운트 방지). 넘기면 처리한 id를 이 집합에 추가한다.
//  - 반환: [{ memeId, name, count }]
export function matchComments(comments, { seen } = {}) {
  const counts = new Map(memes.map((m) => [m.id, 0]));

  for (const c of comments) {
    if (seen && c.id != null) {
      if (seen.has(c.id)) continue; // 이전 크롤에서 이미 센 댓글
      seen.add(c.id);
    }
    const dense = normalizeForMatch(c.text);
    const tokens = tokenize(c.text);
    for (const m of memes) {
      const hit =
        m.subKeywords.some((k) => dense.includes(k)) ||
        m.tokenKeywords.some((k) => tokens.has(k));
      if (hit) counts.set(m.id, counts.get(m.id) + 1);
    }
  }

  return memes.map((m) => ({ memeId: m.id, name: m.name, count: counts.get(m.id) }));
}
