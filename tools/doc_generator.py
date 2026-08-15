# -*- coding: utf-8 -*-
"""
MSH Portfolio 문서 생성기
=========================
일관된 스타일로 학습 문서를 생성하는 도구

사용법:
    python doc_generator.py --config config.json

또는 Python에서 직접:
    from doc_generator import DocGenerator
    gen = DocGenerator()
    gen.generate(config)
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime

# ============================================================
# 문서 스타일 가이드 (에이전트 지침)
# ============================================================
STYLE_GUIDE = """
## MSH Portfolio 문서 작성 가이드

### 1. 핵심 원칙
- 스캐폴딩 방식: 쉬운 것 → 어려운 것, 단계별 비계
- 인지적 델타 최소화: 한 번에 하나의 개념만
- Q&A 대화형: 질문으로 호기심 유발 → 답변으로 해소
- 코드보다 개념: 원리 이해가 먼저, 코드는 보조

### 2. 문서 구조
- Part 1~N: 주제를 작은 단위로 분할
- 각 Part는 하나의 핵심 질문을 다룸
- 마지막에 실전 가이드 + 핵심 정리

### 3. 컴포넌트 사용법
- .q (질문): 독자가 궁금해할 만한 질문
- .a (답변): 짧고 명확한 설명
- .diagram-box: ASCII 다이어그램으로 시각화
- .code-block: 코드 예시 (주석 필수)
- .compare-table: 비교 표
- .highlight: 핵심 키워드 강조 (파란색)
- .key-point: 중요 포인트 (녹색)
- .warning: 주의사항 (빨간색)
- .summary-box: 핵심 정리
- .warning-box: 주의사항 박스

### 4. 톤앤매너
- 반말 사용 ("~해", "~야", "~거든")
- 친근하고 쉬운 설명
- 비유와 예시 적극 활용
- 게임 서버 맥락으로 설명

