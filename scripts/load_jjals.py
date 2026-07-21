#!/usr/bin/env python3
"""판정 결과(result-*.json)를 후보 메타와 합쳐 jjals 테이블에 적재한다.

판정 에이전트는 idx / keep / caption_ko / keywords만 돌려주므로,
이미지 URL·크기는 필터 통과본(jjal-filtered.json)에서 idx로 끌어와 붙인다.

로컬에서 node fetch가 Supabase에 붙지 못하는 문제가 있어 /usr/bin/curl을 쓴다
(~/.local/bin/curl은 shim이라 플래그를 무시한다).

사용: python3 scripts/load_jjals.py <판정결과디렉토리> [--dry]
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHUNK = 200

ENV = {}
for line in (ROOT / ".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        ENV[k.strip()] = v.strip()
SB = ENV["PUBLIC_SUPABASE_URL"]
KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("judge_dir")
    ap.add_argument("--src", default=str(ROOT / "discovery-inbox" / "jjal-filtered.json"))
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    cand = {i: r for i, r in enumerate(json.loads(Path(args.src).read_text()))}
    rows, judged = [], 0
    for f in sorted(Path(args.judge_dir).glob("result-*.json")):
        for v in json.loads(f.read_text()):
            judged += 1
            c = cand.get(v["idx"])
            if not v.get("keep") or not c:
                continue
            rows.append({
                "image_url": c["image_url"],
                "thumb_url": c["thumb_url"],
                "width": c.get("width"),
                "height": c.get("height"),
                "caption": v.get("caption_ko"),
                "keywords": v.get("keywords") or [],
                "source": "external",
                "source_url": c.get("source_url"),
                "status": "live",
            })
    print(f"판정 {judged}개 → KEEP {len(rows)}개 ({len(rows) / judged * 100:.1f}%)")
    if args.dry or not rows:
        return

    for i in range(0, len(rows), CHUNK):
        part = rows[i : i + CHUNK]
        out = subprocess.run(
            ["/usr/bin/curl", "-s", "--max-time", "180", "-X", "POST",
             f"{SB}/rest/v1/jjals",
             "-H", f"apikey: {KEY}", "-H", f"Authorization: Bearer {KEY}",
             "-H", "Content-Type: application/json",
             "-H", "Prefer: return=minimal", "-w", "%{http_code}",
             "--data-binary", "@-"],
            input=json.dumps(part), capture_output=True, text=True,
        ).stdout
        if out.strip()[-3:] not in ("200", "201"):
            print("적재 실패:", out[:300])
            sys.exit(1)
        print(f"  {i + len(part)}/{len(rows)}")
    print("적재 완료")


if __name__ == "__main__":
    main()
