// 밈 레이더 - 문장 단위 밈 탐지 엔진
//
// 3단계 분석:
//   1) 문장 유사도 클러스터링 → 거의 같은 문장 그룹핑
//   2) 핫 키워드 → 주변 문장 수집 → 패턴 추출
//   3) 글자 부분문자열(4~15자) 빈도 → 짧은 밈 표현 감지

// ─── 텍스트 정규화 ─────────────────────────────────

const NOISE_RE = /[ㅋㅎㅠㅜㄷ]{2,}|\.{2,}|!{2,}|\?{2,}|~+/g;
const BOARD_WORDS =
  /\b(jpg|gif|png|jpeg|단독|속보|긴급|뉴스|사진|움짤|펌|ㅊㅊ|추천|조회|댓글|공지|광고)\b/gi;

function normalize(text) {
  if (!text) return '';
  let s = text;
  s = s.replace(/https?:\/\/\S+/g, '');       // URL
  s = s.replace(/<[^>]+>/g, '');               // HTML
  s = s.replace(BOARD_WORDS, '');              // 게시판 노이즈
  s = s.replace(NOISE_RE, '');                 // ㅋㅋㅋ, ..., !!
  s = s.replace(/\([^)]*\)/g, '');             // (괄호 안 내용)
  s = s.replace(/\[[^\]]*\]/g, '');            // [대괄호 안 내용]
  s = s.replace(/[^\wㄱ-ㅎㅏ-ㅣ가-힣\s]/g, ' '); // 특수문자→공백
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ─── 1단계: 문장 유사도 클러스터링 ──────────────────

function charTrigrams(str) {
  const set = new Set();
  const s = str.replace(/\s/g, '');
  for (let i = 0; i <= s.length - 3; i++) {
    set.add(s.substring(i, i + 3));
  }
  return set;
}

function jaccard(setA, setB) {
  let inter = 0;
  for (const x of setA) {
    if (setB.has(x)) inter++;
  }
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function clusterSentences(posts, threshold = 0.45) {
  const items = posts.map((p) => {
    const norm = normalize(p.text);
    return {
      original: p.text,
      norm,
      trigrams: charTrigrams(norm),
      source: p.source,
    };
  }).filter((item) => item.norm.length >= 4);

  const invertedIndex = new Map();
  items.forEach((item, idx) => {
    for (const tg of item.trigrams) {
      if (!invertedIndex.has(tg)) invertedIndex.set(tg, []);
      invertedIndex.get(tg).push(idx);
    }
  });

  const candidatePairs = new Map();
  for (const [, indices] of invertedIndex) {
    if (indices.length > 200) continue;
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const key = `${indices[a]},${indices[b]}`;
        candidatePairs.set(key, (candidatePairs.get(key) || 0) + 1);
      }
    }
  }

  const parent = items.map((_, i) => i);
  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (const [key, sharedCount] of candidatePairs) {
    if (sharedCount < 3) continue;
    const [i, j] = key.split(',').map(Number);
    if (find(i) === find(j)) continue;

    const sim = jaccard(items[i].trigrams, items[j].trigrams);
    if (sim >= threshold) {
      union(i, j);
    }
  }

  const clusters = new Map();
  items.forEach((item, idx) => {
    const root = find(idx);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(item);
  });

  return clusters;
}

// ─── 2단계: 핫 키워드 → 문장 패턴 추출 ──────────────

const STOP_WORDS = new Set([
  '은', '는', '이', '가', '을', '를', '에', '에서', '의', '와', '과',
  '로', '으로', '도', '만', '까지', '부터', '보다', '처럼', '같이',
  '하다', '되다', '있다', '없다', '것', '수', '등', '더', '안', '못',
  '거', '게', '건', '걸', '뭐', '왜', '그냥', '아니', '네', '좀',
  '너무', '정말', '완전', '매우', '되게', '엄청', '진짜',
  '그래서', '그런데', '그리고', '하지만', '그래도', '근데',
  '나', '너', '우리', '얘', '걔', '사람', '때', '때문',
  '하는', '하고', '해서', '하면', '했는데', '있는', '없는',
  '같은', '같아', '이거', '그거', '여기', '거기',
  '글', '댓글', '추천', '조회', '제목', '내용',
]);

function isStopWord(w) {
  if (w.length < 2) return true;
  if (STOP_WORDS.has(w)) return true;
  if (/^\d+$/.test(w)) return true;
  if (/^[ㄱ-ㅎㅏ-ㅣ]{1,2}$/.test(w)) return true;
  return false;
}

function extractKeywords(posts) {
  const freq = new Map();

  for (const p of posts) {
    const norm = normalize(p.text);
    const words = norm.split(/\s+/).filter((w) => !isStopWord(w));
    const seen = new Set();

    for (const w of words) {
      if (seen.has(w)) continue;
      seen.add(w);
      if (!freq.has(w)) freq.set(w, { count: 0, sources: new Set() });
      freq.get(w).count++;
      freq.get(w).sources.add(p.source);
    }
  }

  return [...freq.entries()]
    .filter(([, d]) => d.count >= 5 && d.sources.size >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 30)
    .map(([word, data]) => ({ word, ...data, sources: [...data.sources] }));
}

