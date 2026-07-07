/**
 * 후보 이미지 일괄 생성 스크립트 (독립 실행, 네트워크 필요).
 *
 * 사용: node scripts/gen-images.mjs <prompts.json>
 *   prompts.json = [{ "file": "fruit-00", "prompt": "..." }, ...]
 *
 * HF FLUX.1-schnell 로 512x512 실사 이미지를 뽑아 static/gen/<file>.<ext> 로 저장하고,
 * 같은 폴더에 <prompts basename>.manifest.json (순서대로의 URL 배열)을 남긴다.
 *
 * dev 서버가 아니라 이 스크립트로 돌리는 이유: 정적 파일로 저장해 localStorage 를
 * 부풀리지 않고, 샌드박스 밖에서 외부 네트워크로 HF 를 호출하기 위함.
 */
import { InferenceClient } from '@huggingface/inference';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

// 생성물 재압축 스펙: 카드 표시엔 384px면 충분, webp 로 용량 대폭 절감
const MAX_SIDE = 384;
const WEBP_QUALITY = 78;

// .env 로드 (HF_TOKEN 등)
function loadEnv() {
	try {
		const text = readFileSync('.env', 'utf8');
		const map = {};
		for (const line of text.split('\n')) {
			const t = line.trim();
			if (!t || t.startsWith('#') || !t.includes('=')) continue;
			const i = t.indexOf('=');
			map[t.slice(0, i).trim()] = t.slice(i + 1).trim();
		}
		return map;
	} catch {
		return {};
	}
}

const envMap = loadEnv();
const TOKEN = process.env.HF_TOKEN || envMap.HF_TOKEN;
const MODEL = envMap.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell';
const PROVIDER = envMap.HF_PROVIDER || 'replicate';

if (!TOKEN) {
	console.error('HF_TOKEN 이 없습니다 (.env 확인).');
	process.exit(1);
}

const promptsPath = process.argv[2];
if (!promptsPath) {
	console.error('사용법: node scripts/gen-images.mjs <prompts.json>');
	process.exit(1);
}

const items = JSON.parse(readFileSync(promptsPath, 'utf8'));
const OUT_DIR = 'static/gen';
mkdirSync(OUT_DIR, { recursive: true });

const client = new InferenceClient(TOKEN);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function genOnce(prompt) {
	return client.textToImage(
		{
			model: MODEL,
			inputs: prompt,
			parameters: { width: 512, height: 512, num_inference_steps: 4 }
		},
		{ provider: PROVIDER, outputType: 'dataUrl' }
	);
}

// provider 콜드스타트로 첫 요청이 자주 'fetch failed' → 지수 백오프 재시도
async function genOne(prompt) {
	let lastErr;
	for (let attempt = 1; attempt <= 5; attempt++) {
		try {
			return await Promise.race([
				genOnce(prompt),
				new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 90000))
			]);
		} catch (err) {
			lastErr = err;
			if (attempt < 5) await sleep(2000 * attempt);
		}
	}
	throw lastErr;
}

const manifest = [];
let ok = 0;
for (const it of items) {
	try {
		const dataUrl = await genOne(it.prompt);
		const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
		const raw = Buffer.from(b64, 'base64');
		// sharp 로 리사이즈 + webp 재압축 후 저장
		const out = await sharp(raw)
			.resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
			.webp({ quality: WEBP_QUALITY })
			.toBuffer();
		const outName = `${it.file}.webp`;
		writeFileSync(`${OUT_DIR}/${outName}`, out);
		manifest.push(`/gen/${outName}`);
		ok++;
		console.log(`OK  ${outName}  (${Math.round(out.length / 1024)}KB)`);
	} catch (err) {
		manifest.push(null);
		console.log(`FAIL ${it.file}: ${err.message}`);
	}
}

// 매니페스트는 이미지 폴더가 아니라 scripts/ 에 남긴다(생성물 폴더엔 이미지만).
const manifestPath = promptsPath.replace(/\.json$/, '') + '.manifest.json';
writeFileSync(manifestPath, JSON.stringify(manifest, null, 0));
console.log(`\n완료: ${ok}/${items.length}장 생성 (static/gen/), 매니페스트 → ${manifestPath}`);
