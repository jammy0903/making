/**
 * 관리자 이미지 업로드 → Supabase Storage(deck-images, 공개 버킷) → 공개 URL 반환.
 * service_role로 업로드(RLS 우회). 인증 쿠키 없으면 401. 덱 편집기의 파일 입력이 fetch로 호출.
 * 폼 액션이 아니라 별도 엔드포인트로 둔 이유: 업로드 후 편집 중 상태(editing)를 리셋시키지 않고
 * 반환된 URL만 필드에 채우기 위함.
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

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isAuthed(cookies.get(ADMIN_COOKIE))) throw error(401, '권한 없음');
	const db = getAdminDb();
	if (!db) throw error(500, 'DB 미설정(service_role 필요)');

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) throw error(400, '파일 없음');
	if (file.size > MAX_BYTES) throw error(413, '이미지가 너무 큼(최대 5MB)');
	const ext = EXT[file.type];
	if (!ext) throw error(415, '이미지 형식만 허용(png·jpg·webp·gif·svg)');

	const path = `${crypto.randomUUID()}.${ext}`;
	const bytes = new Uint8Array(await file.arrayBuffer());
	const { error: upErr } = await db.storage
		.from(BUCKET)
		.upload(path, bytes, { contentType: file.type, upsert: false });
	if (upErr) throw error(500, upErr.message);

	const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
	return json({ url });
};
