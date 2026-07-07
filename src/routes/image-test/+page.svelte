<script lang="ts">
	// Kling 이미지 생성 연동 테스트 페이지.
	// 프롬프트 → /api/kling → base64 이미지. 후보 UI 로 옮기기 전 동작 확인용.
	let prompt = $state('a cute cartoon cat wearing a knight helmet, white background');
	let aspectRatio = $state<'1:1' | '3:4' | '9:16'>('3:4');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let images = $state<string[]>([]);

	async function generate() {
		loading = true;
		error = null;
		images = [];
		try {
			const res = await fetch('/api/image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt, aspectRatio, n: 1 })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message ?? `HTTP ${res.status}`);
			}
			const data = (await res.json()) as { images: string[] };
			images = data.images;
		} catch (e) {
			error = e instanceof Error ? e.message : '알 수 없는 오류';
		} finally {
			loading = false;
		}
	}
</script>

<main>
	<h1>Kling 이미지 생성 테스트</h1>

	<label>
		프롬프트 (영어 권장)
		<textarea bind:value={prompt} rows="3"></textarea>
	</label>

	<label>
		화면비
		<select bind:value={aspectRatio}>
			<option value="3:4">3:4 (세로 카드)</option>
			<option value="1:1">1:1 (정사각)</option>
			<option value="9:16">9:16 (세로 긴)</option>
		</select>
	</label>

	<button onclick={generate} disabled={loading || !prompt.trim()}>
		{loading ? '생성 중… (최대 2분)' : '이미지 생성'}
	</button>

	{#if error}
		<p class="error">⚠️ {error}</p>
	{/if}

	<div class="grid">
		{#each images as src (src)}
			<img {src} alt="생성된 이미지" />
		{/each}
	</div>
</main>

<style>
	main {
		max-width: 640px;
		margin: 2rem auto;
		padding: 0 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-family: system-ui, sans-serif;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-weight: 600;
	}
	textarea,
	select {
		font: inherit;
		font-weight: 400;
		padding: 0.5rem;
	}
	button {
		padding: 0.6rem 1rem;
		font-size: 1rem;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.error {
		color: #c0392b;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.75rem;
	}
	.grid img {
		width: 100%;
		border-radius: 8px;
		border: 1px solid #ddd;
	}
</style>
