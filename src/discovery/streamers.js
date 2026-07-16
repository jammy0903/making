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
  'UCQJuZxeDv2P05YHcC-tIEVQ', // 악어 (게임, 1.25M)
  'UCg7rkxrTnIhiHEpXY1ec9NA', // 잠뜰 TV (마인크래프트, 잼민이 대표, 2.39M)
  'UCbFzvzDu17eDZ3RIeaLRswQ', // 감스트 (게임/축구, 3.02M)
  'UCD2YO_A_PVMgMDN9jpRrpVA', // 랄로 (롤 스트리머, 1.32M)
  // ── 먹방 ──
  'UCfpaSruWW3S4dibonKXENjA', // 쯔양 (13.4M)
  'UCoLQZ4ZClFqVPCvvjuiUSRA', // 문복희 (11M)
  'UCBIoXzDldCnpbM_7uyG0_Tg', // 홍사운드 (1.83M)
  'UCA6KBBX8cLwYZNepxlE_7SA', // 히밥 (1.71M)
  'UC-Bsa2ivAGWq7bsSPrPGFVA', // 입짧은햇님 (1.65M)
  // ── 예능 ──
  'UCwx6n_4OcLgzAGdty0RWCoA', // 워크맨 (4.27M)
  'UCQ2O-iftmnlfrBuNsUUTofQ', // 채널십오야 (나영석, 7.56M)
  'UCDNvRZRgvkBTUkQzFoT_8rA', // 뜬뜬 (핑계고, 3.28M)
  'UCGX5sP4ehBkihHwt5bs5wvg', // 피식대학 (2.83M)
  'UCUyfkq9e9ZfPzxOW5WQ9rzQ', // 문명특급 MMTG (2.02M)
  // ── 밈 제목 밀도 최상(대사체·공감밈 제목이 곧 밈) ──
  'UCXEKwWflysXu312NmIP_dlw', // 너덜트 (스케치 코미디, 2.21M) — "코르티스가 뭔데요?" 등 밈 대사 제목
  'UCRuSxVu4iqTK5kCh90ntAgA', // 총몇명 (공감 애니, 4.02M) — "첫 출근 特", "퇴사 마려운 TOP5"
  'UCdtRAcd3L_UpV4tMXCw63NQ', // 피지컬갤러리 (김계란, 2.98M) — 가짜사나이·티키타카 밈 발원
  'UCqsPmfRMm0AGTF3mw1VtCnw', // 빵송국 (매드몬스터/스케치, 577K) — "재벌이 사이코패스일때" 대사밈
  'UClgQvJio7ylGa9kV9b7VzLQ', // 스낵타운 (공감 스케치, 821K) — "평양냉면 이슈" 공감밈
];

const UPLOADS_PER_CHANNEL = 10; // 채널당 훑을 최근 업로드 수
export { UPLOADS_PER_CHANNEL };
