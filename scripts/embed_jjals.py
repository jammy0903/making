#!/usr/bin/env python3
"""jjals.embedding이 null인 행을 배치로 채운다 (docs/jjal-archive-plan.md 4장).

모델: HF 추론 API의 intfloat/multilingual-e5-large (1024차원).
e5 계열은 문서에 "passage: ", 질의에 "query: " 접두사를 붙여야 성능이 나온다 —
검색 쪽(src/lib/server/jjal.ts)도 같은 규칙을 써야 한다.

로컬 네트워크에서 node fetch가 Supabase에 연결 실패하는 문제가 있어 curl을 쓴다.
사용: python3 scripts/embed_jjals.py  (.env의 HF_TOKEN·SUPABASE 키 필요)
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

SB = ENV["PUBLIC_SUPABASE_URL"]
KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
HF = ENV["HF_TOKEN"]
MODEL = "intfloat/multilingual-e5-large"
HF_URL = f"https://router.huggingface.co/hf-inference/models/{MODEL}/pipeline/feature-extraction"
BATCH = 32


def curl(args, body=None):
    cmd = ["/usr/bin/curl", "-s", "--max-time", "120"] + args
    if body is not None:
        cmd += ["--data-binary", "@-"]
    r = subprocess.run(cmd, input=body, capture_output=True, text=True)
    return r.stdout


def sb_get(path):
    return json.loads(curl(["-H", f"apikey: {KEY}", "-H", f"Authorization: Bearer {KEY}", SB + path]))


def main():
    rows = sb_get("/rest/v1/jjals?select=id,caption,keywords&embedding=is.null&status=eq.live&limit=2000")
    print(f"임베딩 대상: {len(rows)}행")
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        texts = [
            "passage: " + ((r.get("caption") or "") + ". 키워드: " + ", ".join(r.get("keywords") or [])).strip()
            for r in chunk
        ]
        out = curl(
            ["-X", "POST", HF_URL, "-H", f"Authorization: Bearer {HF}", "-H", "Content-Type: application/json"],
            json.dumps({"inputs": texts}, ensure_ascii=False),
        )
        vecs = json.loads(out)
        if not (isinstance(vecs, list) and len(vecs) == len(chunk)):
            print("HF 응답 이상:", str(vecs)[:200])
            sys.exit(1)
        # 벌크 upsert — embedding·embedding_model만 갱신 (source는 not null이라 포함)
        payload = [
            {"id": r["id"], "source": "external", "embedding": json.dumps(v), "embedding_model": MODEL}
            for r, v in zip(chunk, vecs)
        ]
        res = curl(
            ["-X", "POST", f"{SB}/rest/v1/jjals?on_conflict=id",
             "-H", f"apikey: {KEY}", "-H", f"Authorization: Bearer {KEY}",
             "-H", "Content-Type: application/json",
             "-H", "Prefer: resolution=merge-duplicates,return=minimal",
             "-w", "%{http_code}"],
            json.dumps(payload),
        )
        if res.strip()[-3:] not in ("200", "201"):
            print("upsert 실패:", res[:300])
            sys.exit(1)
        print(f"{i + len(chunk)}/{len(rows)}")
    print("완료")


if __name__ == "__main__":
    main()
