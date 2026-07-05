# -*- coding: utf-8 -*-
"""
カード効果テキストのパターン分析

json_file/card_data.json の全効果テキスト（ブルーム/コラボ/ギフト、サポート効果、
アーツ効果、推しスキル）を定型パターンに分類し、
「汎用実装で自動化できる割合」と「手書きが必要な複雑カード」を可視化する。

使い方: python scripts/tools/analyze-effect-patterns.py [--unmatched N]
  --unmatched N : 未分類テキストの頻出上位Nを表示（既定10）
"""
import json
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

# 定型パターン（完全一致 or 構成要素として認識できるもの）
# 順序に意味あり: 先にマッチしたものを採用
PATTERNS = [
    # ドロー系
    ('draw', r'自分のデッキを[0-9０-９]+枚引く。?'),
    ('draw_up_to', r'自分のデッキを[0-9０-９]+枚まで引く。?'),
    # サーチ系（デッキから公開して手札/ステージ/付ける + シャッフル）
    ('search_to_hand', r'自分のデッキから、?[^。]*?を?[0-9０-９]+枚(まで)?公開し、?手札に加える。そしてデッキをシャッフルする。?'),
    ('search_to_stage', r'自分のデッキから、?[^。]*?[0-9０-９]+枚を?公開し、?ステージに出す。そしてデッキをシャッフルする。?'),
    ('search_attach', r'自分のデッキから、?[^。]*?[0-9０-９]+枚を?公開し、?[^。]*?に付ける。そしてデッキをシャッフルする。?'),
    # デッキの上を見る系
    ('look_top', r'自分のデッキの上から[0-9０-９]+枚を見る。'),
    ('rest_to_bottom', r'(そして)?残ったカードを好きな順でデッキの下に戻す。?'),
    # エール操作系
    ('cheer_from_cheerdeck_top', r'自分のエールデッキの上から[0-9０-９]+枚を、?[^。]*?に送る。?'),
    ('cheer_from_cheerdeck_search', r'自分のエールデッキから、?[^。]*?[0-9０-９]+枚を?公開し、?[^。]*?に送る。そしてエールデッキをシャッフルする。?'),
    ('cheer_from_archive', r'自分のアーカイブの[^。]*?[0-9０-９]+枚(ずつ)?を、?[^。]*?に送(る|れる)。?'),
    ('cheer_move', r'自分のステージのエール[0-9０-９]+枚を、?[^。]*?に付け替え(る|られる)。?'),
    # ダメージ系
    ('special_damage', r'相手の[^。]*?[0-9０-９]+人に特殊ダメージ[0-9０-９]+(を与える)?。?(ただし、ダウンしても相手のライフは減らない。?)?'),
    ('arts_plus_cond', r'[^。]*?(時|なら|につき)、?このアーツ\+[0-9０-９]+。?'),
    ('arts_plus_all', r'[^。]*?の?アーツ\+[0-9０-９]+。?'),
    # 回復・HP系
    ('heal', r'[^。]*?のHP[0-9０-９]+回復(する)?。?'),
    ('heal_all', r'[^。]*?のHPすべて回復(する)?。?'),
    ('hp_plus', r'[^。]*?のHP\+[0-9０-９]+。?'),
    # 装着系の常時テキスト
    ('attach_limit_note', r'(ツール|マスコット|ファン)は、自分のホロメン[0-9０-９]+人につき[0-9０-９]+枚(だけ|まで)?付けられる。?'),
    ('fan_attach_rule', r'このファンは、自分の[^。]+?だけに付けられ、[0-9０-９]+人につき何枚でも付けられる。?'),
    ('ability_add', r'◆[^。]+?に付いていたら能力追加'),
    # 手札・アーカイブ操作
    ('hand_to_deck_all', r'自分の手札すべてをデッキに戻してシャッフルする。?'),
    ('archive_from_hand', r'手札[0-9０-９]+枚をアーカイブする。?'),
    ('hand_to_deck_bottom', r'(自分の)?手札の[^。]*?[0-9０-９]+枚を公開し、?デッキの下に戻す。?'),
    # サイコロ
    ('dice', r'サイコロを[0-9０-９]+回振る'),
    ('dice_cond', r'[0-9０-９](か[0-9０-９])*の時、'),
    # 交代・移動
    ('swap_opp', r'相手の[^。]*?と[^。]*?[0-9０-９]+人を交代させる。?'),
    ('swap_own', r'自分の[^。]*?と[^。]*?を交代(する|させる|できる)。?'),
    # 使用条件
    ('use_cond_hand', r'このカードは、自分の手札がこのカードを含まずに[0-9０-９]+枚(以上|以下)([^。]*)?なければ使えない。?'),
    ('limited_note', r'LIMITED：ターンに[0-9０-９]+枚しか使えない。?'),
    # アーカイブコスト
    ('cost_archive_cheer', r'この(ホロメン|カード)のエール[0-9０-９]+枚をアーカイブできる：'),
    # ホロパワー
    ('holopower_note', r'\[ホロパワー：?[-－]?[0-9０-９X]+(消費)?\]'),
    ('once_note', r'\[(ターン|ゲーム)に[0-9０-９]+回\]'),
]

