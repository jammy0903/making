#!/usr/bin/env python3
"""1단계 — 캡션에 이미 적혀 있는 고유명사를 keywords로 옮긴다 (docs/jjal-alias-plan.md 6장).

비전 판정이 필요 없다. 캡션에 '지드래곤'이 있는데 keywords에 없으면, 검색 ①단계(정확 일치)와
관련 짤(keywords 겹침)이 그 짤을 놓친다. 캡션 부분 일치로 걸리긴 하지만 순위가 밀린다.

입력: 고유명사 목록 JSON(문자열 배열) 1개 이상.
사용: python3 scripts/apply_caption_names.py <이름목록.json>... [--dry]   (저장소 루트에서 실행)
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV = {}
for line in (ROOT / ".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        ENV[k.strip()] = v.strip()
SB, KEY = ENV["PUBLIC_SUPABASE_URL"], ENV["SUPABASE_SERVICE_ROLE_KEY"]
HDR = ["-H", f"apikey:{KEY}", "-H", f"Authorization:Bearer {KEY}"]

# 모호한 이름('유리','철수')도 넣는다 — 사용자 판단(2026-07-21).
# 근거: 검색 ①'단계가 이미 caption 부분 일치를 하므로 '유리'를 치면 "유리창" 캡션은 어차피 나온다.
# keywords에서만 빼면 노이즈는 그대로면서 '짱구 유리'만 놓친다. 애초에 검색자가 어느 쪽을
# 찾는지 우리가 알 수 없으니, 둘 다 보여주고 고르게 하는 편이 낫다.
# 남는 제약은 한 글자 금지뿐(부분 일치에서 무한정 걸린다).
AMBIGUOUS: set[str] = set()


def req(method, path, body=None):
    cmd = ["/usr/bin/curl", "-s", "-w", "\n%{http_code}", "-X", method, f"{SB}/rest/v1/{path}", *HDR]
    if body is not None:
        cmd += ["-H", "content-type:application/json", "-H", "Prefer:return=minimal",
                "-d", json.dumps(body, ensure_ascii=False)]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    text, _, code = out.rpartition("\n")
    return int(code), text


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv
    if not args:
        sys.exit(__doc__)

    names = []
    for p in args:
        for n in json.loads(Path(p).read_text()):
            n = n.strip()
            if len(n) >= 2 and n not in AMBIGUOUS and n not in names:
                names.append(n)
    # 긴 이름부터 본다: '잔망루피'를 먼저 잡아야 '루피'만 남는 일이 없다
    names.sort(key=len, reverse=True)
    print(f"이름 {len(names)}개 (모호어 제외)")

    rows, off = [], 0
    while True:
        code, body = req("GET", f"jjals?select=id,caption,keywords&status=eq.live&order=id.asc&offset={off}&limit=1000")
        if code != 200:
            sys.exit(f"조회 실패 {code}: {body[:200]}")
        page = json.loads(body)
        if not page:
            break
        rows += page
        off += 1000
    print(f"짤 {len(rows)}개 조회")

    updated = failed = 0
    hits = 0
    for r in rows:
        cap, old = r["caption"] or "", r["keywords"] or []
        add = [n for n in names if n in cap and n not in old]
        if not add:
            continue
        hits += 1
        if dry:
            if hits <= 20:
                print(f"  [dry] {r['id']}: +{add}")
            updated += 1
            continue
        code, b = req("PATCH", f"jjals?id=eq.{r['id']}", {"keywords": add + old})
        if code in (200, 204):
            updated += 1
        else:
            failed += 1
            print(f"  실패 {r['id']}: {code} {b[:120]}")

    print(f"{'[dry] ' if dry else ''}갱신 {updated} · 실패 {failed}")
    if not dry and updated:
        print("→ keywords가 바뀐 행은 embedding도 다시 만들어야 한다: scripts/embed_jjals.py")


if __name__ == "__main__":
    main()