function findSentencePattern(keyword, posts) {
  const sentences = [];
  for (const p of posts) {
    const norm = normalize(p.text);
    if (norm.includes(keyword)) {
      sentences.push({ norm, source: p.source, original: p.text });
    }
  }

  if (sentences.length < 3) return null;

  const trigSets = sentences.map((s) => charTrigrams(s.norm));
  const parent = sentences.map((_, i) => i);
  function find(x) {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      if (find(i) === find(j)) continue;
      if (jaccard(trigSets[i], trigSets[j]) >= 0.35) {
        union(i, j);
      }
    }
  }

  const groups = new Map();
  sentences.forEach((s, idx) => {
    const root = find(idx);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(s);
  });

  let bestGroup = [];
  for (const [, group] of groups) {
    if (group.length > bestGroup.length) bestGroup = group;
  }

  if (bestGroup.length < 2) return null;

  bestGroup.sort((a, b) => a.norm.length - b.norm.length);
  const representative = bestGroup[Math.floor(bestGroup.length * 0.3)];

  const sources = new Set();
  for (const s of bestGroup) sources.add(s.source);

  return {
    phrase: representative.norm,
    count: bestGroup.length,
    sources: [...sources],
    samples: bestGroup.slice(0, 5).map((s) => s.original.substring(0, 100)),
    keyword,
  };
}

// ─── 3단계: 글자 부분문자열 빈도 ───────────────────

function findRepeatedSubstrings(posts, minLen = 4, maxLen = 20) {
  const substringFreq = new Map();

  for (const p of posts) {
    const norm = normalize(p.text).replace(/\s/g, '');
    if (norm.length < minLen) continue;

    const seen = new Set();

    for (let len = minLen; len <= Math.min(maxLen, norm.length); len++) {
      for (let start = 0; start <= norm.length - len; start++) {
        const sub = norm.substring(start, start + len);

        if (new Set(sub).size <= 2) continue;

        if (seen.has(sub)) continue;
        seen.add(sub);

        if (!substringFreq.has(sub)) {
          substringFreq.set(sub, { count: 0, sources: new Set(), samples: [] });
        }
        const entry = substringFreq.get(sub);
        entry.count++;
        entry.sources.add(p.source);
        if (entry.samples.length < 5) {
          entry.samples.push(p.text.substring(0, 100));
        }
      }
    }
  }

  const results = [];
  for (const [sub, data] of substringFreq) {
    if (data.count >= 3 && data.sources.size >= 2) {
      results.push({
        phrase: sub,
        count: data.count,
        sources: [...data.sources],
        samples: data.samples,
      });
    }
  }

  results.sort((a, b) => b.phrase.length - a.phrase.length);
  const filtered = [];
  for (const r of results) {
    const dominated = filtered.some(
      (f) => f.phrase.includes(r.phrase) && f.count >= r.count * 0.5
    );
    if (!dominated) {
      filtered.push(r);
    }
  }

  return filtered.sort((a, b) => b.count - a.count).slice(0, 50);
}

// ─── 메인: 3단계 통합 ─────────────────────────────

export function analyzePosts(posts) {
  if (!posts || posts.length === 0) return [];

  const results = new Map();

  // === 1단계: 문장 클러스터링 ===
  const clusters = clusterSentences(posts);
  for (const [, members] of clusters) {
    if (members.length < 3) continue;

    const sources = new Set(members.map((m) => m.source));
    if (sources.size < 2) continue;

    const sorted = [...members].sort((a, b) => a.norm.length - b.norm.length);
    const rep = sorted[Math.floor(sorted.length * 0.3)];

    results.set(rep.norm, {
      phrase: rep.norm,
      type: 'sentence',
      count: members.length,
      sourceCount: sources.size,
      sources: [...sources],
      samples: members.slice(0, 5).map((m) => m.original.substring(0, 100)),
      score: 0,
    });
  }

  // === 2단계: 핫 키워드 → 문장 패턴 ===
  const hotKeywords = extractKeywords(posts);
  for (const kw of hotKeywords) {
    const pattern = findSentencePattern(kw.word, posts);
    if (!pattern) continue;

    let isDup = false;
    for (const [existing] of results) {
      if (jaccard(charTrigrams(existing), charTrigrams(pattern.phrase)) > 0.5) {
        isDup = true;
        break;
      }
    }
    if (isDup) continue;

    results.set(pattern.phrase, {
      phrase: pattern.phrase,
      type: 'keyword_pattern',
      count: pattern.count,
      sourceCount: pattern.sources.length,
      sources: pattern.sources,
      samples: pattern.samples,
      keyword: pattern.keyword,
      score: 0,
    });
  }

  // === 3단계: 부분문자열 빈도 ===
  const substrings = findRepeatedSubstrings(posts);
  for (const sub of substrings) {
    let isDup = false;
    for (const [existing] of results) {
      const existNoSpace = existing.replace(/\s/g, '');
      if (existNoSpace.includes(sub.phrase) || sub.phrase.includes(existNoSpace)) {
        isDup = true;
        break;
      }
    }
    if (isDup) continue;

    results.set(sub.phrase, {
      phrase: sub.phrase,
      type: 'substring',
      count: sub.count,
      sourceCount: sub.sources.length,
      sources: sub.sources,
      samples: sub.samples,
      score: 0,
    });
  }

  // === 최종 스코어링 ===
  const trends = [...results.values()];
  for (const t of trends) {
    const freqScore = Math.log2(t.count + 1) * 12;
    const sourceScore = t.sourceCount * 30;
    const typeBonus =
      t.type === 'sentence' ? 20 :
      t.type === 'keyword_pattern' ? 15 :
      t.type === 'substring' ? 10 : 0;
    const lenScore = t.phrase.length >= 4 && t.phrase.length <= 30 ? 10 : 0;

    t.score = Math.round((freqScore + sourceScore + typeBonus + lenScore) * 10) / 10;
  }

  trends.sort((a, b) => b.score - a.score);
  return trends.slice(0, 50);
}
