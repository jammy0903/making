<script lang="ts">
	import type { Candidate } from '$lib/domain';

	let { candidates, onComplete }: { candidates: Candidate[]; onComplete: (ranked: Candidate[]) => void } =
		$props();

	// 프록시 식별 문제를 피하려 id(문자열)로만 상태를 다룬다.
	const byId = new Map(candidates.map((c) => [c.id, c]));
	const get = (id: string) => byId.get(id)!;

	let slots = $state<(string | null)[]>(candidates.map(() => null)); // 등수 자리(0=1등)
	let pool = $state<string[]>(candidates.map((c) => c.id)); // 미배치 후보

	// 드래그 상태
	let dragId = $state<string | null>(null);
	let dragFrom: { type: 'pool' | 'slot'; index: number } | null = null;
	let ghostX = $state(0);
	let ghostY = $state(0);
	let overSlot = $state<number | null>(null);
	let overPool = $state(false);

	const allFilled = $derived(slots.every((s) => s !== null));

	function startDrag(e: PointerEvent) {
		const card = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
		if (!card) return;
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		const id = card.dataset.id!;
		const loc = card.dataset.loc as 'pool' | 'slot';
		const index = Number(card.dataset.index);
		dragId = id;
		dragFrom = { type: loc, index };
		ghostX = e.clientX;
		ghostY = e.clientY;
		e.preventDefault();
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
	}

	function onMove(e: PointerEvent) {
		if (!dragId) return;
		ghostX = e.clientX;
		ghostY = e.clientY;
		// 슬롯/풀 히트 테스트(요소 좌표 기준)
		overSlot = null;
		overPool = false;
		const slotEls = document.querySelectorAll<HTMLElement>('[data-slot]');
		for (const el of slotEls) {
			const r = el.getBoundingClientRect();
			if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
				overSlot = Number(el.dataset.slot);
				return;
			}
		}
		const poolEl = document.querySelector<HTMLElement>('[data-pool]');
		if (poolEl) {
			const r = poolEl.getBoundingClientRect();
			overPool =
				e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
		}
	}

	function onUp() {
		if (dragId && dragFrom) {
			if (overSlot !== null) placeInSlot(overSlot);
			else if (overPool) sendToPool();
			// 그 외: 원위치(변화 없음)
		}
		dragId = null;
		dragFrom = null;
		overSlot = null;
		overPool = false;
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onUp);
		window.removeEventListener('pointercancel', onUp);
	}

	function removeFromOrigin(moving: string, from: { type: 'pool' | 'slot'; index: number }) {
		if (from.type === 'pool') pool = pool.filter((x) => x !== moving);
		else slots[from.index] = null;
	}

	function placeInSlot(target: number) {
		const moving = dragId!;
		const from = dragFrom!;
		if (from.type === 'slot' && from.index === target) return; // 제자리
		const displaced = slots[target];
		removeFromOrigin(moving, from);
		slots[target] = moving;
		if (displaced) {
			// 대상 자리에 있던 카드는: 슬롯끼리면 맞바꾸고, 풀에서 온 경우면 풀로
			if (from.type === 'slot') slots[from.index] = displaced;
			else pool = [...pool, displaced];
		}
		slots = [...slots];
	}

	function sendToPool() {
		const moving = dragId!;
		const from = dragFrom!;
		if (from.type === 'pool') return;
		slots[from.index] = null;
		slots = [...slots];
		pool = [...pool, moving];
	}

	function done() {
		if (!allFilled) return;
		onComplete(slots.map((id) => get(id!)));
	}
</script>

<p class="muted" style="text-align:center; margin:8px 0 14px">
	아래 후보를 위 순위 칸으로 <b>끌어다 놓아</b> 정해요 (좌상단이 1등)
</p>

