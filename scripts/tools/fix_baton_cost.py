#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
公式カードリストから各ホロメンの「バトンタッチ」必要エールの個数を再取得し、
v2側のバトンコスト補正データ battle_simulator_v2/data/baton_cost.json を生成する。

背景: json_file/card_data.json（外部生成物・変更禁止）は baton_touch を単一文字列 "無色" で持ち、
コスト個数（2nd/Buzz の ◇◇ 等）を失っている。card_data.json は一切変更せず、v2 のロード層
（core/cards.js の CardLibrary.load）がこの baton_cost.json を読んで batonTouch を正しい個数に上書きする。
バトンは常に無色なので、アイコン個数ぶんの色配列（例 ["無色"] / ["無色","無色"]）を出力する。

使い方:
  python scripts/tools/fix_baton_cost.py --scrape   # 公式から個数を取得 → battle_simulator_v2/data/baton_cost.json
※ card_data.json には絶対に書き込まない。
"""
import argparse
import json
import os
import re
import time
import urllib.request

BASE = "https://hololive-official-cardgame.com"
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CARD_DATA = os.path.join(REPO, "json_file", "card_data.json")  # 読み取り専用（修正対象の番号抽出に使うだけ）
OUT = os.path.join(REPO, "battle_simulator_v2", "data", "baton_cost.json")
UA = "Mozilla/5.0 (baton-fix; hololive_card_list_check)"
COLOR_BY_FILE = {"arts_null": "無色", "type_white": "白", "type_red": "赤",
                 "type_blue": "青", "type_green": "緑", "type_yellow": "黄", "type_purple": "紫"}


def fetch(url, retries=3):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa
            last = e
            time.sleep(0.4 * (i + 1))
    raise RuntimeError("fetch failed %s (%s)" % (url, last))


def list_expansions():
    h = fetch(BASE + "/cardlist/")
    return [v for v, _ in re.findall(r'<option[^>]*value="([^"]+)"[^>]*>(.*?)</option>', h) if v]


def number_to_detail_id(exp):
    """商品 exp の一覧ページから {画像ファイル名語幹: 数値id} を返す。"""
    out = {}

    def scan(frag):
        for m in re.finditer(r'<a href="/cardlist/\?id=(\d+)[^"]*"><img src="([^"]+)"', frag):
            stem = re.sub(r".*/", "", m.group(2)).replace(".png", "")
            out.setdefault(stem, m.group(1))

    page1 = fetch(BASE + "/cardlist/cardsearch/?expansion=%s" % exp)
    scan(page1)
    mm = re.search(r"var max_page\s*=\s*(\d+)", page1)
    for pg in range(2, (int(mm.group(1)) if mm else 1) + 1):
        scan(fetch(BASE + "/cardlist/cardsearch_ex?expansion=%s&view=image&page=%d" % (exp, pg)))
        time.sleep(0.15)
    return out


def baton_of_detail(html):
    """詳細ページHTMLからバトンタッチの色配列を返す（ホロメン以外/バトン無しは None）。"""
    m = re.search(r"<dt>バトンタッチ</dt>\s*<dd>(.*?)</dd>", html, re.S)
    if not m:
        return None
    cols = []
    for f in re.findall(r"/texticon/([a-zA-Z0-9_]+)\.png", m.group(1)):
        cols.append(COLOR_BY_FILE.get(f, "無色"))
    return cols or None


def scrape():
    card_data = json.load(open(CARD_DATA, encoding="utf-8"))
    # 修正対象＝baton_touch を持つユニーク番号
    need = {}
    for v in card_data.values():
        n = v.get("number")
        if n and "baton_touch" in v and n not in need:
            need[n] = v.get("id")  # 代表 id（画像ファイル名語幹）

    done = {}
    if os.path.exists(OUT):
        done = json.load(open(OUT, encoding="utf-8"))
        print("既存 _baton.json: %d 件（続きから）" % len(done))

    # 番号→詳細数値id を商品横断で集める（画像ファイル名語幹で突き合わせ）
    stem_to_id = {}
    for exp in list_expansions():
        try:
            stem_to_id.update(number_to_detail_id(exp))
        except Exception as e:  # noqa
            print("  ! enum 失敗 %s: %s" % (exp, e))
        time.sleep(0.1)
    print("一覧から取得した画像語幹→id: %d 件" % len(stem_to_id))

    todo = [n for n in need if n not in done]
    print("詳細取得が必要なホロメン番号: %d / 全 %d" % (len(todo), len(need)))
    for i, num in enumerate(todo, 1):
        # この番号の語幹（id フィールド）に対応する数値id。無ければ語幹前方一致で探す
        stem = need[num]
        did = stem_to_id.get(stem)
        if not did:
            cand = [v for k, v in stem_to_id.items() if k.startswith(num + "_")]
            did = cand[0] if cand else None
        if not did:
            print("  ! 数値id見つからず: %s" % num)
            continue
        try:
            html = fetch(BASE + "/cardlist/?id=%s" % did)
            cols = baton_of_detail(html)
            if cols:
                done[num] = cols
        except Exception as e:  # noqa
            print("  ! 詳細失敗 %s: %s" % (num, e))
        if i % 50 == 0:
            save(done)
            print("  ... %d/%d 保存" % (i, len(todo)))
        time.sleep(0.15)
    save(done)
    from collections import Counter
    print("完了: %d 件 → %s。個数内訳: %s" % (len(done), OUT, dict(Counter(len(v) for v in done.values()))))


def save(done):
    """番号順・1番号1行で baton_cost.json を書き出す（差分を読みやすく）。"""
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    keys = sorted(done)
    lines = ["{"]
    for i, k in enumerate(keys):
        comma = "," if i < len(keys) - 1 else ""
        lines.append("  %s: %s%s" % (json.dumps(k, ensure_ascii=False), json.dumps(done[k], ensure_ascii=False), comma))
    lines.append("}")
    open(OUT, "w", encoding="utf-8").write("\n".join(lines))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scrape", action="store_true", help="公式から再取得して baton_cost.json を生成")
    a = ap.parse_args()
    if a.scrape:
        scrape()
    else:
        ap.error("--scrape を指定してください（card_data.json は変更しません）")


if __name__ == "__main__":
    main()
