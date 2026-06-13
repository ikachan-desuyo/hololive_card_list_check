#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
カード効果の実装チェックリスト（TODO含む）を生成する。

入力:
  - 実レジストリでの分類結果（番号→状態）。battle_simulator_v2/tests/coverage-export.html を
    ヘッドレスEdgeで開いた際の stderr ログ（COVERAGE_JSON= 行）を渡す。
  - json_file/card_data.json（商品名・カード名の補完用）

状態:
  handwritten … 手書き定義あり（cards/<番号>.js）           → ✅
  compiled    … テキストコンパイラが自動実装                → 🔧
  todo        … 効果が必要だが未実装（エンジンは TODO ログ） → ❌（チェックリストの主対象）
  vanilla     … 効果不要（テキストなし）                    → 対象外

使い方:
  # 1) カバレッジを書き出す（サーバ稼働中に）
  #    Edge --headless ... http://localhost:8765/battle_simulator_v2/tests/coverage-export.html 2> cov.log
  # 2) チェックリスト生成
  python scripts/tools/build-effect-checklist.py --log cov.log
  #    → battle_simulator_v2/docs/CARD_EFFECT_CHECKLIST.md を出力
"""

import argparse
import json
import os
import re
from collections import defaultdict

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_OUT = os.path.join(REPO, "battle_simulator_v2", "docs", "CARD_EFFECT_CHECKLIST.md")
CARD_DATA = os.path.join(REPO, "json_file", "card_data.json")

STATUS_ICON = {"handwritten": "✅", "compiled": "🔧", "todo": "❌"}
STATUS_LABEL = {"handwritten": "手書き", "compiled": "自動", "todo": "未実装"}


def extract_coverage(log_text):
    """Edgeログの COVERAGE_JSON= 行から {番号: {...}} を取り出す。"""
    m = re.search(r'COVERAGE_JSON=(\{.*?\})"?,\s*source', log_text, re.S)
    if not m:
        m = re.search(r"COVERAGE_JSON=(\{.*\})", log_text, re.S)
    if not m:
        raise SystemExit("COVERAGE_JSON 行が見つかりません。coverage-export.html のログを渡してください。")
    raw = m.group(1)
    raw = raw[: raw.rfind("}") + 1]
    raw = raw.replace('\\"', '"')  # コンソールログ内のエスケープを戻す
    return json.loads(raw)


def expansion_of(number):
    """カード番号から商品コード（例 hBP07-008 → hBP07）。"""
    m = re.match(r"([A-Za-z0-9]+)-", number or "")
    return m.group(1) if m else "その他"


def main():
    ap = argparse.ArgumentParser(description="カード効果 実装チェックリストを生成")
    ap.add_argument("--log", required=True, help="coverage-export.html のヘッドレス実行ログ（stderr）")
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--date", default="", help="生成日（YYYY-MM-DD。省略時は記載なし）")
    args = ap.parse_args()

    cov = extract_coverage(open(args.log, encoding="utf-8", errors="replace").read())
    card_data = json.load(open(CARD_DATA, encoding="utf-8"))

    # 商品コード → 商品名。再録カード（product が複数商品のカンマ区切り）に引きずられないよう、
    # その商品コードの番号を持つ全カードの「product 先頭要素」の最頻値を採用する（ネイティブ商品が多数派）。
    from collections import Counter
    exp_prod_counter = defaultdict(Counter)
    for v in card_data.values():
        n = v.get("number", "")
        m = re.match(r"([A-Za-z0-9]+)-", n)
        if not m:
            continue
        first = (v.get("product", "") or "").split(",")[0].strip()
        if first:
            exp_prod_counter[m.group(1)][first] += 1
    product_by_exp = {e: c.most_common(1)[0][0] for e, c in exp_prod_counter.items()}

    # 商品コードごとに分類
    by_exp = defaultdict(lambda: {"handwritten": [], "compiled": [], "todo": [], "vanilla": []})
    exp_product = {}
    for number, info in cov.items():
        exp = expansion_of(number)
        by_exp[exp][info["status"]].append((number, info.get("name", "")))
        if exp not in exp_product:
            exp_product[exp] = product_by_exp.get(exp, "")

    totals = {k: sum(len(v[k]) for v in by_exp.values()) for k in ("handwritten", "compiled", "todo", "vanilla")}
    impl = totals["handwritten"] + totals["compiled"]
    need = impl + totals["todo"]

    def exp_sort_key(e):
        # hSD は番号順、hBP は番号順、その他は後ろ
        m = re.match(r"([a-zA-Z]+)(\d*)", e)
        return (m.group(1) if m else e, int(m.group(2)) if m and m.group(2) else 0)

    exps = sorted(by_exp.keys(), key=exp_sort_key)

    out = []
    out.append("# カード効果 実装チェックリスト")
    out.append("")
    if args.date:
        out.append("生成日: %s" % args.date)
    out.append("> 実際の v2 レジストリ（手書き定義 ＞ テキストコンパイラ自動実装）でカード番号ごとに分類した結果。")
    out.append("> `battle_simulator_v2/tests/coverage-export.html` ＋ `scripts/tools/build-effect-checklist.py` で再生成できる。")
    out.append("")
    out.append("## サマリ")
    out.append("")
    out.append("| 区分 | 件数 |")
    out.append("|---|---:|")
    out.append("| ✅ 手書き実装 | %d |" % totals["handwritten"])
    out.append("| 🔧 自動コンパイル | %d |" % totals["compiled"])
    out.append("| **❌ 未実装（TODO）** | **%d** |" % totals["todo"])
    out.append("| （効果要 計） | %d |" % need)
    out.append("| － バニラ（効果不要） | %d |" % totals["vanilla"])
    out.append("| 合計（ユニーク番号） | %d |" % (need + totals["vanilla"]))
    out.append("")
    out.append("凡例: ✅手書き / 🔧自動コンパイル / ❌未実装(TODO)。`[x]`=実装済み、`[ ]`=未実装。")
    out.append("")

    # 商品別サマリ表
    out.append("## 商品別サマリ")
    out.append("")
    out.append("| 商品コード | 商品名 | ✅手書き | 🔧自動 | ❌未実装 | バニラ |")
    out.append("|---|---|---:|---:|---:|---:|")
    for e in exps:
        b = by_exp[e]
        out.append("| %s | %s | %d | %d | %d | %d |" % (
            e, exp_product.get(e, ""), len(b["handwritten"]), len(b["compiled"]),
            len(b["todo"]), len(b["vanilla"])))
    out.append("")

    # 未実装(TODO)一覧（主対象）
    out.append("## ❌ 未実装（TODO）一覧")
    out.append("")
    out.append("効果テキストはあるが、手書き定義もコンパイラ自動実装も無いカード（エンジンが `TODO(効果未実装)` を出す）。")
    out.append("")
    todo_total = 0
    for e in exps:
        items = sorted(by_exp[e]["todo"])
        if not items:
            continue
        todo_total += len(items)
        out.append("### %s %s（%d件）" % (e, exp_product.get(e, ""), len(items)))
        out.append("")
        for number, name in items:
            out.append("- [ ] `%s` %s" % (number, name))
        out.append("")
    if todo_total == 0:
        out.append("（未実装なし）")
        out.append("")

    # 実装済み一覧（参考）
    out.append("## ✅🔧 実装済み一覧（参考）")
    out.append("")
    for e in exps:
        impl_items = [(n, nm, "手書き") for n, nm in by_exp[e]["handwritten"]] + \
                     [(n, nm, "自動") for n, nm in by_exp[e]["compiled"]]
        if not impl_items:
            continue
        impl_items.sort()
        out.append("<details><summary>%s %s（%d件）</summary>" % (e, exp_product.get(e, ""), len(impl_items)))
        out.append("")
        for number, name, how in impl_items:
            icon = "✅" if how == "手書き" else "🔧"
            out.append("- [x] %s `%s` %s （%s）" % (icon, number, name, how))
        out.append("")
        out.append("</details>")
        out.append("")

    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print("出力: %s" % args.out)
    print("手書き %d / 自動 %d / 未実装(TODO) %d / バニラ %d / 効果要 %d" %
          (totals["handwritten"], totals["compiled"], totals["todo"], totals["vanilla"], need))


if __name__ == "__main__":
    main()
