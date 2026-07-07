/**
 * Kling AI 이미지 생성 (서버 전용).
 *
 * `$lib/server` 아래 있으므로 SvelteKit 이 클라이언트 번들에 섞이는 걸 막는다 —
 * API 키가 브라우저로 새어나갈 수 없다.
 *
 * 인증: 단일 키를 그대로 Bearer 토큰으로 사용 (KLING_API_KEY). JWT·OAuth 불필요.
 * 엔드포인트: api-singapore.klingai.com (소비자 사이트 kling.ai 는 이 망에서 차단됨).
 * 생성은 비동기라 task_id 를 받아 폴링한다.
 * (video 프로젝트 generate-image.mjs 의 검증된 방식과 동일)
 */
import { env } from '$env/dynamic/private';

const BASE = env.KLING_BASE || 'https://api-singapore.klingai.com';

export interface GenerateOptions {
	/** 뽑을 이미지 장수 (기본 1, Kling 은 보통 1~9) */
	n?: number;
	/** 화면비. 월드컵 카드용으로 세로형 '3:4' 를 기본값으로 둔다 */
	aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
	/** 빼고 싶은 요소 */
	negativePrompt?: string;
	/** 모델명 (기본 kling-v1) */
	model?: string;
}

interface KlingEnvelope<T> {
	code: number;
	message: string;
	data: T;
}

interface CreateTaskData {
	task_id: string;
	task_status: string;
}

interface QueryTaskData {
	task_id: string;
	task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
	task_status_msg?: string;
	task_result?: { images?: { index: number; url: string }[] };
}

function authHeaders(): HeadersInit {
	const key = env.KLING_API_KEY;
	if (!key) {
		throw new Error('KLING_API_KEY 가 설정되지 않았습니다. .env 를 확인하세요.');
	}
	return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function klingFetch<T>(path: string, init?: RequestInit): Promise<KlingEnvelope<T>> {
	const res = await fetch(`${BASE}${path}`, {
		...init,
		headers: { ...authHeaders(), ...init?.headers },
		signal: AbortSignal.timeout(30000)
	});
	const body = (await res.json()) as KlingEnvelope<T>;
	if (!res.ok || body.code !== 0) {
		throw new Error(`Kling API 오류 (${res.status}, code ${body.code}): ${body.message}`);
	}
	return body;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 프롬프트로 이미지를 생성해 URL 배열을 돌려준다.
 * 생성 → 폴링(성공/실패까지) 전 과정을 처리한다.
 */
export async function generateImageUrls(
	prompt: string,
	opts: GenerateOptions = {}
): Promise<string[]> {
	const created = await klingFetch<CreateTaskData>('/v1/images/generations', {
		method: 'POST',
		body: JSON.stringify({
			model_name: opts.model ?? 'kling-v1',
			prompt,
			negative_prompt: opts.negativePrompt,
			n: opts.n ?? 1,
			aspect_ratio: opts.aspectRatio ?? '3:4'
		})
	});
	const taskId = created.data.task_id;

	// 폴링: 5초 간격, 최대 ~2분. 이미지는 보통 영상보다 빠르다.
	for (let i = 0; i < 24; i++) {
		await sleep(5000);
		const q = await klingFetch<QueryTaskData>(`/v1/images/generations/${taskId}`);
		const status = q.data.task_status;
		if (status === 'succeed') {
			const urls = (q.data.task_result?.images ?? []).map((im) => im.url);
			if (urls.length === 0) throw new Error('Kling: 성공했지만 이미지가 비어 있습니다.');
			return urls;
		}
		if (status === 'failed') {
			throw new Error(`Kling 생성 실패: ${q.data.task_status_msg ?? '알 수 없는 이유'}`);
		}
	}
	throw new Error(`Kling 생성 시간 초과. task_id 로 다시 조회하세요: ${taskId}`);
}

/**
 * Kling 이미지 URL 은 시간이 지나면 만료되므로, 서버에서 받아 base64 data URI 로 바꾼다.
 * 이러면 localStorage 에 그대로 저장돼 월드컵을 나중에 돌려도 안 깨진다.
 */
export async function urlToDataUri(url: string): Promise<string> {
	const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
	if (!res.ok) throw new Error(`이미지 다운로드 실패: ${res.status}`);
	const contentType = res.headers.get('content-type') ?? 'image/png';
	// Buffer(Node 전용) 대신 웹표준 btoa 로 base64 인코딩 — 어떤 어댑터에서도 동작
	const bytes = new Uint8Array(await res.arrayBuffer());
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return `data:${contentType};base64,${btoa(binary)}`;
}

/** 프롬프트 → data URI 배열 (생성 + 다운로드 + base64 변환까지) */
export async function generateImages(
	prompt: string,
	opts: GenerateOptions = {}
): Promise<string[]> {
	const urls = await generateImageUrls(prompt, opts);
	return Promise.all(urls.map(urlToDataUri));
}
