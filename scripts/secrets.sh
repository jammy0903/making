#!/usr/bin/env bash
# 시크릿 관리 (SOPS + age). 평문 .env 는 git에 안 올라가고, 암호화된 .env.enc 만 커밋된다.
#
# 최초 1회(새 컴퓨터) 셋업:
#   1) age·sops 설치 (예: ~/.local/bin 에 바이너리)
#   2) 복호화 개인키를 ~/.config/sops/age/keys.txt 에 복사 (안전하게 별도 보관해 둔 것)
#   3) ./scripts/secrets.sh pull      # .env.enc → .env 복호화
#
# 값 바꾼 뒤:
#   ./scripts/secrets.sh push          # .env → .env.enc 재암호화 후 커밋 대상에 올림
#
# 사용법: scripts/secrets.sh {pull|push}
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-$HOME/.config/sops/age/keys.txt}"

case "${1:-}" in
  pull)
    if [ ! -f .env.enc ]; then echo "❌ .env.enc 없음"; exit 1; fi
    sops --input-type dotenv --output-type dotenv -d .env.enc > .env
    echo "✅ .env.enc → .env 복호화 완료"
    ;;
  push)
    if [ ! -f .env ]; then echo "❌ .env 없음"; exit 1; fi
    sops --input-type dotenv --output-type dotenv -e .env > .env.enc
    echo "✅ .env → .env.enc 재암호화 완료 (git add .env.enc 후 커밋하세요)"
    ;;
  *)
    echo "사용법: scripts/secrets.sh {pull|push}"; exit 1
    ;;
esac
