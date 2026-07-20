// 투표 결과 공유 카드 — public/share.js 이식(클라 전용, 이벤트 핸들러에서만 호출).
// 카드는 받은 사람에게 "당신의 판정은?"을 던져 /m/[id]로 투표하러 오게 하는 유입 루프.
const C = {
  bg: '#E6F2ED', ink: '#1B1B18', ink2: '#2A2A26',
  accent: '#1E7A4E', accentDark: '#14603C', accentBorder: '#CBE7D6',
  mute: '#6E6E67', mute3: '#A6A69C', line2: '#DADAD2',
};
const SERIF = '"Noto Serif KR", serif';
const SANS = '"Noto Sans KR", sans-serif';
const W = 1080, H = 1080;

export interface ShareMeme {
  id: number;
  name: string;
  voteYes: number;
  voteNotmeme: number; // 예전엔 voteNo(죽은 밈)와의 생존율이었으나 사망 개념을 걷어내며 바뀌었다
  photo?: string; // 해당 밈의 짤. 외부 호스트가 CORS를 안 주면 로드 실패 → 사진 없는 배치로 폴백
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startPx: number, minPx: number, weight: number, family: string) {
  let px = startPx;
  for (; px > minPx; px -= 4) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  return px;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h); // 구형 브라우저는 각진 바로 폴백
  }
}

// 캔버스가 읽을 수 있는 src로 변환한다. 로컬(/memes 등)·same-origin은 그대로,
// 외부 호스트는 same-origin 프록시(/img)로 태운다 — 외부 CDN은 CORS를 안 줘서
// crossOrigin 로드가 실패하고 사진이 카드에서 빠지기 때문(프록시는 서버가 대신 받아옴).
function canvasSrc(url: string): string {
  if (!url) return url;
  if (url.startsWith('/') || url.startsWith(location.origin)) return url;
  if (/^https?:\/\//i.test(url)) return `/img?u=${encodeURIComponent(url)}`;
  return url;
}

// 카카오 공유 등 외부 서버가 직접 fetch해야 하는 곳에서 쓰는 절대 URL 버전.
// canvasSrc와 동일 로직(외부 호스트는 same-origin 프록시로)이되 origin을 붙여 완전한 URL로 만든다.
export function publicImgUrl(url: string): string {
  const src = canvasSrc(url);
  if (!src) return `${location.origin}/og-default.png`;
  return src.startsWith('http') ? src : `${location.origin}${src}`;
}

// 카드용 이미지 로더 — crossOrigin='anonymous'로만 로드해 canvas 오염을 원천 차단한다.
// 프록시를 거친 외부 사진은 same-origin이라 통과하고, 프록시 실패분만 onerror로 스킵된다.
function loadImg(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 4000); // 느린 외부 이미지가 카드 생성을 막지 않도록
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = canvasSrc(url);
  });
}

// cover 핏으로 둥근 사각 안에 이미지 그리기 + 테두리
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  roundedRect(ctx, x, y, w, h, r);
  ctx.clip();
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
  ctx.strokeStyle = C.accentBorder;
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

