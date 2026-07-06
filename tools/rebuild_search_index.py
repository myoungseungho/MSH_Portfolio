# -*- coding: utf-8 -*-
"""
search-index.json 전체 재생성기
================================
사이트의 모든 문서(study/**/*.html)를 스캔해서 제목 + 카테고리 + 본문 전문(full-text)을
검색 인덱스로 재구축한다. 기존 인덱스의 수작업 키워드(curated content)는 본문 앞에 병합되어
보존된다 — 한 번 다듬은 검색 키워드는 재생성해도 사라지지 않는다.

사용법:
    python tools/rebuild_search_index.py            # 재생성 + 저장
    python tools/rebuild_search_index.py --check    # 누락만 점검 (저장 안 함)

새 문서를 추가했으면 커밋 전에 한 번 실행하면 끝.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "search-index.json"
CONTENT_CAP = 40000          # 문서당 본문 상한 (사실상 무제한, 비정상 거대 문서 방어용)
CURATED_MAX = 2000           # 병합 보존할 기존 수작업 키워드 길이 상한

# 검색 결과로 띄울 가치가 없는 페이지 (데모 보조 페이지 등은 본문이 있으면 포함됨)
EXCLUDE_PATTERNS = [
    r"/assets/",
    r"/node_modules/",
]


def strip_html(s: str) -> str:
    s = re.sub(r"<script[\s\S]*?</script>", " ", s, flags=re.I)
    s = re.sub(r"<style[\s\S]*?</style>", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&[a-z]+;|&#\d+;", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def extract(path: Path):
    """HTML에서 (title, category, full_text) 추출"""
    s = path.read_text(encoding="utf-8", errors="ignore")

    m = re.search(r"<h1[^>]*>([\s\S]*?)</h1>", s)
    title = strip_html(m.group(1)) if m else ""

    category = ""
    mt = re.search(r"<title>([^<]*)</title>", s)
    if mt:
        parts = [x.strip() for x in mt.group(1).split(" - ")]
        if not title and parts:
            title = parts[0]
        if len(parts) >= 3:
            category = parts[1]
    if not category:
        mb = re.search(r'class="back-link"[^>]*>\s*(?:&larr;|←)?\s*([^<]+)', s)
        if mb:
            category = mb.group(1).strip()

    body = strip_html(s)
    # 흔한 보일러플레이트 제거
    body = re.sub(r"^-?\s*MSH Portfolio\s*", "", body)
    body = re.sub(r"^(←\s*)?(메인으로|목록으로|목록|뒤로)\s*", "", body)
    if title and body.startswith(title):
        body = body[len(title):].strip()
    return title, category, body[:CONTENT_CAP]


def normalize_category(category: str, url: str) -> str:
    if category in ("메인으로", "목록", "목록으로", ""):
        if url.startswith("study/cpp-modern/"):
            return "언어"
        if url.startswith("study/ux/"):
            return "UI/UX"
        return "학습"
    return category


def page_url(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    if rel.endswith("index.html"):
        return rel[: -len("index.html")]  # study/foo/ 형태
    return rel


def main():
    check_only = "--check" in sys.argv

    # 기존 인덱스에서 수작업 키워드 보존용 매핑
    curated = {}
    if INDEX.exists():
        for e in json.loads(INDEX.read_text(encoding="utf-8")):
            u = re.sub(r"^\./", "", e.get("url", "").strip())
            curated[u] = e

    entries, skipped = [], []
    for path in sorted(ROOT.glob("study/**/*.html")):
        rel = path.relative_to(ROOT).as_posix()
        if any(re.search(p, "/" + rel) for p in EXCLUDE_PATTERNS):
            continue
        if 'http-equiv="refresh"' in path.read_text(encoding="utf-8", errors="ignore").lower():
            skipped.append((rel, "redirect"))
            continue
        title, category, body = extract(path)
        url = page_url(path)
        if not title or len(body) < 80:
            skipped.append((rel, len(body)))
            continue

        old = curated.get(url)
        if old and old.get("title") == title:  # 제목 동일=미변경만 수작업 보존, 바뀌면 리뉴얼로 보고 fresh 사용
            title = old.get("title") or title          # 수작업 제목 우선
            category = old.get("category") or category
            head = (old.get("content") or "")[:CURATED_MAX]
            # 수작업 키워드 + 본문 전문 병합 (중복은 검색에 무해)
            body = (head + " " + body)[:CONTENT_CAP]
        category = normalize_category(category, url)
        entries.append({"title": title, "url": url, "category": category, "content": body})

    entries.sort(key=lambda e: e["url"])

    # 리포트
    new_urls = {e["url"] for e in entries}
    lost = [u for u in curated if u not in new_urls]
    print(f"문서 스캔: {len(entries)}건 인덱싱 / 스킵 {len(skipped)}건 (본문 80자 미만)")
    for s_ in skipped:
        print(f"  - 스킵: {s_[0]} ({s_[1]}자)")
    if lost:
        print(f"  ! 기존 인덱스에 있었으나 이번 스캔에 없는 URL {len(lost)}건 (삭제된 문서?):")
        for u in lost[:10]:
            print(f"    - {u}")

    if check_only:
        missing = [e["url"] for e in entries if e["url"] not in curated]
        print(f"--check: 신규(미등록) {len(missing)}건")
        for u in missing[:20]:
            print(f"  + {u}")
        return

    INDEX.write_text(json.dumps(entries, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    # 최신순 타임라인용 recent.json 동반 생성 (메인 페이지 뷰 토글) — 아래 print 가 cp949 에서 죽어도 먼저 실행
    try:
        import subprocess, sys as _sys
        subprocess.run([_sys.executable, str(Path(__file__).parent / "build_recent.py")], check=False)
    except Exception as _e:
        print(f"  ! recent.json 생성 건너뜀: {_e}")
    size_kb = INDEX.stat().st_size // 1024
    print(f"저장 완료: {INDEX.name} - {len(entries)}건, {size_kb}KB")


if __name__ == "__main__":
    main()
