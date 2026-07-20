<script lang="ts">
  // 썸네일 이미지 한 쌍 — 원본을 자르지 않고 통째로 보여준다.
  //
  // 왜: 썸네일 틀이 4:3 고정이라 예전엔 object-fit:cover로 잘라 맞췄는데, 세로로 긴 밈
  // (스크린샷·자막짤)은 중요한 부분이 통째로 날아갔다(실측 466장 중 33%가 면적 20%+ 손실,
  // 최악 70%). 크롭 위치를 위/아래로 고정해 보는 방법은 최적 위치가 이미지마다 맨 위~맨 아래로
  // 흩어져 있어(상단 고정 시 개선 11% vs 악화 50%) 어떤 고정값도 답이 아니었다.
  // 그래서 자르지 않고(contain) 남는 여백은 같은 사진을 확대·블러 처리해 채운다.
  //
  // 두 img의 src가 같아 네트워크 요청은 한 번만 나간다(두 번째는 캐시에서 온다).
  let {
    src,
    alt = '',
    loading,
  }: { src: string; alt?: string; loading?: 'lazy' | 'eager' } = $props();
</script>

<!-- 배경: 같은 사진을 꽉 채워(cover) 블러 — 순수 장식이라 스크린리더에서 숨긴다 -->
<img class="tf-bg" {src} alt="" aria-hidden="true" referrerpolicy="no-referrer" />
<img class="tf-fg" {src} {alt} {loading} referrerpolicy="no-referrer" />
