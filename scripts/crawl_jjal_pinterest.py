#!/usr/bin/env python3
"""핀터레스트 검색 결과에서 짤 후보를 수집한다 (docs/jjal-crawl-plan.md Phase A).

이미지는 내려받지 않는다 — 재호스팅 금지 원칙(jjal-archive-plan.md 3장)에 따라
pinimg 직링크와 메타데이터만 스테이징 JSON에 쌓는다.

2026-07-21 실측으로 확인한 두 가지 때문에 Playwright 세션을 유지하며 긁는다:
  1) mouse.wheel은 먹지 않는다 — 로그인 게이트 dialog가 이벤트를 가로채 scrollY가 0에 머문다.
     evaluate('scrollBy')로는 정상 스크롤된다.
  2) 핀터레스트는 DOM을 가상화해 지나간 핀을 지운다 — 스크롤할 때마다 증분 수집해야 한다.
     (기존 --dump-dom 단일 스냅샷이 키워드당 87개에서 멈추던 원인)

사용: python3 scripts/crawl_jjal_pinterest.py [-n 스크롤수] [키워드 ...]
출력: discovery-inbox/jjal-pinterest-2.json (키워드마다 중간 저장 — 끊겨도 이어서 실행 가능)
"""
import argparse
import json
import time
import urllib.parse
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "discovery-inbox"
OUT = INBOX / "jjal-pinterest-2.json"
PREV = INBOX / "jjal-pinterest.json"  # 1차 수집분 — 재수집 방지용으로 seen에 넣는다

SCROLL_PX = 4000
SETTLE_MS = 1500
DRY_ROUNDS = 4  # 신규 0이 이만큼 연속되면 그 키워드는 바닥난 것으로 본다

# 스크롤마다 화면에 살아있는 핀 이미지를 통째로 걷어온다. alt는 판정 프리필터에 쓴다.
HARVEST_JS = """() => Array.from(document.querySelectorAll('img[srcset]'))
  .map(e => [e.srcset.split(' ')[0], e.alt || ''])
  .filter(([u]) => u.includes('/236x/'))"""


def load_seen() -> set[str]:
    seen = set()
    for f in (PREV, OUT):
        if f.exists():
            seen |= {p["image_url"] for p in json.loads(f.read_text())}
    return seen


def crawl_keyword(page, keyword: str, scrolls: int, seen: set[str]) -> list[dict]:
    url = "https://www.pinterest.com/search/pins/?q=" + urllib.parse.quote(keyword)
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(5000)

    found: dict[str, str] = {}
    dry = 0
    for _ in range(scrolls):
        before = len(found)
        for thumb, alt in page.evaluate(HARVEST_JS):
            found.setdefault(thumb, alt.strip())
        dry = dry + 1 if len(found) == before else 0
        if dry >= DRY_ROUNDS:
            break
        page.evaluate(f"scrollBy(0,{SCROLL_PX})")
        page.wait_for_timeout(SETTLE_MS)

    rows = []
    for thumb, alt in found.items():
        if thumb in seen:
            continue
        seen.add(thumb)
        rows.append({
            "keyword": keyword,
            # originals는 원본 확장자가 다르면(png/gif) 403이 난다. 736x는 항상 존재
            "image_url": thumb.replace("/236x/", "/736x/"),
            "thumb_url": thumb,
            "caption_en": alt,
        })
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", "--scrolls", type=int, default=100)
    ap.add_argument("keywords", nargs="+")
    args = ap.parse_args()

    seen = load_seen()
    rows = json.loads(OUT.read_text()) if OUT.exists() else []
    print(f"기존 누적 {len(rows)}개 / 중복 제외 대상 {len(seen)}개")

    INBOX.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1280, "height": 1600})
        for kw in args.keywords:
            t0 = time.time()
            try:
                fresh = crawl_keyword(page, kw, args.scrolls, seen)
            except Exception as e:  # 한 키워드 실패로 전체를 잃지 않는다
                print(f"{kw}: 실패 — {str(e)[:120]}")
                continue
            rows.extend(fresh)
            OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1))
            print(f"{kw}: 신규 {len(fresh)}개 (누적 {len(rows)}, {time.time() - t0:.0f}s)")
            time.sleep(3)  # 예의상 간격
        browser.close()
    print(f"완료 → {OUT} (누적 {len(rows)}개)")


if __name__ == "__main__":
    main()
