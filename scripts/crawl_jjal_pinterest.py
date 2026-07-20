#!/usr/bin/env python3
"""핀터레스트 검색 결과에서 짤 후보를 수집한다.

비로그인 SSR에 결과가 없고 내부 API는 403이라, headless chromium으로 렌더링한
DOM에서 핀을 긁는다. 이미지는 내려받지 않는다 — 재호스팅 금지 원칙(jjal-archive-plan.md 3장)에
따라 pinimg 직링크와 메타데이터만 모아 스테이징 JSON에 쌓는다.

사용: python3 scripts/crawl_jjal_pinterest.py [키워드 ...]
출력: discovery-inbox/jjal-pinterest.json (재실행 시 병합·중복 제거)
"""
import json
import re
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "discovery-inbox" / "jjal-pinterest.json"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126 Safari/537.36")

DEFAULT_KEYWORDS = [
    "웃긴 짤", "웃긴 사진", "개웃긴 짤", "유머 짤", "웃긴 밈",
    "고양이 밈", "강아지 짤", "리액션 짤", "웃긴 동물 짤", "한국 밈",
]

IMG_RE = re.compile(r'<img[^>]*alt="([^"]*)"[^>]*srcset="([^"]*)"[^>]*>')
PIN_RE = re.compile(r'href="/pin/(\d+)/?"')


def render(keyword: str) -> str:
    url = "https://www.pinterest.com/search/pins/?q=" + urllib.parse.quote(keyword)
    r = subprocess.run(
        ["chromium", "--headless=new", "--no-sandbox", "--disable-gpu",
         "--virtual-time-budget=15000", "--window-size=1280,4000",
         f"--user-agent={UA}", "--dump-dom", url],
        capture_output=True, text=True, timeout=120,
    )
    return r.stdout


def parse(html: str, keyword: str) -> list[dict]:
    pins = []
    # 핀 링크 위치와 이미지 위치를 짝지어야 하므로, /pin/ 링크 기준으로 문서를 쪼갠다
    chunks = re.split(r'(href="/pin/\d+/?")', html)
    current_pin = None
    for chunk in chunks:
        m = PIN_RE.search(chunk)
        if m:
            current_pin = m.group(1)
            continue
        for alt, srcset in IMG_RE.findall(chunk):
            if "/236x/" not in srcset:
                continue  # 아바타 등 핀 이미지가 아님
            thumb = srcset.split(" ")[0]
            # originals는 원본 확장자가 다르면(png/gif) 403이 난다. 736x는 항상 존재
            orig = thumb.replace("/236x/", "/736x/")
            pins.append({
                "keyword": keyword,
                "pin_id": current_pin,
                "image_url": orig,
                "thumb_url": thumb,
                "caption_en": alt.strip(),
                "source_url": f"https://www.pinterest.com/pin/{current_pin}/" if current_pin else None,
            })
    return pins


def main() -> None:
    keywords = sys.argv[1:] or DEFAULT_KEYWORDS
    existing = json.loads(OUT.read_text()) if OUT.exists() else []
    # pinimg 경로의 해시 부분이 이미지 고유 키
    seen = {p["image_url"] for p in existing}
    added = 0
    for kw in keywords:
        html = render(kw)
        found = parse(html, kw)
        fresh = [p for p in found if p["image_url"] not in seen]
        for p in fresh:
            seen.add(p["image_url"])
        existing.extend(fresh)
        added += len(fresh)
        print(f"{kw}: {len(found)}개 발견, {len(fresh)}개 신규")
        time.sleep(3)  # 예의상 간격
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(existing, ensure_ascii=False, indent=1))
    print(f"총 {added}개 추가 → {OUT} (누적 {len(existing)}개)")


if __name__ == "__main__":
    main()
