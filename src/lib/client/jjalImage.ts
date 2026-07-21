// 짤 이미지 복사·다운로드 — 목록(모달)과 상세 페이지가 함께 쓴다.
// 메신저에 바로 붙여넣는 게 이 기능의 존재 이유다(jjal-archive-plan.md 메신저 사용 흐름).

// 외부 CDN이 CORS를 안 주므로 /img 프록시를 경유해 same-origin으로 받는다
export const proxied = (url: string) => `/img?u=${encodeURIComponent(url)}`;

export const isGif = (url: string) => /\.gif($|\?)/i.test(url);

async function toPng(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext('2d')!.drawImage(bmp, 0, 0);
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}

/** 클립보드에 복사. 성공 여부를 반환한다(호출부가 라벨을 바꿀 수 있게). */
export async function copyImage(url: string): Promise<boolean> {
  try {
    const blob = await (await fetch(proxied(url))).blob();
    // 클립보드는 PNG만 받는 브라우저가 많다 — 캔버스로 변환
    const png = blob.type === 'image/png' ? blob : await toPng(blob);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    return true;
  } catch {
    return false;
  }
}

export async function download(url: string, id: number) {
  try {
    const blob = await (await fetch(proxied(url))).blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `jjal-${id}.${blob.type.split('/')[1] || 'jpg'}`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, '_blank'); // 프록시 실패 시 원본 새 탭 → 길게 눌러 저장
  }
}
