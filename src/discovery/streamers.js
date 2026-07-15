// 모니터링할 스트리머/크리에이터 유튜브 채널 목록 (발굴 공급 채널 ④-b).
// 밈은 스트리머의 "순간"에서 자주 태어난다 → 지정 채널의 최근 업로드 제목을 훑어 밈 후보를 뽑는다.
//
// 넣는 법: @핸들(권장) 또는 채널ID(UC…) 문자열을 배열에 추가.
//   예) '@침착맨', '@풍월량', 'UCxxxxxxxx'
// 핸들은 유튜브 채널 URL(youtube.com/@핸들)에서 그대로 복사하면 됨.
// 비어 있으면 스트리머 채널은 조용히 스킵된다(급상승 채널만 동작).
export const STREAMERS = [
  'UCUj6rrhMTR9pipbAWBAMvUQ', // 침착맨 (토크/실황, 3.19M)
  'UCBkyj16n2snkRg1BAzpovXQ', // 우왁굳 (게임/버튜버, 1.55M)
  'UCyHvSKT_bLDYpkv1JjjsLAg', // 풍월량 (게임 실황, 526K)
  'UCQJuZxeDv2P05YHcC-tIEVQ', // 악어 (게임, 1.25M)
  'UCk6bX-MZXdte_7kG8TbMkqg', // 허팝 (실험/도전, 4.24M)
  'UCg7rkxrTnIhiHEpXY1ec9NA', // 잠뜰 TV (마인크래프트, 2.39M)
  'UChQ-VMvdGrYZxviQVMTJOHg', // 도티 TV (마인크래프트, 2.38M)
  'UCbFzvzDu17eDZ3RIeaLRswQ', // 감스트 (게임/축구, 3.02M)
  'UCD2YO_A_PVMgMDN9jpRrpVA', // 랄로 (롤 스트리머, 1.32M)
];

const UPLOADS_PER_CHANNEL = 10; // 채널당 훑을 최근 업로드 수
export { UPLOADS_PER_CHANNEL };
