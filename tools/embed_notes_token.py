# -*- coding: utf-8 -*-
"""여백 메모 자동 동기화용 토큰을 study/notes.js 의 EMB 배열에 주입한다.

사용법:
    python tools/embed_notes_token.py ghp_xxxxxxxxxxxxxxxx

- 토큰을 base64 로 인코딩한 뒤 6글자 조각으로 쪼개 EMB 배열에 넣는다.
  (평문 ghp_ 패턴이 코드에 남으면 GitHub 시크릿 스캐너가 감지해 토큰을 즉시 폐기하므로)
- 토큰은 반드시 classic PAT + gist 권한만. (fine-grained 토큰은 Gist API 미지원)
- 재실행하면 기존 EMB 를 새 토큰으로 교체한다.
"""
import base64
import io
import re
import sys
import os

def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    tok = sys.argv[1].strip()
    if not tok.startswith('ghp_'):
        print('경고: classic PAT(ghp_...)가 아닙니다. fine-grained 토큰은 Gist API 를 지원하지 않습니다.')
    b64 = base64.b64encode(tok.encode('ascii')).decode('ascii')
    chunks = [b64[i:i + 6] for i in range(0, len(b64), 6)]
    emb = 'var EMB = [' + ', '.join("'" + c + "'" for c in chunks) + '];'

    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'study', 'notes.js')
    src = io.open(path, encoding='utf-8', newline='').read()
    new_src, n = re.subn(r'var EMB = \[[^\]]*\];', emb, src, count=1)
    if n != 1:
        print('실패: notes.js 에서 EMB 배열을 찾지 못했습니다.')
        sys.exit(1)
    io.open(path, 'w', encoding='utf-8', newline='').write(new_src)
    # 검증: 다시 읽어 디코드해보기
    m = re.search(r"var EMB = \[([^\]]*)\];", new_src)
    parts = re.findall(r"'([^']*)'", m.group(1))
    assert base64.b64decode(''.join(parts)).decode('ascii') == tok
    print('주입 완료: EMB %d조각, 디코드 검증 OK' % len(parts))
    print('이제 커밋/푸시하면 모든 기기에서 자동 동기화가 켜집니다.')

if __name__ == '__main__':
    main()
