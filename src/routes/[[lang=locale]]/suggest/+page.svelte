<script lang="ts">
	import { submitRequest } from '$lib/supabase';
	import { DECKS, isImageIcon } from '$lib/game/decks';
	import Icon from '$lib/game/Icon.svelte';

	let kind = $state<'topic' | 'condition'>('topic');

	// 주제 신청
	let topicTitle = $state('');
	let topicBody = $state('');

	// 조건 신청: 주제(드롭다운) → 편(라디오) → 조건 문구
	let deckId = $state('');
	let side = $state<0 | 1 | null>(null);
	let condText = $state('');

	let sending = $state(false);
	let done = $state(false);
	let error = $state('');

	const selectedDeck = $derived(DECKS.find((d) => d.id === deckId) ?? null);

	const canSubmit = $derived(
		kind === 'topic'
			? topicTitle.trim().length > 0 && topicBody.trim().length > 0
			: !!selectedDeck && side !== null && condText.trim().length > 0
	);

	async function send(e: Event) {
		e.preventDefault();
		if (!canSubmit || sending) return;
		sending = true;
		error = '';
		let ok = false;
		if (kind === 'topic') {
			ok = await submitRequest('topic', topicTitle.trim(), topicBody.trim());
		} else if (selectedDeck && side !== null) {
			// 관리자가 어느 덱·어느 편인지 알아보게 title에 인코딩, 조건 문구는 body.
			const sideName = side === 0 ? selectedDeck.a.name : selectedDeck.b.name;
			const label = `${selectedDeck.title} · ${sideName} 편`;
			ok = await submitRequest('condition', label, condText.trim());
		}
		sending = false;
		if (ok) {
			done = true;
			topicTitle = '';
			topicBody = '';
			deckId = '';
			side = null;
			condText = '';
		} else {
			error = '전송에 실패했어요. 잠시 후 다시 시도해 주세요.';
		}
	}
</script>

<svelte:head>
	<title>주제·조건 신청 · 그런데이제</title>
	<meta name="description" content="새 주제나 재밌는 조건을 제안해 주세요." />
</svelte:head>

<div class="suggest">
	<h2>주제·조건 신청</h2>
	<p class="muted">새 주제나 "그런데 이제 ~해도" 조건을 제안해 주세요. 채택되면 게임에 올라갑니다.</p>

	{#if done}
		<div class="card thanks">
			<p><b>신청 완료!</b> 검토 후 반영할게요. 🙌</p>
			<button type="button" onclick={() => (done = false)}>하나 더 신청</button>
		</div>
	{:else}
		<form class="card form" onsubmit={send}>
			<div class="seg">
				<button type="button" class:on={kind === 'topic'} onclick={() => (kind = 'topic')}
					>새 주제</button
				>
				<button type="button" class:on={kind === 'condition'} onclick={() => (kind = 'condition')}
					>조건 제안</button
				>
			</div>

			{#if kind === 'topic'}
				<label>
					주제 (예: 여름 vs 겨울)
					<input type="text" bind:value={topicTitle} maxlength="100" placeholder="A vs B" required />
				</label>
				<label>
					설명 · 양쪽 편 아이디어
					<textarea bind:value={topicBody} maxlength="500" rows="4" required></textarea>
				</label>
			{:else}
				<label>
					주제 선택
					<select bind:value={deckId} required>
						<option value="" disabled>주제를 고르세요</option>
						{#each DECKS as d (d.id)}
							<!-- <option>은 텍스트만 렌더 → 이미지 아이콘은 생략하고 제목만 -->
							<option value={d.id}>{isImageIcon(d.icon) ? '' : d.icon} {d.title}</option>
						{/each}
					</select>
				</label>

				{#if selectedDeck}
					<fieldset class="sides">
						<legend>어느 편에?</legend>
						<label class="radio">
							<input type="radio" name="side" value={0} bind:group={side} />
							<span><Icon value={selectedDeck.a.emoji} /> {selectedDeck.a.name}</span>
						</label>
						<label class="radio">
							<input type="radio" name="side" value={1} bind:group={side} />
							<span><Icon value={selectedDeck.b.emoji} /> {selectedDeck.b.name}</span>
						</label>
					</fieldset>
				{/if}

				<label>
					조건 문구 (예: 방귀가 계속 새어 나가도)
					<textarea
						bind:value={condText}
						maxlength="500"
						rows="3"
						placeholder="그런데 이제 ___"
						required
					></textarea>
				</label>
			{/if}

			{#if error}<p class="err">{error}</p>{/if}
			<button type="submit" class="submit" disabled={sending || !canSubmit}>
				{sending ? '보내는 중…' : '신청하기'}
			</button>
		</form>
	{/if}
</div>

<style>
	.suggest {
		max-width: 520px;
		margin: 0 auto;
	}
	h2 {
		margin: 8px 0 8px;
	}
	.muted {
		color: var(--muted);
		margin: 0 0 18px;
		font-size: 14px;
	}
	.card {
		background: var(--surface);
		border: 3px solid var(--line);
		box-shadow: var(--shadow);
		padding: 20px;
	}
	.form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.seg {
		display: flex;
		gap: 0;
	}
	.seg button {
		flex: 1;
		font: inherit;
		font-weight: 700;
		padding: 10px;
		border: 3px solid var(--line);
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
	}
	.seg button.on {
		background: var(--accent, #6d5efc);
		color: #fff;
	}
	.seg button:first-child {
		border-right-width: 0;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 14px;
		font-weight: 600;
	}
	input,
	textarea,
	select {
		font: inherit;
		font-weight: 400;
		padding: 10px;
		border: 3px solid var(--line);
		background: var(--surface);
		color: var(--ink);
		resize: vertical;
	}
	.sides {
		border: 3px solid var(--line);
		padding: 12px 14px;
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.sides legend {
		font-size: 14px;
		font-weight: 600;
		padding: 0 6px;
	}
	.radio {
		flex-direction: row;
		align-items: center;
		gap: 8px;
		font-weight: 700;
		cursor: pointer;
		padding: 8px 12px;
		border: 2px solid var(--line);
		flex: 1;
		min-width: 120px;
	}
	.radio input {
		width: auto;
		margin: 0;
		accent-color: var(--accent, #6d5efc);
	}
	.submit {
		font: inherit;
		font-weight: 700;
		padding: 12px;
		border: 3px solid var(--line);
		background: var(--accent, #6d5efc);
		color: #fff;
		cursor: pointer;
	}
	.submit:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.err {
		color: var(--error);
		font-size: 14px;
		margin: 0;
	}
	.thanks {
		display: flex;
		flex-direction: column;
		gap: 14px;
		align-items: flex-start;
	}
	.thanks button {
		font: inherit;
		font-weight: 700;
		padding: 10px 16px;
		border: 3px solid var(--line);
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
	}
</style>
