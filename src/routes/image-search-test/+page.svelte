<script lang="ts">
	// 이미지 검색 연동 테스트 페이지.
	// 검색어 → /api/image-search → 썸네일 그리드. 후보 UI 로 옮기기 전 동작 확인용.
	interface ImageResult {
		title: string;
		url: string;
		thumbnail: string;
		width?: number;
		height?: number;
		source: string;
	}

	let query = $state('골든리트리버 강아지');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let results = $state<ImageResult[]>([]);

	async function search() {
		loading = true;
		error = null;
		results = [];
		try {
			const res = await fetch(`/api/image-search?q=${encodeURIComponent(query)}&count=20`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message ?? `HTTP ${res.status}`);
			}
			const data = (await res.json()) as { results: ImageResult[] };
			results = data.results;
		} catch (e) {
			error = e instanceof Error ? e.message : '알 수 없는 오류';
		} finally {
			loading = false;
		}
	}
</script>

<main>
	<h1>이미지 검색 테스트</h1>

	<form onsubmit={(e) => (e.preventDefault(), search())}>
		<input bind:value={query} placeholder="검색어" />
		<button type="submit" disabled={loading || !query.trim()}>
			{loading ? '검색 중…' : '검색'}
		</button>
	</form>

	{#if error}
		<p class="error">⚠️ {error}</p>
	{/if}

	<div class="grid">
		{#each results as r (r.url)}
			<a class="card" href={r.source} target="_blank" rel="noreferrer" title={r.title}>
				<img src={r.thumbnail} alt={r.title} loading="lazy" />
				<span>{r.title}</span>
			</a>
		{/each}
	</div>
</main>

<style>
	main {
		max-width: 720px;
		margin: 2rem auto;
		padding: 0 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-family: system-ui, sans-serif;
	}
	form {
		display: flex;
		gap: 0.5rem;
	}
	input {
		flex: 1;
		font: inherit;
		padding: 0.5rem;
	}
	button {
		padding: 0.5rem 1rem;
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
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.75rem;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		text-decoration: none;
		color: inherit;
		font-size: 0.8rem;
	}
	.card img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 8px;
		border: 1px solid #ddd;
	}
	.card span {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
