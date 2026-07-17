# CPU（AI）実装監査（2026-07-17）

対象: `core/ai/`（heuristic / score / evaluate / lookahead / rollout / firepower、計約1,400行）を全量精読。
`core/ai_frozen/`（A/Bテスト用凍結ベースライン）、UI側の駆動（ui/app.js のAI適用・評価値表示・オンラインガード）、
カード定義側の AIヒント（`ai.*` / `aiSkip`）連携も確認した。

> 実施: メインセッションによる全量読解＋非公開領域アクセスの機械的スキャン。修正は未実施（本ファイルは監査結果）。

## A. 情報アクセスの設計方針（意図的な逸脱・要方針確認）

コード内に**【全情報許可】（ユーザー許可）と明記された意図的な例外**が2系統ある。過去に承認済みの設計と思われるため
監査では変更しないが、CLAUDE.md の記述「AIは公開情報のみ使用（相手の手札・山札の中身は見ない設計原則）」と
矛盾しており、どちらかに揃えるべき。

### A1. LookaheadAI（先読み）は完全情報の前方シミュレーション
`lookahead.js:17` に明記: 再生(replay)で相手の実際の手札・山札・順序を再現して先読みする。
**注意点（コメントが謳う範囲を超える副作用）**: 再生は実対戦と同じシード・同じ乱数列なので、
相手情報だけでなく**未来の乱数そのもの（サイコロの出目・自分のドロー順・サーチ後のシャッフル結果）も既知**になる。
例えばサイコロ依存の効果を「振れば良い目が出る局面でだけ」選ぶ、といった未来予知的な最適化が原理上起こる。
- 現状維持（強いCPU優先・ソロ専用なので実害は「CPUが不自然に鋭い」に留まる）か、
  determinization（先読み開始時に未知領域をシャッフルし直し・乱数を再シード）を導入するかは方針判断。

### A2. HeuristicAI／評価値表示も相手手札の中身を1箇所参照
`evaluate.js:149 opponentExtraCheerProjection` が相手の手札にあるエール付与サポートを実枚数で数える
（【全情報許可】明記）。この関数は evaluateState / score.js の脅威見積り（バトン・ブルーム・エール配分・コラボ判断）に
広く波及する。同ファイル冒頭（evaluate.js:8-11「使ってはいけない: 相手の手札の中身」）と矛盾記述になっている。

## B. 実害のある所見（修正候補・推奨順）

| # | 所見 | 確度/影響 |
|---|---|---|
| B1 | **オンラインで評価値オーバーレイが無効化されない**。設定セクションは隠れる（app.js updateModeUI）が、`showEvalOn()`（app.js:1789/1901）に isOnline ガードが無く、ソロでONにしたまま入室・`?showeval=1` で有効のまま。評価値は A2 経由で相手手札情報を織り込むため、**オンライン対戦の間接的な情報漏えい経路**になる | 中 |
| B2 | **`ctx.opponentChoosesHolomem`（context.js:465）に intent が無い** → 選択肢は side:'self' 扱いで、スコアラは「自分への利益」（主力・センター優先）として評価。実際は不利益な強制選択（引きずり出し等）が主用途のため、**選択者側のAIが自分の主力を差し出す逆向きの選択**をする。intent 既定を 'sacrifice' 系にするか、呼び出し側で明示すべき | 中 |
| B3 | pending type `endOfTurnOshiSkill`（engine の「ターン終了時推しスキル」）がスコアラ未対応（default 0点）→ bestOptionId は先頭の「使う」を選択。**AIは価値評価なしで常に発動**し、ホロパワーと[ターンに1回]枠を消費する（hBP08-007） | 低 |
| B4 | 2026-07-17 のエンジン修正で追加された `chooseOption` 系決定（同時ダウンの処理順・付け上限超過のkeep選択・同時誘発の解決順）もスコア一律0 → 常に先頭を選択。旧自動挙動と同等なので実害は小さいが、評価があるとより正確 | 低 |
| B5 | `confirm` の既定が yes=10（score.js:612）で、コスト付き任意効果（エールを捨てて発動等）でも ai.confirmValue 未定義なら**常に発動**。confirmValue を定義しているカードは現状0枚 | 低 |
| B6 | オンラインのAI強制無効は `aiOverride=[false,false]`（app.js:614）頼み。設定クリックで override が解除される経路（app.js:158。セクションは非表示だが）があり、`aiEnabled()` 自体に isOnline ガードが無い。オンラインでAIが動くと A1 の完全情報先読みが対人チートになるため、二重ガード推奨 | 低（防御的） |

