/**
 * Hugging Face Inference Providers 로 이미지 생성 (서버 전용).
 *
 * `$lib/server` 아래 있으므로 클라이언트 번들에 섞이지 않는다 — HF 토큰이 브라우저로 새지 않는다.
 *
 * 모델: black-forest-labs/FLUX.1-schnell (빠르고 라이선스 자유, 무료 크레딧으로 저렴).
 * 무료 유저는 매달 $0.10 크레딧 → schnell 기준 대략 20~30장. 소진 시 그 달은 막힘.
 * 토큰: hf.co/settings/tokens 에서 "Inference Providers" 권한으로 발급 → .env 의 HF_TOKEN.
 */
import { InferenceClient, type InferenceProviderOrPolicy } from '@huggingface/inference';
import { env } from '$env/dynamic/private';

const MODEL = env.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell';
// provider 고정. 'auto' 는 접속 불가한 provider 를 고를 수 있어 검증된 replicate 를 기본값으로.
const PROVIDER = (env.HF_PROVIDER || 'replicate') as InferenceProviderOrPolicy;

export interface GenerateOptions {
	n?: number;
	aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
	negativePrompt?: string;
	model?: string;
}

/** 화면비 → 픽셀 크기. FLUX 는 64 배수 권장, 장변 1024 기준. */
function dimsFor(ratio: GenerateOptions['aspectRatio']): { width: number; height: number } {
	switch (ratio) {
		case '1:1':
			return { width: 1024, height: 1024 };
		case '16:9':
			return { width: 1024, height: 576 };
		case '9:16':
			return { width: 576, height: 1024 };
		case '4:3':
			return { width: 1024, height: 768 };
		case '3:2':
			return { width: 1024, height: 704 };
		case '2:3':
			return { width: 704, height: 1024 };
		case '3:4':
		default:
			return { width: 768, height: 1024 }; // 월드컵 세로 카드 기본
	}
}

/**
 * 프롬프트 → base64 data URI 배열.
 * data URI 로 돌려주므로 후보 image 필드에 바로 넣어 localStorage 에 저장할 수 있다.
 */
export async function generateImages(
	prompt: string,
	opts: GenerateOptions = {}
): Promise<string[]> {
	const token = env.HF_TOKEN;
	if (!token) throw new Error('HF_TOKEN 이 설정되지 않았습니다. .env 를 확인하세요.');

	const client = new InferenceClient(token);
	const { width, height } = dimsFor(opts.aspectRatio);
	const n = opts.n ?? 1;

	// 변수로 빼서 객체 리터럴 excess-property 체크를 피한다 (provider 는 base Options 소속).
	const callOpts = { provider: PROVIDER, outputType: 'dataUrl' as const };

	// HF textToImage 는 호출당 이미지 1장 → n 만큼 병렬 호출.
	// outputType 'dataUrl' 이면 data:image/...;base64 문자열을 바로 돌려준다.
	const jobs = Array.from({ length: n }, () =>
		client.textToImage(
			{
				model: opts.model ?? MODEL,
				inputs: prompt,
				parameters: {
					width,
					height,
					// schnell 은 distilled 라 4스텝이면 충분
					num_inference_steps: 4,
					...(opts.negativePrompt ? { negative_prompt: opts.negativePrompt } : {})
				}
			},
			callOpts
		)
	);

	return Promise.all(jobs);
}