export async function drawCard(m: ShareMeme): Promise<HTMLCanvasElement> {
  const [, img] = await Promise.all([
    Promise.all([
      document.fonts.load(`700 96px ${SERIF}`),
      document.fonts.load(`600 44px ${SERIF}`),
      document.fonts.load(`400 30px ${SANS}`),
      document.fonts.load(`700 40px ${SANS}`),
    ]).catch(() => {}),
    loadImg(m.photo ?? ''),
  ]);

  // 짤이 실리면 위에 얹고 아래 요소를 내린다. 로드 실패 시 기존(사진 없는) 배치를 그대로 써서
  // 빈 구멍이 남지 않게 한다 — KYM·네이버 등 CORS를 안 주는 호스트가 실제로 4분의 1쯤 된다.
  const L = img
    ? { brand: 150, sub: 190, name: 620, nameMax: 84, gy: 664, pctDy: 76, totalDy: 140, q: 892, host: 946 }
    : { brand: 160, sub: 200, name: 380, nameMax: 104, gy: 520, pctDy: 100, totalDy: 170, q: 880, host: 940 };

  const total = m.voteYes + m.voteNotmeme;
  const yesPct = total ? Math.round((m.voteYes / total) * 100) : 0;
  const noPct = total ? 100 - yesPct : 0;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.accentBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeRect(52, 52, W - 104, H - 104);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.accent;
  ctx.font = `700 30px ${SANS}`;
  ctx.fillText('M E M E D I C S', W / 2, L.brand);
  ctx.fillStyle = C.mute3;
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText('한국 밈 트렌드 사전', W / 2, L.sub);

  if (img) drawCover(ctx, img, (W - 300) / 2, 236, 300, 300, 28);

  ctx.fillStyle = C.ink;
  const namePx = fitFont(ctx, m.name, W - 200, L.nameMax, 48, 700, SERIF);
  ctx.font = `700 ${namePx}px ${SERIF}`;
  ctx.fillText(m.name, W / 2, L.name);

  const gx = 160, gw = W - 320, gy = L.gy, gh = 34;
  ctx.fillStyle = C.line2;
  roundedRect(ctx, gx, gy, gw, gh, gh / 2);
  ctx.fill();
  if (total && yesPct > 0) {
    ctx.fillStyle = C.accent;
    roundedRect(ctx, gx, gy, Math.max(gh, (gw * yesPct) / 100), gh, gh / 2);
    ctx.fill();
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = C.accentDark;
  ctx.font = `700 40px ${SANS}`;
  ctx.fillText(`밈이다 ${yesPct}%`, gx, gy + L.pctDy);
  ctx.textAlign = 'right';
  ctx.fillStyle = C.mute;
  ctx.fillText(`아니다 ${noPct}%`, gx + gw, gy + L.pctDy);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.mute;
  ctx.font = `400 30px ${SANS}`;
  ctx.fillText(total ? `${total}표 참여` : '아직 판정 없음', W / 2, gy + L.totalDy);

  ctx.fillStyle = C.ink;
  ctx.font = `600 44px ${SERIF}`;
  ctx.fillText('당신의 판정은?', W / 2, L.q);
  ctx.fillStyle = C.mute3;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(location.host, W / 2, L.host);

  return canvas;
}

// ── 세대 판독기 결과 카드 — 문구는 호출측이 로케일에 맞게 넘긴다 ──
export interface EraResult {
  headline: string; // "2016년" | "판독 불가"
  sub: string;      // 세대 라벨
  stat: string;     // "출제 18개 중 12개 알아봄"
  question: string; // "당신의 정신연령은?"
  shareText: string;
  photos?: string[]; // 아는 밈 썸네일(있으면 카드에 한 줄로) — 로드 실패분은 자동 제외
}

export async function drawEraCard(r: EraResult): Promise<HTMLCanvasElement> {
  const [, ...imgs] = await Promise.all([
    Promise.all([
      document.fonts.load(`700 200px ${SERIF}`),
      document.fonts.load(`600 44px ${SERIF}`),
      document.fonts.load(`400 30px ${SANS}`),
    ]).catch(() => {}),
    ...(r.photos ?? []).slice(0, 4).map(loadImg),
  ]);
  const thumbs = imgs.filter(Boolean) as HTMLImageElement[];

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.accentBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeRect(52, 52, W - 104, H - 104);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.accent;
  ctx.font = `700 30px ${SANS}`;
  ctx.fillText('M E M E D I C S', W / 2, 160);
  ctx.fillStyle = C.mute3;
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText('밈 세대 판독기', W / 2, 200);

  ctx.fillStyle = C.ink;
  const hpx = fitFont(ctx, r.headline, W - 200, 200, 72, 700, SERIF);
  ctx.font = `700 ${hpx}px ${SERIF}`;
  ctx.fillText(r.headline, W / 2, 480);

  ctx.fillStyle = C.accentDark;
  const spx = fitFont(ctx, r.sub, W - 240, 52, 32, 600, SERIF);
  ctx.font = `600 ${spx}px ${SERIF}`;
  ctx.fillText(r.sub, W / 2, 590);

  ctx.fillStyle = C.mute;
  ctx.font = `400 30px ${SANS}`;
  ctx.fillText(r.stat, W / 2, 680);

  // 아는 밈 썸네일 한 줄(중앙 정렬) — 결과에 개인색을 더하고 어떤 밈을 알아봤는지 보여준다
  if (thumbs.length) {
    const size = 118, gap = 20;
    const rowW = thumbs.length * size + (thumbs.length - 1) * gap;
    let px = (W - rowW) / 2;
    const py = 726;
    for (const im of thumbs) { drawCover(ctx, im, px, py, size, size, 18); px += size + gap; }
  }

  ctx.fillStyle = C.ink;
  ctx.font = `600 44px ${SERIF}`;
  ctx.fillText(r.question, W / 2, 890);
  ctx.fillStyle = C.mute3;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(location.host, W / 2, 946);

  return canvas;
}

// 판독기·하이로우는 결과 화면이 카드를 미리 그려 두고 cardBlob/shareBlob/saveBlob을 직접 쓴다
// (미리보기와 공유·저장이 같은 blob을 재사용) — 그래서 여기 래퍼는 두지 않는다.

// ── 카드 → 파일 공통부 ──
// 결과 화면이 카드를 먼저 그려 미리보기로 띄우고, 그 blob을 공유·저장에 재사용한다
// (버튼 누를 때마다 다시 그리면 외부 사진을 매번 새로 기다린다).

export function cardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
}

