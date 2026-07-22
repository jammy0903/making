#!/usr/bin/env python3
"""KEEP된 짤의 핀 상세페이지에서 연관 핀("More like this")을 긁는다.
(docs/jjal-crawl-plan.md ③ 연관 핀 그래프)

이미 웃기다고 판정된 핀에서만 뻗으므로 적중률이 키워드 검색보다 높다.
시드는 DB `jjals.source_url`(핀터레스트 pin URL)에서 가져온다 — 별도 저장 없이도
2차 크롤로 적재한 3천여 건이 전부 시드가 된다.

이미지는 내려받지 않는다 — 재호스팅 금지 원칙(jjal-archive-plan.md 3장) 유지.

사용: python3 scripts/crawl_jjal_related.py [-n 시드수] [--hops 1]
출력: discovery-inbox/jjal-related.json (중간 저장, 이어서 실행 가능)
"""
import argparse
import json
import os
import random
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "discovery-inbox"
OUT = INBOX / "jjal-related.json"

load_dotenv(ROOT / ".env")
SB = os.environ["PUBLIC_SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

SETTLE_MS = 1500
HARVEST_JS = """() => Array.from(document.querySelectorAll('img[srcset]'))
  .map(e => {
    const a = e.closest('a[href^="/pin/"]');
    return [e.srcset.split(' ')[0], e.alt || '', a ? a.getAttribute('href') : null];
  })
  .filter(([u]) => u.includes('/236x/'))"""


def fetch_seed_pins(limit: int, keyword: str | None) -> list[str]:
    req = urllib.request.Request(
        f"{SB}/rest/v1/jjals?select=image_url,source_url&source=eq.external&source_url=not.is.null&limit=5000",
        headers={"apikey": KEY, "authorization": f"Bearer {KEY}"},
    )
    rows = json.loads(urllib.request.urlopen(req).read())
    if keyword:
        # source_url은 1차 크롤(860건)에만 있음 — image_url로 원본 키워드와 조인한다
        pin1 = json.loads((INBOX / "jjal-pinterest.json").read_text())
        kw_by_url = {p["image_url"]: p["keyword"] for p in pin1}
        rows = [r for r in rows if kw_by_url.get(r["image_url"]) == keyword]
    urls = list({r["source_url"] for r in rows if r.get("source_url")})
    random.shuffle(urls)
    return urls[:limit]


def load_seen() -> set[str]:
    seen = set()
    for name in ("jjal-pinterest.json", "jjal-pinterest-2.json", "jjal-related.json"):
        f = INBOX / name
        if f.exists():
            seen |= {p["image_url"] for p in json.loads(f.read_text())}
    return seen


def crawl_pin(page, pin_url: str, seen: set[str]) -> list[dict]:
    page.goto(pin_url, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(SETTLE_MS)
    page.evaluate("scrollBy(0,1200)")  # "More like this"는 본문 아래에 있음
    page.wait_for_timeout(SETTLE_MS)

    rows = []
    for thumb, alt, href in page.evaluate(HARVEST_JS):
        if thumb in seen:
            continue
        seen.add(thumb)
        rows.append({
            "keyword": "related:" + pin_url.rstrip("/").rsplit("/", 1)[-1],
            "image_url": thumb.replace("/236x/", "/736x/"),
            "thumb_url": thumb,
            "caption_en": alt.strip(),
            "source_url": ("https://www.pinterest.com" + href) if href else None,
        })
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", "--num-seeds", type=int, default=30)
    ap.add_argument("--keyword", default=None, help="이 키워드로 수집된 핀만 시드로 사용")
    args = ap.parse_args()

    seen = load_seen()
    rows = json.loads(OUT.read_text()) if OUT.exists() else []
    seeds = fetch_seed_pins(args.num_seeds, args.keyword)
    print(f"시드 핀 {len(seeds)}개, 기존 누적 {len(rows)}개, 중복 제외 대상 {len(seen)}개")

    INBOX.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1280, "height": 1600})
        for i, pin_url in enumerate(seeds, 1):
            try:
                fresh = crawl_pin(page, pin_url, seen)
            except Exception as e:
                print(f"[{i}/{len(seeds)}] {pin_url}: 실패 — {str(e)[:120]}")
                continue
            rows.extend(fresh)
            OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1))
            print(f"[{i}/{len(seeds)}] {pin_url}: 신규 {len(fresh)}개 (누적 {len(rows)})")
        browser.close()
    print(f"완료 → {OUT} (누적 {len(rows)}개)")


if __name__ == "__main__":
    main()
