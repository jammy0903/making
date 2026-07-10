<script lang="ts">
	import { submitRequest } from '$lib/supabase';

	let kind = $state<'topic' | 'condition'>('topic');
	let title = $state('');
	let body = $state('');
	let sending = $state(false);
	let done = $state(false);
	let error = $state('');

	async function send(e: Event) {
		e.preventDefault();
		if (!title.trim() || !body.trim() || sending) return;
		sending = true;
		error = '';
		const ok = await submitRequest(kind, title.trim(), body.trim());
		sending = false;
		if (ok) {
			done = true;
			title = '';
			body = '';
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

			<label>
				{kind === 'topic' ? '주제 (예: 여름 vs 겨울)' : '대상 (예: 좀비 덱 · 도망 편)'}
				<input
					type="text"
					bind:value={title}
					maxlength="100"
					placeholder={kind === 'topic' ? 'A vs B' : '어느 덱/어느 편'}
					required
				/>
			</label>

			<label>
				{kind === 'topic' ? '설명 · 양쪽 편 아이디어' : '조건 문구 (예: 방귀가 계속 새어 나가도)'}
				<textarea bind:value={body} maxlength="500" rows="4" required></textarea>
			</label>

			{#if error}<p class="err">{error}</p>{/if}
			<button type="submit" class="submit" disabled={sending}>
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
	textarea {
		font: inherit;
		font-weight: 400;
		padding: 10px;
		border: 3px solid var(--line);
		background: var(--surface);
		color: var(--ink);
		resize: vertical;
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
		color: #c0392b;
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
