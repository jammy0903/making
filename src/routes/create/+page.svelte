<script lang="ts">
	import { goto } from '$app/navigation';
	import { saveTopic } from '$lib/storage';
	import { makeId, type RankMode, type Topic } from '$lib/domain';
	import { resizeImageToDataUrl } from '$lib/image';

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
			error = '이미지를 처리하지 못했어요. 다른 파일을 시도해 주세요.';
		}
	}

	function save() {
		error = '';
		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			error = '주제 제목을 입력해 주세요.';
			return;
		}
		const candidates = rows
			.map((r) => ({ id: r.id, name: r.name.trim(), image: r.image }))
			.filter((c) => c.name.length > 0);
		if (candidates.length < 2) {
			error = '후보를 이름과 함께 2명 이상 추가해 주세요.';
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
		goto(`/t/${topic.id}`);
	}

	const filled = $derived(rows.filter((r) => r.name.trim().length > 0).length);
</script>

<h2 style="margin:8px 0 16px">새 주제 만들기</h2>

<div class="card" style="padding:16px; display:grid; gap:12px; margin-bottom:20px">
	<label>
		<span class="muted" style="font-size:13px">제목</span>
		<input class="input" bind:value={title} placeholder="예: 최애 간식 순위" maxlength="60" />
	</label>
	<label>
		<span class="muted" style="font-size:13px">설명 (선택)</span>
		<input class="input" bind:value={description} placeholder="한 줄 소개" maxlength="120" />
	</label>
	<label>
		<span class="muted" style="font-size:13px">기본 방식</span>
		<select class="input" bind:value={mode}>
			<option value="sort">순위 월드컵 (둘 중 하나 고르기)</option>
			<option value="drag">직접 순위 (드래그로 배치)</option>
		</select>
	</label>
</div>

<div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:8px">
	<h3 style="margin:0">후보 <span class="muted" style="font-weight:400">({filled}명)</span></h3>
	<span class="muted" style="font-size:13px">최대 {MAX}명</span>
</div>

<ul style="list-style:none; margin:0 0 12px; padding:0; display:grid; gap:8px">
	{#each rows as row, i (row.id)}
		<li class="card" style="padding:10px; display:flex; gap:10px; align-items:center">
			<label
				style="flex:0 0 52px; height:52px; border-radius:10px; overflow:hidden; border:1px dashed var(--line); display:grid; place-items:center; cursor:pointer; background:var(--bg)"
				title="사진 추가"
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
				placeholder={`후보 ${i + 1} 이름`}
				maxlength="40"
			/>
			<button
				class="btn"
				onclick={() => removeRow(row.id)}
				aria-label="삭제"
				style="padding:8px 12px"
				disabled={rows.length <= 1}>✕</button
			>
		</li>
	{/each}
</ul>

<button class="btn btn-block" onclick={addRow} disabled={rows.length >= MAX} style="margin-bottom:20px"
	>+ 후보 추가</button
>

{#if error}
	<p style="color:var(--danger); margin:0 0 12px">{error}</p>
{/if}

<button class="btn btn-primary btn-block" onclick={save}>주제 저장하고 플레이</button>
