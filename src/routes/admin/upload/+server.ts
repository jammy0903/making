/**
 * 관리자 이미지 업로드 → Supabase Storage(deck-images, 공개 버킷) → 공개 URL 반환.
 * service_role로 업로드(RLS 우회). 인증 쿠키 없으면 401. 덱 편집기의 파일 입력이 fetch로 호출.
 * 폼 액션이 아니라 별도 엔드포인트로 둔 이유: 업로드 후 편집 중 상태(editing)를 리셋시키지 않고
 * 반환된 URL만 필드에 채우기 위함.
 *
 * 두 가지 입력을 받는다:
 *  - multipart/form-data 의 file: 관리자가 직접 고른 파일
 *  - JSON { url }: 이미지 검색 결과의 외부 원본 URL. 서버가 내려받아(핫링크·CORS 우회)
 *    같은 버킷에 저장한다. 외부 URL을 그대로 저장하면 나중에 깨질 수 있어 항상 우리 스토리지로 복사.
 */
import { json, error } from '@sveltejs/kit';
import { getAdminDb, isAuthed, ADMIN_COOKIE } from '$lib/server/adminDb';
import type { RequestHandler } from './$types';

const BUCKET = 'deck-images';
const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/svg+xml': 'svg'
};
// 외부 이미지 다운로드 시 핫링크·봇 차단을 피하려 일반 크롬 UA 로 위장.
const BROWSER_UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/** 바이트를 버킷에 올리고 공개 URL을 돌려준다. */
async function store(
	db: NonNullable<ReturnType<typeof getAdminDb>>,
	bytes: Uint8Array,
	contentType: string
): Promise<string> {
	const ext = EXT[contentType];
	if (!ext) throw error(415, '이미지 형식만 허용(png·jpg·webp·gif·svg)');
	if (bytes.byteLength > MAX_BYTES) throw error(413, '이미지가 너무 큼(최대 5MB)');
	const path = `${crypto.randomUUID()}.${ext}`;
	const { error: upErr } = await db.storage
		.from(BUCKET)
		.upload(path, bytes, { contentType, upsert: false });
	if (upErr) throw error(500, upErr.message);
	return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isAuthed(cookies.get(ADMIN_COOKIE))) throw error(401, '권한 없음');
	const db = getAdminDb();
	if (!db) throw error(500, 'DB 미설정(service_role 필요)');

	// JSON { url }: 검색 결과의 외부 이미지를 서버가 내려받아 저장한다.
	if (request.headers.get('content-type')?.includes('application/json')) {
		const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
		const src = typeof body?.url === 'string' ? body.url.trim() : '';
		if (!/^https?:\/\//.test(src)) throw error(400, '유효한 이미지 URL이 아님');

		let res: Response;
		try {
			res = await fetch(src, {
				headers: { 'User-Agent': BROWSER_UA },
				signal: AbortSignal.timeout(15000)
			});
		} catch {
			throw error(502, '이미지를 가져오지 못했어요(원본 접근 불가)');
		}
		if (!res.ok) throw error(502, `이미지를 가져오지 못했어요 (원본 ${res.status})`);

		const contentType = (res.headers.get('content-type') || '').split(';')[0].trim();
		const bytes = new Uint8Array(await res.arrayBuffer());
		return json({ url: await store(db, bytes, contentType) });
	}

	// multipart/form-data: 관리자가 직접 고른 파일.
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) throw error(400, '파일 없음');
	const bytes = new Uint8Array(await file.arrayBuffer());
	return json({ url: await store(db, bytes, file.type) });
};
