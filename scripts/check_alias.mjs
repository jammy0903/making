// 별칭 사전 자가 점검 (docs/jjal-alias-plan.md 4장의 규칙을 기계로 강제한다).
// 사람이 규칙을 알고도 어긴 사례가 실제로 나왔다('냥','개' 한 글자 별칭) — 그래서 검사를 둔다.
// 사용: node --experimental-strip-types scripts/check_alias.mjs
import { ALIAS_GROUPS, expandQuery } from '../src/lib/server/jjalAlias.ts';

const norm = (s) => s.toLowerCase().replace(/\s+/g, '');
const errors = [];
const owner = new Map(); // 정규화 키 → 처음 등장한 그룹 번호

ALIAS_GROUPS.forEach((g, gi) => {
  if (g.length < 2) errors.push(`그룹 ${gi}: 원소가 ${g.length}개 — 별칭이 없으면 그룹이 아니다`);
  const local = new Set();
  for (const t of g) {
    if (t.trim() !== t) errors.push(`그룹 ${gi}: '${t}' 앞뒤 공백`);
    // 한 글자 별칭은 caption 부분 일치에서 아무 데나 걸린다('개' → '개짜증','개드립')
    if (t.replace(/\s/g, '').length < 2) errors.push(`그룹 ${gi}: '${t}' 한 글자 별칭 금지`);
    const k = norm(t);
    if (local.has(k)) errors.push(`그룹 ${gi}: '${t}' 그룹 안 중복`);
    local.add(k);
    // 두 그룹에 걸친 단어는 동음이의 사고다. 인덱스가 조용히 무력화하므로 눈에 보이게 만든다.
    if (owner.has(k)) errors.push(`'${t}' 가 그룹 ${owner.get(k)}·${gi} 양쪽에 있다 — 확장이 무력화된다`);
    else owner.set(k, gi);
  }
});

// 확장이 실제로 도는지(사전이 통째로 죽어도 타입은 통과한다)
for (const [q, must] of [['GD', '지드래곤'], ['무도', '무한도전']]) {
  if (!expandQuery(q).includes(must)) errors.push(`expandQuery('${q}') 에 '${must}' 없음`);
}

console.log(`그룹 ${ALIAS_GROUPS.length}개 · 별칭 ${owner.size}개`);
if (errors.length) {
  console.error(`\n실패 ${errors.length}건:`);
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log('통과');
