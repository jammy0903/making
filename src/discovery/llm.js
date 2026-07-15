// 발굴 공용 LLM 헬퍼 — Haiku에 프롬프트를 넣고 JSON 배열만 받아온다.
// scout(정리글)·youtube(제목) 등 여러 발굴 채널이 공유. 실패는 [] 로 격리(파이프라인 안 죽임).

const MODEL = 'claude-haiku-4-5-20251001';

export const hasLLMKey = Boolean(process.env.claude_key);

// prompt → 파싱된 JSON 배열(아니면 []). 코드펜스/설명 섞여 와도 관용적으로 처리.
export async function askHaikuJson(prompt, { maxTokens = 1500 } = {}) {
  const key = process.env.claude_key;
  if (!key) return [];
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    console.warn('[llm] 호출 실패(스킵):', err.message);
    return [];
  }
  if (!res.ok) { console.warn(`[llm] Haiku ${res.status}: ${(await res.text()).slice(0, 160)}`); return []; }
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || '').join('').trim();
  const json = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { const a = JSON.parse(json); return Array.isArray(a) ? a : []; } catch { return []; }
}
