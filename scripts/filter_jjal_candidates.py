#!/usr/bin/env python3
"""수집한 짤 후보를 비전 판정 전에 싸게 걸러낸다 (docs/jjal-crawl-plan.md 3장 A~D단계).

비전 판정(F)이 전체 비용을 지배하므로, 거기 도달하는 수를 최대한 줄이는 게 목적이다.
썸네일을 한 번만 받아 크기·해시·형태 판정을 동시에 처리한다.

썸네일은 판정용으로 잠깐 읽을 뿐 저장하지 않는다 — 재호스팅 금지 원칙과 충돌하지 않는다.

사용: python3 scripts/filter_jjal_candidates.py [입력.json] [-o 출력.json]
"""
import argparse
import io
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36"

MIN_SIDE = 200          # 236x 썸네일 기준 — 너무 작으면 원본도 쓸 만하지 않다
RATIO_MAX = 2.2         # 세로로 긴 인포그래픽·배너 컷
RATIO_MIN = 1 / 2.2
HAMMING_MAX = 5         # dHash 근사 중복 판정 거리

# alt 텍스트에 이거 들어가면 짤이 아닐 확률이 높다 (패션·인테리어·화보·굿즈 등)
BLOCK = [
    "outfit", "fashion", "wallpaper", "aesthetic", "interior", "decor", "nail",
    "makeup", "tattoo", "hairstyle", "recipe", "workout", "quotes", "lockscreen",
    "drawing tutorial", "coloring page", "invitation", "logo design",
    "인테리어", "네일", "메이크업", "타투", "헤어", "레시피", "다이어트",
    "배경화면", "잠금화면", "코디", "청첩장", "손글씨",
]


def dhash(img: Image.Image, size: int = 8) -> int:
    g = img.convert("L").resize((size + 1, size), Image.LANCZOS)
    px = list(g.getdata())
    bits = 0
    for row in range(size):
        base = row * (size + 1)
        for col in range(size):
            bits = (bits << 1) | (px[base + col] < px[base + col + 1])
    return bits


def probe(row: dict) -> dict | None:
    """썸네일을 받아 크기·해시를 붙인다. 실패(죽은 링크)면 버린다."""
    try:
        req = urllib.request.Request(row["thumb_url"], headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read()
        img = Image.open(io.BytesIO(raw))
        return {**row, "width": img.width, "height": img.height, "_hash": dhash(img)}
    except Exception:
        return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="?", default=str(ROOT / "discovery-inbox" / "jjal-pinterest-2.json"))
    ap.add_argument("-o", "--out", default=str(ROOT / "discovery-inbox" / "jjal-filtered.json"))
    args = ap.parse_args()

    rows = json.loads(Path(args.src).read_text())
    print(f"입력 {len(rows)}개")

    # A. URL 중복 (크롤러가 이미 걸렀지만 파일을 합쳐 넣는 경우를 대비)
    uniq = {r["image_url"]: r for r in rows}
    rows = list(uniq.values())
    print(f"A. URL 중복 제거 → {len(rows)}")

    # D. alt 텍스트 프리필터 — 네트워크 쓰기 전에 먼저 쳐낸다
    rows = [r for r in rows if not any(b in (r.get("caption_en") or "").lower() for b in BLOCK)]
    print(f"D. alt 텍스트 프리필터 → {len(rows)}")

    # 썸네일 1패스: 크기 + 해시 (죽은 링크도 여기서 걸러진다)
    with ThreadPoolExecutor(max_workers=16) as ex:
        probed = [r for r in ex.map(probe, rows) if r]
    print(f"   썸네일 확보 → {len(probed)} (죽은 링크 {len(rows) - len(probed)}개 제외)")

    # C. 형태 필터
    def ok_shape(r):
        if min(r["width"], r["height"]) < MIN_SIDE:
            return False
        return RATIO_MIN <= r["height"] / r["width"] <= RATIO_MAX

    probed = [r for r in probed if ok_shape(r)]
    print(f"C. 형태 필터 → {len(probed)}")

    # B. 근사 중복 제거 — 같은 짤이 키워드마다 다른 URL로 잡히는 걸 잡는다.
    # 전수 비교는 수만 개에서 O(n²)로 못 쓴다. 64비트 해시를 8비트씩 8밴드로 쪼개
    # 같은 밴드를 공유하는 후보끼리만 비교한다 — 비둘기집 원리상 거리 7 이하면
    # 반드시 한 밴드가 일치하므로 HAMMING_MAX(=5)에선 전수 비교와 결과가 같다.
    kept: list[dict] = []
    buckets: dict[tuple[int, int], list[int]] = {}
    for r in probed:
        h = r["_hash"]
        bands = [(i, (h >> (i * 8)) & 0xFF) for i in range(8)]
        cand = {i for b in bands for i in buckets.get(b, ())}
        if any(bin(h ^ kept[i]["_hash"]).count("1") <= HAMMING_MAX for i in cand):
            continue
        for b in bands:
            buckets.setdefault(b, []).append(len(kept))
        kept.append(r)
    print(f"B. 근사 중복 제거 → {len(kept)}")

    for r in kept:
        r.pop("_hash", None)
    Path(args.out).write_text(json.dumps(kept, ensure_ascii=False, indent=1))
    print(f"완료 → {args.out} ({len(kept)}개, 통과율 {len(kept) / len(uniq) * 100:.1f}%)")


if __name__ == "__main__":
    main()
