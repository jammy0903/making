// /img 프록시의 SSRF 방어·다운로드 로직. 라우트(+server.ts)는 HTTP 메서드만 export할 수
// 있어서, 검사 로직을 여기로 빼 단독으로 검증할 수 있게 했다.
//
// 방어선:
//   1) 허용 도메인만 (원시 IP·localhost·점 없는 호스트 차단)
//   2) 리다이렉트는 직접 따라가며 매 홉마다 1)을 다시 검사 (최대 MAX_REDIRECTS)
//      — fetch 기본값(follow)은 허용 도메인이 내부 주소로 302를 보내면 그대로 따라간다.
//        허용 목록에 cloudfront.net·supabase.co처럼 누구나 하위 도메인을 만들 수 있는
//        공유 CDN이 있어, 이 경로가 실제로 열려 있었다.
//   3) 크기 상한은 받으면서 센다 — Content-Length가 크면 바로 거부, 없거나 거짓이면
//      스트림 도중 상한을 넘는 순간 끊는다 (전부 받은 뒤 검사하지 않음).
//   4) 이미지 여부는 매직바이트로 판별하고, 상류 content-type은 믿지 않는다.
// 남은 한계: 허용 도메인의 DNS가 내부 IP로 풀리는 경우(DNS 리바인딩)는 막지 않는다.
//   허용 목록이 대형 CDN이라 공격자가 그 DNS를 조작할 수 없다고 보고 받아들인 위험이다.
import { error } from '@sveltejs/kit';

// 밈 사진이 실린 이미지 호스트의 등록가능 도메인(하위 도메인 변형까지 커버).
const ALLOW = [
  'imgflip.com', 'kym-cdn.com', 'namu.wiki', 'pinimg.com', 'ytimg.com', 'ggpht.com',
  'ruliweb.com', 'sndcdn.com', 'slidesharecdn.com', 'theqoo.net', 'dmitory.com',
  'extmovie.com', 'ezmember.co.kr', 'freepik.com', 'daumcdn.net', 'plaync.com',
  'naver.net', 'pstatic.net', 'jjalbang.today', 'fastly.net', 'googleusercontent.com',
  'orbi.kr', 'coupangcdn.com', 'hoyolab.com', 'inven.co.kr', 'wikimedia.org', '123rf.com',
  'fomos.kr', 'tenor.com', 'goodgag.net', 'ibispaint.com', 'maily.so', 'mania.kr',
  'slist.kr', 'melon.co.kr', 'cloudfront.net', 'dcinside.com', 'dcinside.co.kr',
  'cdnser.be', 'humoruniv.com', 'supabase.co', 'bobaedream.co.kr', 'instiz.net', 'pann.com',
];
export const MAX_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_REDIRECTS = 3;

type Fetch = typeof fetch;

export function allowedHost(host: string): boolean {
  host = host.toLowerCase();
  if (!host.includes('.') || host === 'localhost') return false;
  if (/^\d/.test(host)) return false; // 원시 IP·수치 호스트 차단(밈 CDN은 모두 이름 도메인)
  return ALLOW.some((d) => host === d || host.endsWith('.' + d));
}

// 프로토콜·호스트 검사를 통과한 URL만 돌려준다. 첫 요청과 리다이렉트 목적지 모두 여기를 거친다.
export function checkUrl(raw: string, base?: URL): URL {
  let u: URL;
  try {
    u = new URL(raw, base);
  } catch {
    throw error(400, 'bad url');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw error(400, 'bad protocol');
  if (!allowedHost(u.hostname)) throw error(403, 'host not allowed');
  return u;
}

// 매직바이트로 실제 이미지인지 판별하고 그 타입을 돌려준다.
// content-type만 믿으면 안 된다 — pann 등 일부 호스트는 진짜 이미지를
// application/octet-stream 으로 내려줘서 멀쩡한 밈 사진이 카드에서 빠졌다.
// (upgrade-photos.js도 같은 이유로 매직바이트를 본다)
export function sniffImage(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  if (b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp';
  const tag = (i: number) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
  if (tag(0) === 'RIFF' && tag(8) === 'WEBP') return 'image/webp';
  if (tag(4) === 'ftyp') {
    const brand = tag(8);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return null;
}

// 리다이렉트를 직접 따라가며 매 홉의 목적지를 checkUrl로 재검사한다.
export async function fetchChecked(fetch: Fetch, start: URL): Promise<Response> {
  let cur = start;
  for (let hop = 0; ; hop++) {
    let res: Response;
    try {
      res = await fetch(cur.href, {
        redirect: 'manual',
        headers: {
          // 일부 호스트의 핫링크 차단 우회 — 자기 출처 Referer + 브라우저 UA
          'User-Agent': 'Mozilla/5.0 (compatible; memedics/1.0; +https://making-two.vercel.app)',
          Referer: `${cur.protocol}//${cur.host}/`,
          Accept: 'image/*,*/*;q=0.8',
        },
      });
    } catch {
      throw error(502, 'fetch failed');
    }
    if (res.status < 300 || res.status >= 400) return res;

    const loc = res.headers.get('location');
    await res.body?.cancel().catch(() => {}); // 리다이렉트 본문은 버린다
    if (!loc) throw error(502, 'redirect without location');
    if (hop >= MAX_REDIRECTS) throw error(502, 'too many redirects');
    cur = checkUrl(loc, cur); // 상대 경로도 현재 URL 기준으로 풀어서 검사
  }
}

// 상한을 넘는 순간 읽기를 멈춘다. Content-Length는 힌트일 뿐이라 실제 바이트도 센다.
export async function readCapped(res: Response, max = MAX_BYTES): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) {
    await res.body?.cancel().catch(() => {});
    throw error(413, 'too large');
  }
  if (!res.body) return new Uint8Array(0);

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      throw error(413, 'too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}
