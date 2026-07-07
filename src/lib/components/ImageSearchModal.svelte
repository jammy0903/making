<script lang="ts">
	// 이미지 검색 모달. 검색 → 썸네일 클릭 → 서버 프록시로 원본 받아 리사이즈 → data URL 을
	// onselect 로 넘긴다. 후보 관리 UI 에서 각 행의 사진을 검색으로 채우는 데 쓴다.
	import { onMount } from 'svelte';
	import { resizeImageToDataUrl } from '$lib/image';
	import { useT } from '$lib/i18n';

	const t = useT();

	interface ImageResult {
		title: string;
		url: string;
		thumbnail: string;
		source: string;
	}

	let {
		initialQuery = '',
		onselect,
		onclose
	}: {
		initialQuery?: string;
		onselect: (dataUrl: string) => void;
		onclose: () => void;
	} = $props();

	// eslint-disable-next-line -- prop 값으로 초기값만 세팅(이후 사용자가 편집)
	// svelte-ignore state_referenced_locally
	let query = $state(initialQuery);
	let loading = $state(false);
	let applying = $state<string | null>(null); // 적용 중인 이미지 url
	let error = $state('');
	let results = $state<ImageResult[]>([]);
	let loaded = $state<Record<string, boolean>>({}); // 썸네일 로드 완료 여부(url별)
	let broken = $state<Record<string, boolean>>({}); // 썸네일 로드 실패 여부(url별)

	async function search() {
		const q = query.trim();
		if (!q) return;
		loading = true;
		error = '';
		results = [];
		loaded = {};
		broken = {};
		try {
			const res = await fetch(`/api/image-search?q=${encodeURIComponent(q)}&count=12`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message ?? `HTTP ${res.status}`);
			}
			results = ((await res.json()) as { results: ImageResult[] }).results;
			if (results.length === 0) error = t('search.noResults');
		} catch (e) {
			error = e instanceof Error ? e.message : t('search.failed');
		} finally {
			loading = false;
		}
	}

	async function pick(r: ImageResult) {
		if (applying) return;
		applying = r.url;
		error = '';
		try {
			const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(r.url)}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const blob = await res.blob();
			const dataUrl = await resizeImageToDataUrl(blob);
			onselect(dataUrl);
			onclose();
		} catch {
			error = t('search.pickFailed');
			applying = null;
		}
	}

	onMount(() => {
		if (initialQuery.trim()) search();
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') onclose();
	}}
/>

<div
	class="backdrop"
	role="button"
	tabindex="-1"
	aria-label={t('search.close')}
	onclick={onclose}
	onkeydown={() => {}}
>
	<!-- 패널 클릭이 배경으로 전파돼 닫히지 않도록 -->
	<div
		class="card panel"
		role="dialog"
		aria-modal="true"
		aria-label={t('search.title')}
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={() => {}}
	>
		<div class="bar">
			<form
				style="display:flex; gap:8px; flex:1"
				onsubmit={(e) => {
					e.preventDefault();
					search();
				}}
			>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					class="input"
					bind:value={query}
					placeholder={t('search.placeholder')}
					autofocus
				/>
				<button class="btn btn-primary" type="submit" disabled={loading || !query.trim()}>
					{loading ? t('search.searching') : t('search.search')}
				</button>
			</form>
			<button class="btn" onclick={onclose} aria-label={t('search.close')}>✕</button>
		</div>

		{#if error}
			<p style="color:var(--danger); margin:8px 0 0">{error}</p>
		{/if}

		<div class="grid">
			{#if loading}
				<!-- 검색 중: 스켈레톤 타일 -->
				{#each Array(8) as _, i (i)}
					<div class="tile skeleton"></div>
				{/each}
			{:else}
				{#each results as r (r.url)}
					<button
						class="tile"
						onclick={() => pick(r)}
						disabled={!!applying}
						title={r.title}
						class:applying={applying === r.url}
					>
						<!-- 썸네일 로드 전/실패 시 자리표시 -->
						{#if !loaded[r.url]}
							<span class="ph">{broken[r.url] ? '✕' : '…'}</span>
						{/if}
						<!-- Bing 썸네일은 핫링크가 막혀 브라우저에서 직접 안 뜨는 경우가 많아 프록시로 태운다 -->
						<img
							src={`/api/image-proxy?url=${encodeURIComponent(r.thumbnail)}`}
							alt={r.title}
							loading="lazy"
							class:show={loaded[r.url]}
							onload={() => (loaded = { ...loaded, [r.url]: true })}
							onerror={() => (broken = { ...broken, [r.url]: true })}
						/>
						{#if applying === r.url}
							<span class="spin">{t('search.loading')}</span>
						{/if}
					</button>
				{/each}
			{/if}
		</div>

		{#if results.length > 0}
			<p class="muted" style="font-size:12px; margin:10px 0 0; text-align:center">
				{t('search.hint')}
			</p>
		{/if}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(0, 0, 0, 0.55);
		display: grid;
		place-items: center;
		padding: 16px;
	}
	.panel {
		width: 100%;
		max-width: 560px;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		padding: 14px;
		overflow: hidden;
	}
	.bar {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.grid {
		margin-top: 12px;
		overflow-y: auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: 8px;
	}
	.tile {
		position: relative;
		padding: 0;
		border: 3px solid var(--line);
		background: var(--bg);
		cursor: pointer;
		aspect-ratio: 1;
		overflow: hidden;
	}
	.tile:disabled {
		cursor: wait;
	}
	.tile img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		opacity: 0;
		transition: opacity 0.2s;
	}
	.tile img.show {
		opacity: 1;
	}
	.tile.applying {
		outline: 3px solid var(--accent);
	}
	/* 썸네일 로드 전/실패 자리표시 */
	.ph {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: var(--muted);
		font-size: 18px;
	}
	/* 검색 중 스켈레톤: 은은한 펄스 */
	.skeleton {
		cursor: default;
		background: var(--soft);
		animation: pulse 1.1s steps(2) infinite alternate;
	}
	@keyframes pulse {
		from {
			opacity: 0.5;
		}
		to {
			opacity: 1;
		}
	}
	.spin {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgba(0, 0, 0, 0.5);
		color: #fff;
		font-size: 11px;
	}
</style>
