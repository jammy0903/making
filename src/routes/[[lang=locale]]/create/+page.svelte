<script lang="ts">
	import { goto } from '$app/navigation';
	import { saveTopic } from '$lib/storage';
	import { makeId, type RankMode, type Topic } from '$lib/domain';
	import { resizeImageToDataUrl } from '$lib/image';
	import ImageSearchModal from '$lib/components/ImageSearchModal.svelte';
	import { useT, getLocale, localePath } from '$lib/i18n';

	const t = useT();
	const MAX = 256;

	interface Row {
		id: string;
		name: string;
		image?: string;
	}

	let title = $state('');
	let description = $state('');
	let mode = $state<RankMode>('sort');
	let rows = $state<Row[]>([blank(), blank()]);
	let error = $state('');
	let searchRowId = $state<string | null>(null); // 검색 모달을 연 행 id

	function blank(): Row {
		return { id: makeId(), name: '', image: undefined };
	}

	function addRow() {
		if (rows.length >= MAX) return;
		rows = [...rows, blank()];
	}

	function removeRow(id: string) {
		rows = rows.filter((r) => r.id !== id);
	}

	async function onPickImage(row: Row, e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			row.image = await resizeImageToDataUrl(file);
			rows = rows; // 반응성 트리거
		} catch {
			error = t('create.errImage');
		}
	}

	function applySearchImage(dataUrl: string) {
		const row = rows.find((r) => r.id === searchRowId);
		if (row) {
			row.image = dataUrl;
			rows = rows; // 반응성 트리거
		}
	}

	function save() {
		error = '';
		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			error = t('create.errTitle');
			return;
		}
		const candidates = rows
			.map((r) => ({ id: r.id, name: r.name.trim(), image: r.image }))
			.filter((c) => c.name.length > 0);
		if (candidates.length < 2) {
			error = t('create.errCandidates');
			return;
		}
		const topic: Topic = {
			id: makeId(),
			title: trimmedTitle,
			description: description.trim(),
			defaultMode: mode,
			candidates,
			createdAt: Date.now()
		};
		saveTopic(topic);
		goto(localePath(getLocale(), `/t/${topic.id}`));
	}

	const filled = $derived(rows.filter((r) => r.name.trim().length > 0).length);
</script>

<h2 style="margin:8px 0 16px">{t('create.heading')}</h2>

<div class="card" style="padding:16px; display:grid; gap:12px; margin-bottom:20px">
	<label>
		<span class="muted" style="font-size:13px">{t('create.fieldTitle')}</span>
		<input class="input" bind:value={title} placeholder={t('create.titlePlaceholder')} maxlength="60" />
	</label>
	<label>
		<span class="muted" style="font-size:13px">{t('create.fieldDesc')}</span>
		<input class="input" bind:value={description} placeholder={t('create.descPlaceholder')} maxlength="120" />
	</label>
	<label>
		<span class="muted" style="font-size:13px">{t('create.fieldMode')}</span>
		<select class="input" bind:value={mode}>
			<option value="sort">{t('create.modeOptWorldcup')}</option>
			<option value="drag">{t('create.modeOptDrag')}</option>
		</select>
	</label>
</div>

<div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:8px">
	<h3 style="margin:0">
		{t('create.candidates')}
		<span class="muted" style="font-weight:400">{t('create.filled', { n: filled })}</span>
	</h3>
	<span class="muted" style="font-size:13px">{t('create.max', { n: MAX })}</span>
</div>

<ul style="list-style:none; margin:0 0 12px; padding:0; display:grid; gap:8px">
	{#each rows as row, i (row.id)}
		<li class="card" style="padding:10px; display:flex; gap:10px; align-items:center">
			<label
				style="flex:0 0 52px; height:52px; border-radius:0; overflow:hidden; border:1px dashed var(--line); display:grid; place-items:center; cursor:pointer; background:var(--bg)"
				title={t('create.addPhoto')}
			>
				{#if row.image}
					<img src={row.image} alt="" style="width:100%; height:100%; object-fit:cover" />
				{:else}
					<span class="muted" style="font-size:20px">＋</span>
				{/if}
				<input
					type="file"
					accept="image/*"
					onchange={(e) => onPickImage(row, e)}
					style="display:none"
				/>
			</label>
			<input
				class="input"
				style="flex:1"
				bind:value={row.name}
				placeholder={t('create.candidateName', { i: i + 1 })}
				maxlength="40"
			/>
			<button
				class="btn"
				onclick={() => (searchRowId = row.id)}
				aria-label={t('create.searchPhoto')}
				title={t('create.searchPhoto')}
				style="padding:8px 12px">🔍</button
			>
			<button
				class="btn"
				onclick={() => removeRow(row.id)}
				aria-label={t('common.delete')}
				style="padding:8px 12px"
				disabled={rows.length <= 1}>✕</button
			>
		</li>
	{/each}
</ul>

<button class="btn btn-block" onclick={addRow} disabled={rows.length >= MAX} style="margin-bottom:20px"
	>{t('create.addCandidate')}</button
>

{#if error}
	<p style="color:var(--danger); margin:0 0 12px">{error}</p>
{/if}

<button class="btn btn-primary btn-block" onclick={save}>{t('create.save')}</button>

{#if searchRowId}
	<ImageSearchModal
		initialQuery={rows.find((r) => r.id === searchRowId)?.name ?? ''}
		onselect={applySearchImage}
		onclose={() => (searchRowId = null)}
	/>
{/if}