## C. 情報・改善余地（バグではない）

- AIヒントAPIの利用状況: カード側は `ai.supportValue` 35枚・`aiSkip` 6枚のみ。`freePlay` / `developSupport` / `bloomValue` /
  `collabValue` / `cheerGain` / `value`（推しスキル）/ `confirmValue` は**定義カード0枚**（すべてテキスト正規表現フォールバックで動作）。
  特に `cheerGain` 未定義のため、エール付与量の見積りはテキストパターン頼み（`cheerGainFromText` は「エールをアーカイブに送る」
  等の非付与文にも誤マッチしうる＝脅威の過大評価方向で安全側）。
- LookaheadAI の計算量: 毎決定で「初手からの全再生 × 候補数 × サンプル数(turns≥2で3)」。ゲームが長引くほど1手が重くなる
  （O(手数²)）。ソロ専用なので実害は応答速度のみ。改善するなら再生の途中状態キャッシュ等。
- `_higherFormArts` のキャッシュは cardLibrary 共有（名前ベースの静的情報のみ）で先読み間の汚染なし。

## D. 問題なしを確認したポイント

- **Math.random / Date 不使用**（rng.js のシード付きRNGのみ。モンテカルロも createRng 固定シード＝common random numbers）
- **非公開領域の中身アクセスは A2 の1箇所のみ**（機械スキャン: 相手 hand / 両者 deck・life・holoPower・cheerDeck の
  要素参照なし。`.length`＝枚数参照のみ）。自手札参照はすべて自分視点で適法
- スコア計算中の盤面一時差し替え（bestEffDmg / bloom の bestEff）は try/finally で必ず復元
- scorePerformance: バック対象の zone+index 解決・借用アーツ(artObj)対応済み（過去のCPU停止バグは再発なし）
- `ai_frozen` は tests/abtest.js（NEW vs OLD の勝率A/B測定）専用で、本体コードから未参照。live との差分は
  現行側の強化（canActNow 削除・score/evaluate/lookahead の改良）で意図どおり
- HeuristicAI / rollout の暴走保険（MAIN_ACTION_CAP=25、maxRolloutMoves×turns）あり。決定ポイントの選択は
  engine.apply 経由のみで盤面を直接書き換えない（reconstruct 前提の維持）
- `aiSkip`（A2ゼロ・デグレ折衷）と `supportValue`・`intent`（gain/discard/damage/benefit/sacrifice）の連携は設計どおり機能

## E. 修正状況（2026-07-17 対応済み）

| 項目 | 対応 |
|---|---|
| A1/A2 方針 | **現状の全情報設計を維持**（ソロ専用の強いCPUとして合理的とユーザー確認）。CLAUDE.md のAI原則記述を実態（例外2系統＋ソロ専用）に更新し、evaluate.js 冒頭の矛盾記述も修正 |
| B1 | ✅ `showEvalOn()` に `!isOnline` ガード追加（設定持ち越し・`?showeval=1` でもオンラインでは評価値を表示しない） |
| B2 | ✅ `opponentChoosesHolomem` に `intent = 'sacrifice'` 既定を追加（利益になる効果は呼び出し側で上書き可） |
| B3 | ✅ スコアラに `endOfTurnOshiSkill` 評価を追加（`onEndOfTurnOshiSkill.ai.value` 参照・既定は控えめな8。負値で見送り可能に） |
| B4 | ✅ `chooseOption` 系にカード参照時の価値評価を追加（付け上限超過のkeep選択は価値の高い装着を残す。engine 側で options に card を付与）。順序系（同時ダウン/誘発順）は従来どおり先頭＝影響なし |
| B5 | 見送り（confirmValue をカード側に付ける作業はカード実装の継続課題。機構は動作済み） |
| B6 | ✅ `aiEnabled()` に isOnline 強制無効ガード追加（全情報先読みAIの対人稼働を二重に防止） |

回帰: スモークテスト 158/158 PASS（修正後）。
