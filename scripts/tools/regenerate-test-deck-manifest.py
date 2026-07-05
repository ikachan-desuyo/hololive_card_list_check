#!/usr/bin/env python3
"""battle_simulator_v2/test_deck/ の *.json からデッキ選択画面用の manifest.json を再生成する。

デッキファイルを追加/削除/改名したら実行する:
    python scripts/tools/regenerate-test-deck-manifest.py

ファイル名のバイト（NFD/特殊ダッシュ等）をそのまま保持するため、アプリの fetch と一致する。
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DECK_DIR = os.path.join(ROOT, 'battle_simulator_v2', 'test_deck')


def main():
    names = []
    for f in os.listdir(DECK_DIR):
        if f.endswith('.json') and f != 'manifest.json':
            names.append(f[:-5])  # 拡張子を除く（ファイル名の正確なバイトを保持）
    names.sort()
    out = os.path.join(DECK_DIR, 'manifest.json')
    with open(out, 'w', encoding='utf-8') as fp:
        json.dump(names, fp, ensure_ascii=False, indent=2)
    sys.stdout.reconfigure(encoding='utf-8')
    print(f'manifest.json を再生成: {len(names)} 件')
    for n in names:
        print(' -', n)


if __name__ == '__main__':
    main()
