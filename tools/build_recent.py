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


def git_last_dates():
    """study/**/index.html 의 '최종 커밋' 날짜+타임스탬프(KST).
    파일 mtime 은 git checkout/pull 이 건드리므로, 실제 내용 변경(커밋)만 반영하려면 이 값을 쓴다."""
    res = {}
    try:
        out = subprocess.run(
            ["git", "log", "--name-only", "--format=@%aI"],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace",
        ).stdout
    except Exception as e:
        sys.stderr.write("git log 실패: %s\n" % e)
        return res
    cur = None
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("@"):
            cur = line[1:]
            continue
        if line.endswith("/index.html") and line.startswith("study/") and cur:
            path = line.replace("\\", "/")
            if path in res:  # 최신->과거 순회: 처음 본 것 = 가장 최근 커밋
                continue
            try:
                dt = datetime.fromisoformat(cur).astimezone(KST)
                res[path] = (dt.strftime("%Y-%m-%d"), dt.timestamp())
            except ValueError:
                pass
    return res


def dirty_paths():
    """작업 트리에서 아직 커밋되지 않은(수정/추가/신규) study index.html 집합. = "지금 편집 중"."""
    s = set()
    try:
        out = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace",
        ).stdout
    except Exception:
        return s
    for line in out.splitlines():
        pth = line[3:].strip().replace("\\", "/")
        if " -> " in pth:  # rename "old -> new"
            pth = pth.split(" -> ", 1)[1]
        if pth.endswith("/index.html") and pth.startswith("study/"):
            s.add(pth)
    return s


def mtime_date(path):
    full = os.path.join(ROOT, path)
    if os.path.exists(full):
        return datetime.fromtimestamp(os.path.getmtime(full), KST).strftime("%Y-%m-%d")
    return None


def main():
    docs = json.load(open(INDEX, encoding="utf-8"))
    lasts = git_last_dates()
    dirty = dirty_paths()
    now = datetime.now(KST)
    today_str = now.strftime("%Y-%m-%d")
    now_ts = now.timestamp()
    rows = []
    for d in docs:
        url = d.get("url", "")
        slug = url.strip("/").split("/")[-1]
        if slug in EXCLUDE_SLUGS or slug.startswith("category-"):
            continue
        # UE 네트워크 책: 개별 챕터(ch-NN-*)는 타임라인 제외 — 허브(uenet-book/) 1개만 노출(검색엔 남음)
        if "uenet-book/ch-" in ("/" + url):
            continue
        path = url_to_path(url)
        # 날짜 = git 최종 커밋일(실제 내용 변경 시점). 아직 커밋 전(작업트리 변경)이면 오늘.
        # mtime 은 git checkout/pull 이 리셋하므로 단독 사용 금지(안 바꾼 문서가 가짜 NEW 로 뜸).
        if path in dirty:
            date, _ts = today_str, now_ts
        elif path in lasts:
            date, _ts = lasts[path]
        else:
            date = mtime_date(path) or "1970-01-01"
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
