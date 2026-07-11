<!--
	덱 아이콘/편 이모지 렌더. 값이 업로드 이미지(URL·data URI)면 <img>, 아니면 이모지 글자.
	크기 기본 1em → 놓인 자리의 font-size(=기존 이모지 크기)를 그대로 상속해 어디서든 자연스럽게 맞음.
	이미지는 정사각 crop(icon/avatar 느낌) + crossorigin(결과 PNG 캡처 시 html-to-image가 인라인 가능).
-->
<script lang="ts">
	import { isImageIcon } from '$lib/game/decks';

	let { value, alt = '', size = '1em' }: { value: string; alt?: string; size?: string } = $props();
</script>

{#if isImageIcon(value)}
	<img class="icon-img" src={value} {alt} crossorigin="anonymous" style="width:{size};height:{size}" />
{:else}{value}{/if}

<style>
	.icon-img {
		display: inline-block;
		object-fit: cover;
		border-radius: 4px;
		vertical-align: middle;
	}
</style>