// "사진 저장" 전용 — 공유 시트를 거치지 않고 바로 파일로 내려받는다.
export function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// 공유 시트 — 폰에서는 여기에 카카오톡·인스타그램이 뜬다(Web Share level 2, files 지원 기기).
// 미지원(주로 데스크톱)이면 저장 + 링크 복사로 폴백.
// 반환: 'shared' | 'cancel' | 'downloaded+copied' | 'downloaded'
export async function shareBlob(blob: Blob, filename: string, text: string): Promise<string> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancel';
      /* 미지원 오류면 폴백 계속 */
    }
  }
  saveBlob(blob, filename);
  try {
    await navigator.clipboard.writeText(text);
    return 'downloaded+copied';
  } catch {
    return 'downloaded';
  }
}

function memeUrl(m: ShareMeme) {
  return `${location.origin}/m/${m.id}`; // 경로형 딥링크(SEO 색인 가능)
}

// 반환: 'shared' | 'cancel' | 'downloaded+copied' | 'downloaded'
export async function voteCard(m: ShareMeme): Promise<string> {
  const canvas = await drawCard(m);
  const url = memeUrl(m);
  const total = m.voteYes + m.voteNotmeme;
  const yesPct = total ? Math.round((m.voteYes / total) * 100) : 0;
  const text = total
    ? `“${m.name}” 밈이다 ${yesPct}% · ${total}표 — 당신의 판정은?\n${url}`
    : `“${m.name}” 이거 밈 맞나요 — 첫 판정을 내려주세요\n${url}`;
  return shareBlob(await cardBlob(canvas), `memedics-${m.id}.png`, text);
}

// ── 하이로우 결과 카드 — 문구는 호출측이 로케일에 맞게 넘긴다 ──
export interface HlResult {
  big: string;      // "12연승"
  stopped: string;  // "'밈 이름'에서 멈춤"
  best: string;     // "최고 15연승" | "" (신기록 아닐 때 생략)
  question: string; // "당신은 몇 연속?"
  photo: string;    // 멈춘 밈의 사진(로드 실패 시 사진 없이 렌더)
  shareText: string;
}

export async function drawHlCard(r: HlResult): Promise<HTMLCanvasElement> {
  const [, img] = await Promise.all([
    Promise.all([
      document.fonts.load(`700 160px ${SERIF}`),
      document.fonts.load(`600 44px ${SERIF}`),
      document.fonts.load(`400 30px ${SANS}`),
      document.fonts.load(`700 30px ${SANS}`),
    ]).catch(() => {}),
    loadImg(r.photo),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.accentBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeRect(52, 52, W - 104, H - 104);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.accent;
  ctx.font = `700 30px ${SANS}`;
  ctx.fillText('M E M E D I C S', W / 2, 150);
  ctx.fillStyle = C.mute3;
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText('밈 하이로우', W / 2, 190);

  // 사진 하단 502 — 아래 "N연승"(160px)의 글자 상단이 522라 20px 여유가 남는다.
  // 300px/y236(하단 536)이던 값은 한글 어센트에 14px 파고들어 글자가 사진에 물렸다.
  if (img) drawCover(ctx, img, (W - 280) / 2, 222, 280, 280, 26);

  ctx.fillStyle = C.ink;
  const bigPx = fitFont(ctx, r.big, W - 220, 160, 80, 700, SERIF);
  ctx.font = `700 ${bigPx}px ${SERIF}`;
  ctx.fillText(r.big, W / 2, 660);

  ctx.fillStyle = C.mute;
  const spx = fitFont(ctx, r.stopped, W - 240, 32, 24, 400, SANS);
  ctx.font = `400 ${spx}px ${SANS}`;
  ctx.fillText(r.stopped, W / 2, 716);

  if (r.best) {
    ctx.fillStyle = C.accentDark;
    ctx.font = `700 30px ${SANS}`;
    ctx.fillText(r.best, W / 2, 772);
  }

  ctx.fillStyle = C.ink;
  ctx.font = `600 44px ${SERIF}`;
  ctx.fillText(r.question, W / 2, 892);
  ctx.fillStyle = C.mute3;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(location.host, W / 2, 946);

  return canvas;
}