<!-- 순위 슬롯: 좌상단 1등 → 우하단 꼴등 -->
<div class="rank-grid">
	{#each slots as sid, i (i)}
		<div class="slot" data-slot={i} class:over={overSlot === i} class:filled={sid !== null}>
			<span class="rank-badge">{i + 1}</span>
			{#if sid}
				<div
					class="mini-card"
					data-card
					data-id={sid}
					data-loc="slot"
					data-index={i}
					onpointerdown={startDrag}
					style="touch-action:none"
				>
					{#if get(sid).image}
						<img src={get(sid).image} alt="" />
					{:else}
						<span class="mono">{get(sid).name.slice(0, 2)}</span>
					{/if}
					<small>{get(sid).name}</small>
				</div>
			{/if}
		</div>
	{/each}
</div>

<!-- 후보 풀 -->
<div class="pool" data-pool class:over={overPool}>
	{#if pool.length === 0}
		<span class="muted" style="padding:12px; grid-column:1 / -1; text-align:center"
			>모든 후보를 배치했어요 🎉</span
		>
	{:else}
		{#each pool as id (id)}
			<div
				class="mini-card"
				data-card
				data-id={id}
				data-loc="pool"
				data-index="0"
				onpointerdown={startDrag}
				style="touch-action:none"
			>
				{#if get(id).image}
					<img src={get(id).image} alt="" />
				{:else}
					<span class="mono">{get(id).name.slice(0, 2)}</span>
				{/if}
				<small>{get(id).name}</small>
			</div>
		{/each}
	{/if}
</div>

<button class="btn btn-primary btn-block" style="margin-top:18px" onclick={done} disabled={!allFilled}>
	{allFilled ? '이 순위로 완료' : `아직 ${slots.filter((s) => s === null).length}칸 남았어요`}
</button>

<!-- 드래그 고스트 -->
{#if dragId}
	<div class="ghost" style="left:{ghostX}px; top:{ghostY}px">
		{#if get(dragId).image}
			<img src={get(dragId).image} alt="" />
		{:else}
			<span class="mono">{get(dragId).name.slice(0, 2)}</span>
		{/if}
	</div>
{/if}

<style>
	.rank-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
		gap: 8px;
		margin-bottom: 22px;
	}
	.slot {
		position: relative;
		aspect-ratio: 3 / 4;
		border: 3px dashed var(--soft);
		border-radius: 0;
		display: grid;
		place-items: center;
		background: var(--surface);
		transition:
			border-color 0.1s steps(2),
			background 0.1s steps(2);
	}
	.slot.filled {
		border-style: solid;
		border-color: var(--ink);
		box-shadow: 4px 4px 0 var(--ink);
	}
	.slot.over {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, var(--surface));
	}
	.rank-badge {
		position: absolute;
		top: 4px;
		left: 6px;
		font-size: 12px;
		font-weight: 800;
		color: var(--muted);
		z-index: 1;
	}
	.mini-card {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 4px;
		cursor: grab;
		user-select: none;
	}
	.mini-card img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 0;
	}
	.mini-card .mono {
		width: 100%;
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		background: var(--bg);
		border-radius: 0;
		font-weight: 700;
	}
	.mini-card small {
		font-size: 12px;
		text-align: center;
		line-height: 1.1;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pool {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
		gap: 8px;
		min-height: 96px;
		padding: 10px;
		border: 3px solid var(--ink);
		border-radius: 0;
		background: var(--bg);
		box-shadow: var(--shadow);
		transition: background 0.1s steps(2);
	}
	.pool.over {
		background: color-mix(in srgb, var(--accent) 10%, var(--bg));
	}
	.ghost {
		position: fixed;
		width: 68px;
		transform: translate(-50%, -50%) rotate(-3deg);
		pointer-events: none;
		z-index: 100;
		opacity: 0.92;
		box-shadow: 4px 4px 0 var(--ink);
		border-radius: 0;
		border: 3px solid var(--ink);
	}
	.ghost img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 0;
	}
	.ghost .mono {
		display: grid;
		place-items: center;
		width: 68px;
		height: 68px;
		background: var(--surface);
		border-radius: 0;
		font-weight: 700;
	}
</style>