### 5. 제목 작성법
- 질문형 또는 호기심 유발형
- 예: "서버 3대가 누가 리더야?를 정하는 법"
- 예: "왜 DB가 멈췄을까?"
"""


# ============================================================
# HTML 템플릿
# ============================================================
HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - MSH Portfolio</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fafafa; color: #333; line-height: 1.9; }}
        .container {{ max-width: 800px; margin: 0 auto; padding: 60px 20px; }}
        .back-link {{ display: inline-block; margin-bottom: 24px; color: #666; text-decoration: none; }}
        .back-link:hover {{ color: #111; }}
        .header {{ margin-bottom: 48px; }}
        .header h1 {{ font-size: 2rem; font-weight: 700; color: #111; margin-bottom: 12px; }}
        .header p {{ color: #666; font-size: 1.1rem; }}

        .conversation {{ background: white; border-radius: 16px; padding: 32px; margin: 32px 0; border: 1px solid #e0e0e0; }}
        .conversation h2 {{ font-size: 1.3rem; color: #1a237e; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #e8eaf6; }}

        .chat {{ margin-bottom: 20px; }}
        .q {{ background: #fff3e0; border-left: 4px solid #ff9800; padding: 16px 20px; margin: 16px 0; border-radius: 0 12px 12px 0; font-weight: 500; }}
        .q::before {{ content: "Q. "; color: #e65100; font-weight: 700; }}
        .a {{ padding: 8px 0 8px 20px; border-left: 4px solid #e0e0e0; margin: 12px 0; }}
        .a p {{ margin-bottom: 12px; }}
        .a p:last-child {{ margin-bottom: 0; }}

        .highlight {{ background: #e3f2fd; padding: 2px 8px; border-radius: 4px; font-weight: 600; color: #1565c0; }}
        .key-point {{ background: #c8e6c9; padding: 2px 8px; border-radius: 4px; font-weight: 600; color: #2e7d32; }}
        .warning {{ background: #ffcdd2; padding: 2px 8px; border-radius: 4px; font-weight: 600; color: #c62828; }}

        .code-block {{ background: #263238; border-radius: 8px; padding: 16px 20px; margin: 16px 0; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.9rem; color: #eceff1; overflow-x: auto; line-height: 1.6; white-space: pre-wrap; }}
        .code-block .comment {{ color: #78909c; }}
        .code-block .keyword {{ color: #82b1ff; }}
        .code-block .string {{ color: #c3e88d; }}
        .code-block .number {{ color: #f78c6c; }}

        .compare-table {{ width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.9rem; }}
        .compare-table th, .compare-table td {{ padding: 12px; border: 1px solid #e0e0e0; text-align: left; }}
        .compare-table th {{ background: #f5f5f5; font-weight: 600; }}
        .compare-table .good {{ background: #c8e6c9; }}
        .compare-table .bad {{ background: #ffcdd2; }}
        .compare-table .warn {{ background: #fff3e0; }}

        .diagram-box {{ background: #f5f5f5; border-radius: 12px; padding: 24px; margin: 16px 0; font-family: 'Consolas', monospace; font-size: 0.85rem; line-height: 1.8; overflow-x: auto; white-space: pre-wrap; }}

        .summary-box {{ background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); border-radius: 16px; padding: 32px; color: white; margin: 32px 0; }}
        .summary-box h3 {{ font-size: 1.2rem; margin-bottom: 20px; }}
        .summary-box ul {{ list-style: none; }}
        .summary-box li {{ padding: 8px 0; padding-left: 24px; position: relative; }}
        .summary-box li::before {{ content: "→"; position: absolute; left: 0; color: #90caf9; }}

        .warning-box {{ background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); border-radius: 16px; padding: 24px 32px; color: white; margin: 24px 0; }}
        .warning-box h4 {{ font-size: 1rem; margin-bottom: 12px; }}
        .warning-box p {{ opacity: 0.95; margin-bottom: 8px; }}
        .warning-box p:last-child {{ margin-bottom: 0; }}

        .info-box {{ background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); border-radius: 16px; padding: 24px 32px; color: white; margin: 24px 0; }}
        .info-box h4 {{ font-size: 1rem; margin-bottom: 12px; }}
        .info-box p {{ opacity: 0.95; margin-bottom: 8px; }}
        .info-box p:last-child {{ margin-bottom: 0; }}

        .nav-links {{ display: flex; justify-content: space-between; margin-top: 60px; padding-top: 24px; border-top: 1px solid #e0e0e0; }}
        .nav-links a {{ color: #1a237e; text-decoration: none; }}
        .nav-links a:hover {{ text-decoration: underline; }}
    </style>
{extra_head}
</head>
<body>
    <div class="container">
        <a href="{back_link}" class="back-link">← {back_text}</a>

        <header class="header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
        </header>

{content}

        <div class="nav-links">
            <a href="{prev_link}">{prev_text}</a>
            <a href="{next_link}">{next_text}</a>
        </div>
    </div>
    <script src="/MSH_Portfolio/study/notes.js"></script>
</body>
</html>
'''


# ============================================================
# 컴포넌트 빌더
# ============================================================
class ComponentBuilder:
    """HTML 컴포넌트 생성기"""

    @staticmethod
    def conversation(title: str, content: str) -> str:
        """Part 섹션 생성"""
        return f'''        <div class="conversation">
            <h2>{title}</h2>
{content}
        </div>
'''

    @staticmethod
    def chat_qa(question: str, answer: str) -> str:
        """Q&A 대화 생성"""
        # answer가 여러 줄이면 각각 <p> 태그로 감싸기
        answer_lines = answer.strip().split('\n')
        answer_html = '\n'.join(f'                    <p>{line.strip()}</p>' for line in answer_lines if line.strip())

        return f'''
            <div class="chat">
                <div class="q">{question}</div>
                <div class="a">
{answer_html}
                </div>
            </div>
'''

    @staticmethod
    def diagram(content: str) -> str:
        """다이어그램 박스 생성"""
        return f'''            <div class="diagram-box">{content}</div>
'''

    @staticmethod
    def code(content: str, language: str = "") -> str:
        """코드 블록 생성"""
        return f'''            <div class="code-block">{content}</div>
'''

    @staticmethod
    def raw(content: str) -> str:
        """원본 HTML 통과 (인터랙티브 위젯/애니메이션 컨테이너용)"""
        return f'''            {content}
'''

    @staticmethod
    def table(headers: List[str], rows: List[List[str]]) -> str:
        """비교 테이블 생성"""
        header_html = '\n'.join(f'                    <th>{h}</th>' for h in headers)

        rows_html = []
        for row in rows:
            cells = '\n'.join(f'                    <td>{cell}</td>' for cell in row)
            rows_html.append(f'''                <tr>
{cells}
                </tr>''')

        return f'''            <table class="compare-table">
                <tr>
{header_html}
                </tr>
{chr(10).join(rows_html)}
            </table>
'''

    @staticmethod
    def summary(title: str, items: List[str]) -> str:
        """핵심 정리 박스 생성"""
        items_html = '\n'.join(f'                <li>{item}</li>' for item in items)
        return f'''        <div class="summary-box">
            <h3>{title}</h3>
            <ul>
{items_html}
            </ul>
        </div>
'''

    @staticmethod
    def warning_box(title: str, items: List[str]) -> str:
        """경고 박스 생성"""
        items_html = '\n'.join(f'            <p>{item}</p>' for item in items)
        return f'''        <div class="warning-box">
            <h4>{title}</h4>
{items_html}
        </div>
'''

    @staticmethod
    def info_box(title: str, items: List[str]) -> str:
        """정보 박스 생성"""
        items_html = '\n'.join(f'            <p>{item}</p>' for item in items)
        return f'''        <div class="info-box">
            <h4>{title}</h4>
{items_html}
        </div>
'''


# ============================================================
# 문서 설정
# ============================================================
@dataclass
class DocConfig:
    """문서 설정"""
    slug: str                    # URL 슬러그 (폴더명)
    title: str                   # 문서 제목
    subtitle: str                # 부제목
    category: str                # 카테고리 (back link용)
    category_path: str           # 카테고리 경로
    prev_link: str = ""          # 이전 문서 링크
    prev_text: str = "← 이전"    # 이전 문서 텍스트
    next_link: str = ""          # 다음 문서 링크
    next_text: str = "다음 →"    # 다음 문서 텍스트
    extra_head: str = ""         # <head>에 주입할 추가 CSS/JS (인터랙티브 문서용)
    parts: List[Dict] = field(default_factory=list)  # 파트별 내용


# ============================================================
# 문서 생성기
# ============================================================
class DocGenerator:
    """MSH Portfolio 문서 생성기"""

    def __init__(self, base_path: str = None):
        if base_path is None:
            base_path = Path(__file__).parent.parent / "study"
        self.base_path = Path(base_path)
        self.component = ComponentBuilder()

    def generate(self, config: DocConfig) -> str:
        """설정을 기반으로 HTML 문서 생성"""

        # 콘텐츠 조립
        content_parts = []
        for part in config.parts:
            part_content = self._build_part(part)
            content_parts.append(part_content)

        content = '\n'.join(content_parts)

        # 템플릿 적용
        html = HTML_TEMPLATE.format(
            title=config.title,
            subtitle=config.subtitle,
            back_link=config.category_path,
            back_text=config.category,
            content=content,
            extra_head=config.extra_head,
            prev_link=config.prev_link or config.category_path,
            prev_text=config.prev_text,
            next_link=config.next_link or config.category_path,
            next_text=config.next_text
        )

        return html

    def _build_part(self, part: Dict) -> str:
        """파트 콘텐츠 빌드"""
        if part.get('type') == 'conversation':
            inner = []
            for item in part.get('items', []):
                inner.append(self._build_item(item))
            return self.component.conversation(part['title'], '\n'.join(inner))

        elif part.get('type') == 'summary':
            return self.component.summary(part['title'], part['items'])

        elif part.get('type') == 'warning_box':
            return self.component.warning_box(part['title'], part['items'])

        elif part.get('type') == 'info_box':
            return self.component.info_box(part['title'], part['items'])

        elif part.get('type') == 'raw_html':
            # Part 레벨에서도 원본 HTML 통과 (섹션 전체가 커스텀일 때)
            return self.component.raw(part['content'])

        return ''

    def _build_item(self, item: Dict) -> str:
        """아이템 빌드"""
        item_type = item.get('type', 'qa')

        if item_type == 'qa':
            return self.component.chat_qa(item['q'], item['a'])

        elif item_type == 'diagram':
            return self.component.diagram(item['content'])

        elif item_type == 'code':
            return self.component.code(item['content'], item.get('language', ''))

        elif item_type == 'raw_html':
            return self.component.raw(item['content'])

        elif item_type == 'table':
            return self.component.table(item['headers'], item['rows'])

        return ''

    def save(self, config: DocConfig, html: str = None) -> Path:
        """문서를 파일로 저장"""
        if html is None:
            html = self.generate(config)

        # 폴더 생성
        doc_path = self.base_path / config.slug
        doc_path.mkdir(parents=True, exist_ok=True)

        # 파일 저장
        file_path = doc_path / "index.html"
        file_path.write_text(html, encoding='utf-8')

        print(f"OK 생성 완료: {file_path}")
        return file_path

    def generate_from_json(self, json_path: str) -> Path:
        """JSON 파일에서 문서 생성"""
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        config = DocConfig(**data)
        return self.save(config)


# ============================================================
# 스타일 가이드 출력
# ============================================================
def print_style_guide():
    """스타일 가이드 출력"""
    print(STYLE_GUIDE)


# ============================================================
# 메인
# ============================================================
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='MSH Portfolio 문서 생성기')
    parser.add_argument('--config', type=str, help='JSON 설정 파일 경로')
    parser.add_argument('--guide', action='store_true', help='스타일 가이드 출력')

    args = parser.parse_args()

    if args.guide:
        print_style_guide()
    elif args.config:
        gen = DocGenerator()
        gen.generate_from_json(args.config)
    else:
        print("사용법:")
        print("  python doc_generator.py --config config.json")
        print("  python doc_generator.py --guide")