COMPILED = [(name, re.compile(rx)) for name, rx in PATTERNS]


def strip_known(text):
    """テキストから既知パターンを取り除き、残りと使用パターンを返す"""
    used = []
    rest = text
    changed = True
    while changed:
        changed = False
        for name, rx in COMPILED:
            m = rx.search(rest)
            if m:
                used.append(name)
                rest = (rest[:m.start()] + rest[m.end():])
                changed = True
    # 記号・空白・接続詞だけが残ったら「完全分解」とみなす
    residue = re.sub(r'[\s。、：…・「」〈〉（）()0-9０-９+＋\-－/／]+', '', rest)
    residue = re.sub(r'(その後|そして|さらに|また|この時|その場合|時に使える|できる|する|を|に|は|の|が|で)+', '', residue)
    return used, rest.strip(), residue


def main():
    top_n = 10
    if '--unmatched' in sys.argv:
        top_n = int(sys.argv[sys.argv.index('--unmatched') + 1])

    data = json.load(open(r'g:\git_work\hololive_card_list_check\json_file\card_data.json', encoding='utf-8'))

    seen = set()
    full, partial, manual, no_effect = [], [], [], []
    pattern_counts = Counter()
    unmatched_texts = Counter()

    for cid, c in data.items():
        num = c.get('number') or cid.split('_')[0]
        if num in seen:
            continue
        seen.add(num)

        texts = []
        for s in c.get('skills', []):
            t = s.get('type', '')
            body = s.get('description') or s.get('text') or (s.get('name') if t == 'サポート効果' else '') or ''
            if t in ('キーワード', 'サポート効果', '推しスキル', 'SP推しスキル') and body:
                texts.append(body)
            elif t == 'アーツ' and s.get('description'):
                texts.append(s['description'])

        if not texts:
            no_effect.append(num)
            continue

        card_full = True
        card_any = False
        for text in texts:
            used, rest, residue = strip_known(text)
            for u in used:
                pattern_counts[u] += 1
            if used:
                card_any = True
            if residue:  # 分解しきれない部分が残った
                card_full = False
                # 未分類部分の先頭40文字を集計
                unmatched_texts[rest[:40]] += 1

        if card_full:
            full.append(num)
        elif card_any:
            partial.append(num)
        else:
            manual.append(num)

    total = len(full) + len(partial) + len(manual)
    print(f'効果を持つユニークカード: {total}種')
    print(f'  ✅ 完全に定型パターンで分解可能: {len(full)}種 ({len(full)*100//total}%)')
    print(f'  🔶 一部パターン化可能（残りは手書き）: {len(partial)}種 ({len(partial)*100//total}%)')
    print(f'  ✍️ 全文手書きが必要: {len(manual)}種 ({len(manual)*100//total}%)')
    print(f'  （効果なし: {len(no_effect)}種）')
    print()
    print('=== パターン出現数 ===')
    for name, n in pattern_counts.most_common():
        print(f'  {name}: {n}')
    print()
    print(f'=== 未分類テキストの頻出上位{top_n} ===')
    for text, n in unmatched_texts.most_common(top_n):
        print(f'  x{n}: {text}')
    print()
    print('=== 完全分解可能なカードの例（先頭20） ===')
    print(' ', ', '.join(full[:20]))


if __name__ == '__main__':
    main()
