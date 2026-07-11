<script lang="ts">
	/**
	 * 이미지 검색 모달. 검색어 → /api/image-search(Bing HTML 스크래핑) → 썸네일 그리드.
	 * 사용자가 하나 고르면 onpick(원본 URL)을 호출한다. 저장(다운로드→스토리지)은 호출부 책임.
	 */
	import type { ImageResult } from '$lib/server/bingImageSearch';

	let {
		open = false,
		initialQuery = '',
		onpick,
		onclose
	}: {
		open?: boolean;
		initialQuery?: string;
		onpick: (url: string) => void;
		onclose: () => void;
	} = $props();

	let query = $state('');
	let results = $state<ImageResult[]>([]);
	let loading = $state(false);
	let err = $state('');
	let searched = $state(false);

	// 열릴 때마다 초기 검색어를 채우고 상태를 리셋한다.
	let wasOpen = false;
	$effect(() => {
		if (open && !wasOpen) {
			query = initialQuery;
			results = [];
			err = '';
			searched = false;
			if (initialQuery.trim()) void run();
		}
		wasOpen = open;
	});

	async function run() {
		const q = query.trim();
		if (!q) return;
		loading = true;
		err = '';
		searched = true;
		try {
			const res = await fetch(`/api/image-search?q=${encodeURIComponent(q)}&count=24`);
			if (!res.ok) {
				err = (await res.text().catch(() => '')) || `검색 실패 (${res.status})`;
				results = [];
				return;
			}
			results = ((await res.json()) as { results: ImageResult[] }).results ?? [];
		} catch {
			err = '검색 중 오류가 났어요';
			results = [];
		} finally {
			loading = false;
		}
	}
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && onclose()} />

{#if open}
	<!-- 배경(자기 자신) 클릭만 닫기: 내부 클릭은 target≠currentTarget이라 무시된다. -->
	<div
		class="backdrop"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && onclose()}
	>
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1">
			<div class="head">
				<strong>🔍 이미지 검색</strong>
				<button type="button" class="x" onclick={onclose} aria-label="닫기">✕</button>
			</div>

			<form
				class="bar"
				onsubmit={(e) => {
					e.preventDefault();
					void run();
				}}
			>
				<input
					bind:value={query}
					placeholder="검색어 (예: 골든리트리버)"
					autocomplete="off"
				/>
				<button type="submit" disabled={loading || !query.trim()}>
					{loading ? '검색 중…' : '검색'}
				</button>
			</form>

			{#if err}
				<p class="err">{err}</p>
			{/if}

			<div class="grid">
				{#each results as r (r.url)}
					<button
						type="button"
						class="cell"
						title={r.title}
						onclick={() => onpick(r.url)}
					>
						<img src={r.thumbnail} alt={r.title} loading="lazy" />
					</button>
				{/each}
			</div>

			{#if !loading && searched && !err && results.length === 0}
				<p class="empty">결과가 없어요. 다른 검색어로 시도해 보세요.</p>
			{/if}
			<p class="note">고르면 원본을 내려받아 우리 스토리지에 저장해요. (개인용 범위로만 사용)</p>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		z-index: 100;
	}
	.modal {
		background: var(--surface, #fff);
		color: var(--ink, #111);
		border: 2px solid var(--line, #222);
		width: min(720px, 100%);
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		padding: 14px;
		gap: 12px;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.x {
		border: none;
		background: none;
		font-size: 18px;
		cursor: pointer;
		color: var(--ink, #111);
	}
	.bar {
		display: flex;
		gap: 8px;
	}
	.bar input {
		flex: 1;
		padding: 8px 10px;
		border: 2px solid var(--line, #222);
		background: var(--surface, #fff);
		color: var(--ink, #111);
	}
	.bar button {
		padding: 8px 14px;
		border: 2px solid var(--line, #222);
		background: var(--ink, #111);
		color: var(--surface, #fff);
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
	}
	.bar button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 8px;
		overflow-y: auto;
	}
	.cell {
		aspect-ratio: 1;
		padding: 0;
		border: 2px solid var(--line, #222);
		background: var(--surface, #fff);
		cursor: pointer;
		overflow: hidden;
	}
	.cell img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.cell:hover {
		outline: 3px solid var(--accent, #ff5a5f);
	}
	.err {
		color: #c00;
		font-weight: 700;
		margin: 0;
	}
	.empty,
	.note {
		color: var(--muted, #777);
		font-size: 13px;
		margin: 0;
	}
</style>
