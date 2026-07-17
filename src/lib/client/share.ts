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
  voteNo: number;
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

export async function drawCard(m: ShareMeme): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load(`700 96px ${SERIF}`),
    document.fonts.load(`600 44px ${SERIF}`),
    document.fonts.load(`400 30px ${SANS}`),
    document.fonts.load(`700 40px ${SANS}`),
  ]).catch(() => {});

  const total = m.voteYes + m.voteNo;
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
  ctx.fillText('M E M E D I C S', W / 2, 160);
  ctx.fillStyle = C.mute3;
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText('한국 밈 트렌드 사전', W / 2, 200);

  ctx.fillStyle = C.ink;
  const namePx = fitFont(ctx, m.name, W - 200, 104, 48, 700, SERIF);
  ctx.font = `700 ${namePx}px ${SERIF}`;
  ctx.fillText(m.name, W / 2, 380);

  const gx = 160, gw = W - 320, gy = 520, gh = 34;
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
  ctx.fillText(`생존 ${yesPct}%`, gx, gy + 100);
  ctx.textAlign = 'right';
  ctx.fillStyle = C.mute;
  ctx.fillText(`사망 ${noPct}%`, gx + gw, gy + 100);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.mute;
  ctx.font = `400 30px ${SANS}`;
  ctx.fillText(total ? `${total}표 참여` : '아직 판정 없음', W / 2, gy + 170);

  ctx.fillStyle = C.ink;
  ctx.font = `600 44px ${SERIF}`;
  ctx.fillText('당신의 판정은?', W / 2, 880);
  ctx.fillStyle = C.mute3;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(location.host, W / 2, 940);

  return canvas;
}

// ── 세대 판독기 결과 카드 — 문구는 호출측이 로케일에 맞게 넘긴다 ──
export interface EraResult {
  headline: string; // "2016년" | "판독 불가"
  sub: string;      // 세대 라벨
  stat: string;     // "출제 18개 중 12개 알아봄"
  question: string; // "당신의 정신연령은?"
  shareText: string;
}

export async function drawEraCard(r: EraResult): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load(`700 200px ${SERIF}`),
    document.fonts.load(`600 44px ${SERIF}`),
    document.fonts.load(`400 30px ${SANS}`),
  ]).catch(() => {});

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

  ctx.fillStyle = C.ink;
  ctx.font = `600 44px ${SERIF}`;
  ctx.fillText(r.question, W / 2, 880);
  ctx.fillStyle = C.mute3;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(location.host, W / 2, 940);

  return canvas;
}

// voteCard와 동일한 공유 흐름. 반환: 'shared' | 'cancel' | 'downloaded+copied' | 'downloaded'
export async function eraCard(r: EraResult): Promise<string> {
  const canvas = await drawEraCard(r);
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  const text = `${r.shareText}\n${location.origin}/era`;
  const file = new File([blob], 'memedics-era.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancel';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
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
  const blob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), 'image/png'));
  const url = memeUrl(m);
  const total = m.voteYes + m.voteNo;
  const yesPct = total ? Math.round((m.voteYes / total) * 100) : 0;
  const text = total
    ? `“${m.name}” 생존 ${yesPct}% · ${total}표 — 당신의 판정은?\n${url}`
    : `“${m.name}” 살았나 죽었나 — 첫 판정을 내려주세요\n${url}`;
  const file = new File([blob], `memedics-${m.id}.png`, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancel';
      /* 미지원 오류면 폴백 계속 */
    }
  }

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
  try {
    await navigator.clipboard.writeText(text);
    return 'downloaded+copied';
  } catch {
    return 'downloaded';
  }
}
