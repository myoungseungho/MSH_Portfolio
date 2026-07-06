# -*- coding: utf-8 -*-
"""
recent.json 생성기 — 메인 페이지 '최신순' 타임라인 뷰용.

search-index.json 의 모든 문서에 '업로드 날짜'를 붙여 날짜 내림차순으로 정렬한
가벼운 목록(recent.json)을 만든다. 날짜는 git 최초 add 커밋 날짜(=업로드 시점),
git 이력이 없으면(아직 커밋 안 된 신규 문서) 파일 mtime 으로 폴백한다.

사용: python tools/build_recent.py
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "search-index.json")
OUT = os.path.join(ROOT, "recent.json")
KST = timezone(timedelta(hours=9))

# 타임라인에서 제외할 목록/랜딩 페이지 (콘텐츠 문서가 아님)
EXCLUDE_SLUGS = {
    "ai", "network", "devops", "career", "common",
}


def url_to_path(url):
    # "study/slug/" -> "study/slug/index.html"
    u = url.strip("/")
    return u + "/index.html"


def git_add_dates():
    """study/**/index.html 의 최초 add 날짜(YYYY-MM-DD, KST)를 한 번의 git log 로 수집."""
    dates = {}
    try:
        out = subprocess.run(
            ["git", "log", "--diff-filter=A", "--name-only", "--format=@%aI"],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace",
        ).stdout
    except Exception as e:
        sys.stderr.write("git log 실패: %s\n" % e)
        return dates
    cur = None
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("@"):
            cur = line[1:]
            continue
        if line.endswith("/index.html") and line.startswith("study/") and cur:
            # 최신->과거 순회: 매번 덮어쓰면 최종값 = 가장 오래된 add = 업로드 시점
            try:
                dt = datetime.fromisoformat(cur).astimezone(KST)
                dates[line.replace("\\", "/")] = dt.strftime("%Y-%m-%d")
            except ValueError:
                pass
    return dates


def mtime_date(path):
    full = os.path.join(ROOT, path)
    if os.path.exists(full):
        return datetime.fromtimestamp(os.path.getmtime(full), KST).strftime("%Y-%m-%d")
    return None


def main():
    docs = json.load(open(INDEX, encoding="utf-8"))
    gdates = git_add_dates()
    rows = []
    for d in docs:
        url = d.get("url", "")
        slug = url.strip("/").split("/")[-1]
        if slug in EXCLUDE_SLUGS or slug.startswith("category-"):
            continue
        path = url_to_path(url)
        # 최초 업로드일과 파일 최종수정일 중 더 최신 = "수정하면 최신순에 반영"
        _cands = [x for x in (gdates.get(path), mtime_date(path)) if x]
        date = max(_cands) if _cands else "1970-01-01"
        _full = os.path.join(ROOT, path)
        _ts = os.path.getmtime(_full) if os.path.exists(_full) else 0.0
        rows.append({
            "title": d.get("title", slug),
            "url": url,
            "category": d.get("category", ""),
            "date": date,
            "_ts": _ts,
        })
    # 날짜 내림차순(최신 먼저), 같은 날짜는 실제 수정시각(mtime) 최신 먼저
    rows.sort(key=lambda r: (r["date"], r["_ts"]), reverse=True)
    for r in rows:
        r.pop("_ts", None)
    json.dump(rows, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    sys.stdout.reconfigure(encoding="utf-8")
    print("recent.json 생성: %d건, 최신 = %s (%s)" % (
        len(rows), rows[0]["date"] if rows else "-", rows[0]["title"] if rows else "-"))


if __name__ == "__main__":
    main()
