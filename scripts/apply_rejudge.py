#!/usr/bin/env python3
"""재판정 결과(고유명사)를 jjals.keywords 앞에 덧붙인다 (docs/jjal-alias-plan.md 6장).

기존 판정이 인물·작품 이름을 안 적어서 'GD'는커녕 '지드래곤'으로도 안 나오던 짤을 고친다.
이름은 keywords 맨 앞에 놓는다 — 관련 짤(keywords=ov)과 검색 ①단계가 먼저 보는 자리다.

입력: [{"id": 123, "names": ["지드래곤"]}, ...] 형태의 JSON 파일들.
사용: python3 scripts/apply_rejudge.py <결과디렉토리> [--dry]   (저장소 루트에서 실행할 것)

덧붙이기만 하고 기존 keywords는 절대 지우지 않는다. 재실행해도 중복이 생기지 않는다(멱등).
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


def req(method, path, body=None):
    cmd = ["/usr/bin/curl", "-s", "-w", "\n%{http_code}", "-X", method, f"{SB}/rest/v1/{path}", *HDR]
    if body is not None:
        cmd += ["-H", "content-type:application/json", "-H", "Prefer:return=minimal", "-d", json.dumps(body, ensure_ascii=False)]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    text, _, code = out.rpartition("\n")
    return int(code), text


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    dry = "--dry" in sys.argv

    # 결과 병합 — 같은 id가 여러 파일에 나오면 이름을 합친다
    names: dict[int, list[str]] = {}
    files = sorted(src.glob("result-*.json"))
    if not files:
        sys.exit(f"{src} 에 result-*.json 이 없다")
    for f in files:
        for row in json.loads(f.read_text()):
            cur = names.setdefault(int(row["id"]), [])
            for n in row.get("names", []):
                n = n.strip()
                # 한 글자 이름은 부분 일치에서 아무 데나 걸린다(별칭 사전과 같은 규칙)
                if len(n) >= 2 and n not in cur:
                    cur.append(n)
    print(f"결과 파일 {len(files)}개 · 대상 짤 {len(names)}개 · 이름 {sum(len(v) for v in names.values())}개")

    # 현재 keywords를 읽어 이미 있는 이름은 건너뛴다(멱등)
    ids = sorted(names)
    updated = skipped = failed = 0
    for i in range(0, len(ids), 200):
        chunk = ids[i:i + 200]
        code, body = req("GET", f"jjals?select=id,keywords&id=in.({','.join(map(str, chunk))})")
        if code != 200:
            sys.exit(f"조회 실패 {code}: {body[:200]}")
        for row in json.loads(body):
            jid = row["id"]
            old = row["keywords"] or []
            add = [n for n in names[jid] if n not in old]
            if not add:
                skipped += 1
                continue
            if dry:
                print(f"  [dry] {jid}: +{add}")
                updated += 1
                continue
            # 이름을 맨 앞에 — 검색 ①단계와 관련 짤이 먼저 보는 자리다
            code2, b2 = req("PATCH", f"jjals?id=eq.{jid}", {"keywords": add + old})
            if code2 in (200, 204):
                updated += 1
            else:
                failed += 1
                print(f"  실패 {jid}: {code2} {b2[:120]}")

    print(f"{'[dry] ' if dry else ''}갱신 {updated} · 이미있음 {skipped} · 실패 {failed}")
    if not dry and updated:
        # 이름이 들어갔으니 임베딩 텍스트가 바뀌었다 — 해당 행은 다시 임베딩해야 한다
        print("→ 갱신된 행의 embedding을 비운다(재임베딩 대상으로)")
        for i in range(0, len(ids), 200):
            chunk = ids[i:i + 200]
            req("PATCH", f"jjals?id=in.({','.join(map(str, chunk))})", {"embedding": None})
        print("→ 이제 python3 scripts/embed_jjals.py 를 돌려라")


if __name__ == "__main__":
    main()
