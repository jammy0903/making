// 네이버 자동완성 (비공식) — "X 뜻"이 자동완성에 뜨면 그 뜻을 검색하는 사람이 실존한다는 가점 신호.
// 설계: docs/search-demand-design.md §3(자동완성). 비공식 엔드포인트라 언제든 막힐 수 있음 →
// 실패는 null(판정 불가) 반환으로 무시된다. 판정의 필수 조건으로 쓰지 말 것.

const AC_URL = 'https://ac.search.naver.com/nx/ac';

// 반환: true(존재) / false(없음) / null(확인 실패 — 무시)
export async function hasTteutSuggestion(term) {
  const q = `${term} 뜻`;
  const params = new URLSearchParams({
    q, st: '100', r_format: 'json', r_enc: 'UTF-8', q_enc: 'UTF-8', t_koreng: '1', frm: 'nv', ans: '2',
  });
  try {
    const res = await fetch(`${AC_URL}?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.naver.com/' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // items는 중첩 배열([[["단어"],...], ...]) — 평탄화 후 문자열만 검사
    const flat = JSON.stringify(data.items || []);
    return flat.includes('뜻') && flat.includes(term.slice(0, 2));
  } catch {
    return null;
  }
}
