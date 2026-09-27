#!/usr/bin/env python3
"""
AVA(Academy of Vocal Arts) 링크트리 + 공연 목록(avaopera.org/event) + 시즌 공연 페이지를 확인해서
새 공연을 content/performances.json 에 추가합니다.

- 공연 페이지에 준석이 이름(Jason Hwang / Junseok Hwang)이 있거나,
  AVA 준석이 개인 페이지(avaopera.org/artist/jason-hwang)에 연결된 공연이면 → 바로 공개 (published: true)
- 없으면 → 숨김 초안 (published: false). 관리자 화면에서 "공개" 체크하면 사이트에 표시됨
- 이미 있는 공연(같은 AVA 페이지, 또는 같은 날짜+제목)은 건드리지 않음.
  단, 자동으로 추가된 숨김 초안에 나중에 준석이 이름이 올라오면 자동으로 공개로 바꿈.

표준 라이브러리만 사용 (GitHub Actions 에서 바로 실행 가능).
결과 요약은 ava_sync_summary.md 로 저장 (새 공연이 있을 때만).
"""
import html
import json
import os
import re
import sys
import urllib.request
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PERF_FILE = os.path.join(ROOT, "content", "performances.json")
SUMMARY_FILE = os.path.join(ROOT, "ava_sync_summary.md")

LINKTREE = "https://linktr.ee/avaopera"
SEASON = "https://avaopera.org/event/?season=current"
EVENTS = "https://avaopera.org/event/"
ARTIST = "https://avaopera.org/artist/jason-hwang/"   # AVA 준석이 개인 페이지
NAME_RE = re.compile(r"\b(jason|junseok)\s+hwang\b", re.I)
UA = {"User-Agent": "Mozilla/5.0 (compatible; junseokhwang-site-sync/1.0)"}


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "ignore")


def event_urls():
    """링크트리 + 시즌 목록에서 AVA 공연 페이지 주소 모으기"""
    urls = set()
    try:
        lt = fetch(LINKTREE)
        m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', lt, re.S)
        if m:
            for link in json.loads(m.group(1))["props"]["pageProps"].get("links", []):
                u = (link.get("url") or "").split("?")[0].rstrip("/")
                if re.match(r"https://avaopera\.org/event/[a-z0-9-]+$", u):
                    urls.add(u)
    except Exception as e:  # 링크트리가 막혀도 시즌 목록으로 계속 진행
        print("linktree:", e, file=sys.stderr)
    for src in (SEASON, EVENTS):
        try:
            for u in re.findall(r"https://avaopera\.org/event/[a-z0-9-]+", fetch(src)):
                if not u.endswith("/feed"):
                    urls.add(u.rstrip("/"))
        except Exception as e:
            print(src, e, file=sys.stderr)
    return sorted(urls)


def artist_events():
    """준석이 AVA 개인 페이지에 연결된 공연 = 출연 확정"""
    try:
        return {u.rstrip("/") for u in re.findall(r"https://avaopera\.org/event/[a-z0-9-]+", fetch(ARTIST))}
    except Exception as e:
        print("artist:", e, file=sys.stderr)
        return set()


def text_of(s):
    s = re.sub(r"<(script|style|noscript)[^>]*>.*?</\1>", " ", s, flags=re.S)
    return html.unescape(re.sub(r"<[^>]+>", " ", s))


def parse_event(url):
    page = fetch(url + "/")
    t = re.search(r"<h2>(.*?)</h2>", page, re.S)
    title = html.unescape(re.sub(r"<[^>]+>", "", t.group(1))).strip() if t else ""
    shows = []
    for block in re.findall(r'<div class="date">(.*?)</div>', page, re.S):
        m = re.match(r"\s*\w+,\s+(\w+ \d{1,2}, \d{4})<br>\s*([\d:]+\s*[ap]m)(.*)", block, re.S | re.I)
        if not m:
            continue
        d = datetime.strptime(m.group(1), "%B %d, %Y").date()
        tm = datetime.strptime(m.group(2).replace(" ", "").lower(), "%I:%M%p").strftime("%H:%M")
        rest = m.group(3)
        tix = re.search(r'href="([^"]+)"[^>]*class="tix"', rest) or re.search(r'class="tix"[^>]*href="([^"]+)"', rest)
        parts = [p.strip() for p in text_of(rest).split("·")]
        venue = next((p for p in parts if p and "Get Tickets" not in p), "")
        shows.append({"date": d, "time": tm, "venue": venue, "ticket": html.unescape(tix.group(1)) if tix else ""})
    cast = bool(NAME_RE.search(text_of(page)))
    return title, shows, cast


def main():
    data = json.load(open(PERF_FILE, encoding="utf-8"))
    perfs = data.setdefault("performances", [])
    today = date.today()
    added, published = [], []

    confirmed = artist_events()
    for url in sorted(set(event_urls()) | confirmed):
        try:
            title, shows, cast = parse_event(url)
            cast = cast or url in confirmed
        except Exception as e:
            print("skip", url, e, file=sys.stderr)
            continue
        shows = [s for s in shows if s["date"] >= today]
        if not title or not shows:
            continue

        existing = next((p for p in perfs if p.get("source") == url), None)
        if existing is None:
            # 손으로 넣은 같은 공연(같은 날짜 + 제목)이 있으면 추가하지 않음
            dup = any(p.get("title", "").strip().lower() == title.lower() and p.get("date") in {s["date"].isoformat() for s in shows} for p in perfs)
            if dup:
                continue
        else:
            if existing.get("auto") and cast and existing.get("published") is False:
                existing["published"] = True
                published.append(existing)
            continue

        first, last = shows[0], shows[-1]
        venues = []
        for s in shows:
            if s["venue"] and s["venue"] not in venues:
                venues.append(s["venue"])
        entry = {
            "date": first["date"].isoformat(),
            "time": first["time"],
            "title": title,
            "role": "",
            "presenter": "Academy of Vocal Arts",
            "venue": venues[0] if venues else "",
            "city": "Philadelphia, PA" if (venues and "Academy of Vocal Arts" in venues[0]) else "",
                # 한 번 공연이고 AVA 자체 예매 링크면 바로 연결, 그 외(외부 예매 사이트·여러 날 공연)는 AVA 공연 페이지로 연결
            "ticketUrl": first["ticket"] if len(shows) == 1 and "my.avaopera.org" in first["ticket"] else url + "/",
            "note": "",
            "published": cast,
            "auto": True,
            "source": url,
        }
        if len(shows) > 1:
            entry["endDate"] = last["date"].isoformat()
            others = [v for v in venues[1:]]
            entry["note"] = f"{len(shows)} performances" + (f" · also at {', '.join(others)}" if others else "")
        perfs.append(entry)
        added.append(entry)

    if not added and not published:
        print("no changes")
        return

    json.dump(data, open(PERF_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    lines = ["AVA 공연 페이지에서 새 공연을 찾았어요.", ""]
    for e in added:
        state = "✅ 준석이 이름 확인 → 사이트에 바로 공개" if e["published"] else "📝 숨김 초안 (출연 확인 후 관리자 화면에서 '공개' 체크)"
        span = e["date"] + (f" ~ {e['endDate']}" if e.get("endDate") else "")
        lines.append(f"- **{e['title']}** · {span} · {e['venue']}  \n  {state}  \n  {e['source']}")
    for e in published:
        lines.append(f"- **{e['title']}** · {e['date']} — 출연진에 준석이 이름이 올라와서 공개로 바꿨어요.")
    lines += ["", "관리자 화면: https://app.pagescms.org → 공연 일정"]
    open(SUMMARY_FILE, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
