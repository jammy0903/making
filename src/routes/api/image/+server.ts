/**
 * POST /api/image — 프롬프트로 이미지를 생성해 base64 data URI 로 돌려준다.
 * 기본 백엔드는 Hugging Face(FLUX.1-schnell). 키는 서버에서만 읽어 브라우저에 노출 안 됨.
 *
 * 요청 body: { prompt: string, n?, aspectRatio?, negativePrompt?, model? }
 * 응답: { images: string[] }  // 각 원소는 data:image/...;base64,... URI
 */
import { json, error } from '@sveltejs/kit';
import { generateImages, type GenerateOptions } from '$lib/server/hf';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let payload: { prompt?: string } & GenerateOptions;
	try {
		payload = await request.json();
	} catch {
		throw error(400, 'JSON body 가 필요합니다.');
	}

	const prompt = payload.prompt?.trim();
	if (!prompt) throw error(400, 'prompt 가 비어 있습니다.');

	try {
		const images = await generateImages(prompt, {
			n: payload.n,
			aspectRatio: payload.aspectRatio,
			negativePrompt: payload.negativePrompt,
			model: payload.model
		});
		return json({ images });
	} catch (e) {
		const message = e instanceof Error ? e.message : '알 수 없는 오류';
		throw error(502, message);
	}
};
