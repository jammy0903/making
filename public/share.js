// 투표 결과 공유 카드 — 캔버스로 카드 이미지를 그려 Web Share(모바일) 또는
// 다운로드+링크복사(데스크톱)로 내보낸다. app.js보다 먼저 로드(window.mmdShare 전역).
//
// 왜 카드인가(docs/marketing-analysis.md §4-3): 투표 직후("예 34%")가 공유 욕구의
// 정점인데 내밀 것이 없었다. 카드는 받은 사람에게 같은 질문("당신의 판정은?")을
// 던져 딥링크(#m=id)로 투표하러 오게 하는 유입 루프를 만든다.
(function () {
  // style.css 토큰과 동일 팔레트 (캔버스는 CSS 변수를 못 읽어 상수로 복제)
  const C = {
    bg: '#E6F2ED', ink: '#1B1B18', ink2: '#2A2A26',
    accent: '#1E7A4E', accentDark: '#14603C', accentBorder: '#CBE7D6',
    mute: '#6E6E67', mute3: '#A6A69C', line2: '#DADAD2',
  };
  const SERIF = '"Noto Serif KR", serif';
  const SANS = '"Noto Sans KR", sans-serif';
  const W = 1080, H = 1080;

  // 이름이 길면 폭에 맞게 폰트 축소(한 줄 유지)
  function fitFont(ctx, text, maxWidth, startPx, minPx, weight, family) {
    let px = startPx;
    for (; px > minPx; px -= 4) {
      ctx.font = `${weight} ${px}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
    }
    return px;
  }

  function roundedRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
    else { ctx.beginPath(); ctx.rect(x, y, w, h); } // 구형 브라우저는 각진 바로 폴백
  }

  async function drawCard(m) {
    // 캔버스는 로드 안 된 폰트를 시스템체로 그려버리므로 먼저 로드를 보장
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
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 배경 + 이중 프레임(지면 느낌)
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.accentBorder; ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.strokeRect(52, 52, W - 104, H - 104);

    ctx.textAlign = 'center';

    // 브랜드
    ctx.fillStyle = C.accent;
    ctx.font = `700 30px ${SANS}`;
    ctx.fillText('M E M E D I C S', W / 2, 160);
    ctx.fillStyle = C.mute3;
    ctx.font = `400 22px ${SANS}`;
    ctx.fillText('한국 밈 트렌드 사전', W / 2, 200);

    // 표제어(밈 이름)
    ctx.fillStyle = C.ink;
    const namePx = fitFont(ctx, m.name, W - 200, 104, 48, 700, SERIF);
    ctx.font = `700 ${namePx}px ${SERIF}`;
    ctx.fillText(m.name, W / 2, 380);

    // 게이지 (질문 없음 — 생존/사망 라벨이 자체 설명)
    const gx = 160, gw = W - 320, gy = 520, gh = 34;
    ctx.fillStyle = C.line2;
    roundedRect(ctx, gx, gy, gw, gh, gh / 2); ctx.fill();
    if (total && yesPct > 0) {
      ctx.fillStyle = C.accent;
      roundedRect(ctx, gx, gy, Math.max(gh, gw * yesPct / 100), gh, gh / 2); ctx.fill();
    }

    // 퍼센트 레전드
    ctx.textAlign = 'left';
    ctx.fillStyle = C.accentDark;
    ctx.font = `700 40px ${SANS}`;
    ctx.fillText(`생존 ${yesPct}%`, gx, gy + 100);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.mute;
    ctx.fillText(`사망 ${noPct}%`, gx + gw, gy + 100);

    // 참여 수 (0표면 첫 판정 유도)
    ctx.textAlign = 'center';
    ctx.fillStyle = C.mute;
    ctx.font = `400 30px ${SANS}`;
    ctx.fillText(total ? `${total}표 참여` : '아직 판정 없음', W / 2, gy + 170);

    // CTA + 주소
    ctx.fillStyle = C.ink;
    ctx.font = `600 44px ${SERIF}`;
    ctx.fillText('당신의 판정은?', W / 2, 880);
    ctx.fillStyle = C.mute3;
    ctx.font = `400 26px ${SANS}`;
    ctx.fillText(location.host, W / 2, 940);

    return canvas;
  }

  function memeUrl(m) { return location.origin + location.pathname + '#m=' + m.id; }

  // 반환: 'shared' | 'cancel' | 'downloaded+copied' | 'downloaded'
  async function voteCard(m) {
    const canvas = await drawCard(m);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    const url = memeUrl(m);
    const total = m.voteYes + m.voteNo;
    const yesPct = total ? Math.round((m.voteYes / total) * 100) : 0;
    const text = total
      ? `“${m.name}” 생존 ${yesPct}% · ${total}표 — 당신의 판정은?\n${url}`
      : `“${m.name}” 살았나 죽었나 — 첫 판정을 내려주세요\n${url}`;
    const file = new File([blob], `memedics-${m.id}.png`, { type: 'image/png' });

    // 모바일: 이미지+텍스트 네이티브 공유 (일부 앱은 파일만 받고 text를 버림 — 감수)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return 'shared'; }
      catch (e) { if (e.name === 'AbortError') return 'cancel'; /* 미지원 오류면 폴백 계속 */ }
    }

    // 데스크톱 폴백: PNG 저장 + 공유 문구/링크 클립보드 복사
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name;
    a.click(); URL.revokeObjectURL(a.href);
    try { await navigator.clipboard.writeText(text); return 'downloaded+copied'; }
    catch (e) { return 'downloaded'; }
  }

  window.mmdShare = { voteCard, drawCard }; // drawCard는 미리보기/검증용
})();
