// crop.js 온디맨드 로더 — 업로드할 때만 필요한 6KB 스크립트다.
// app.html에서 동기 <script>로 물리면 홈을 포함한 모든 페이지의 렌더를 막는다.
type Cropper = (file: File, aspect: number) => Promise<Blob | null>;

let pending: Promise<void> | null = null;

export async function loadCropper(): Promise<Cropper | null> {
  if (typeof document === 'undefined') return null;
  const w = window as unknown as { cropImageToRatio?: Cropper };
  if (!w.cropImageToRatio) {
    pending ??= new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/crop.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('crop.js load failed'));
      document.head.appendChild(s);
    });
    try {
      await pending;
    } catch {
      pending = null; // 다음 시도에서 다시 받도록
      return null; // 호출부는 크로퍼 없으면 원본 업로드로 폴백한다
    }
  }
  return w.cropImageToRatio ?? null;
}
