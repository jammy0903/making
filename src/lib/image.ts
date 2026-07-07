/**
 * 업로드 이미지를 클라이언트에서 리사이즈해 data URL 로 반환.
 * 무료 티어 저장소 보호를 위해 긴 변을 maxSide 로 줄인다(기본 512px).
 * 1단계에서는 data URL 을 localStorage 에 보관(2단계에서 Storage 업로드로 교체).
 */
export async function resizeImageToDataUrl(file: File, maxSide = 512, quality = 0.82): Promise<string> {
	const bitmap = await loadBitmap(file);
	const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
	const w = Math.round(bitmap.width * scale);
	const h = Math.round(bitmap.height * scale);

	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('캔버스 컨텍스트를 만들 수 없습니다.');
	ctx.drawImage(bitmap, 0, 0, w, h);
	if ('close' in bitmap) (bitmap as ImageBitmap).close();

	// WebP 지원 시 더 작게, 아니면 JPEG
	const webp = canvas.toDataURL('image/webp', quality);
	return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
	if ('createImageBitmap' in window) {
		return await createImageBitmap(file);
	}
	// 폴백: <img> 로 로드
	const url = URL.createObjectURL(file);
	try {
		const img = new Image();
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
			img.src = url;
		});
		return img;
	} finally {
		URL.revokeObjectURL(url);
	}
}
