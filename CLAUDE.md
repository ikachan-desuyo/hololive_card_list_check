# CLAUDE.md

ホロライブカードゲーム（ホロライブOCG）の非公式ファンメイドWebツール集。
**ビルドシステムなし・フレームワークなしの静的 HTML + JS（PWA）**。npm install も不要（package.json はメタデータのみ）。

## 実行方法

静的サーバーでルートを配信して各HTMLを開く（例: `python -m http.server`）。
`fetch()` を使うため file:// 直開きでは動かない。GitHub Pages のサブパス配信を想定し、**パスは必ず相対パスで書く**（`/json_file/...` のような絶対パスは禁止）。

## 構成

- `index.html` — ランディング。各ツール（カード一覧 / スキル検索 / デッキビルダー / バインダー / バトルシミュレーター）へのリンク
- `js/` — 各ページのスクリプト。`utils.js` `modal-ui.js` `deck_manager.js` はページ間共有
- `json_file/card_data.json` — カードDB（カードID → カード情報）
- `sw.js` + `sw-version.js` + `sw-utils.js` + `sw-handlers.js` — Service Worker。**JSファイルの追加・改名時は sw.js の urlsToCache と sw-version.js のバージョンを更新**しないとキャッシュで反映されない

### キャッシュ運用ルール（2026-06-13 整理）

- **バージョンアップ時は sw-version.js と sw.js 先頭のバージョンコメントの両方を更新する**（sw.js 本体のバイト差分が最速の更新検知）
- SW登録は全ページ `{ updateViaCache: 'none' }` 統一（無指定の register があると設定が戻るので追加時注意）
- 新バージョンのキャッシュ取得は `cache: 'reload'` でHTTPキャッシュを迂回している（sw.js install/activate）
- 外部カード画像は `IMAGE_CACHE`（バージョン非依存）に分離。activate の削除対象から除外されている
- **battle_simulator_v2/ 配下は開発中のためSWキャッシュを常時バイパス**（sw.js fetch handler 冒頭）。
  v2 を正式リリースしてオフライン対応する際は、このバイパスを外して urlsToCache に v2 ファイル一式を追加すること
- モジュールシステム不使用。各ファイルは class を定義して `window.XXX` に登録し、`<script>` タグの順序で依存を解決している

## バトルシミュレーター v2（現行の開発ライン）

- 入口: `battle_simulator_v2.html` / コード: `battle_simulator_v2/`（**ES modules使用**。旧コードと違い window 登録はしない）
- 構成: `core/`（DOM非依存のゲームエンジン）+ `ui/`（3D盤面・CSS 3D transform）+ `tests/`（ルールテスト）
- ルールの実装根拠は `battle_simulator/docs/RULES_SPEC.md` の条番号をコメントに書く
- カード個別効果は未実装（`TODO(効果未実装)` ログを出す）。効果システムが次の開発対象
- テスト: `battle_simulator_v2/tests/test.html`（`scripts/tools/smoke-test-battle-sim.ps1` がヘッドレスで実行）
- 開発用URLパラメータ: `?autostart=1&seed=42&autoplay=12` で自動開始・自動プレイ
- エンジンは「決定ポイント」方式: `engine.actions()` で選択肢取得 → `engine.apply(id)`。乱数はシード固定可（Math.random 禁止）
- CPU/AI: `core/ai/heuristic.js`（決定ポイントごとのスコアリング）。設定パネル「AI適用」または `?ai=1|2|both` で有効化。
  **AIは公開情報のみ使用**（相手の手札・山札の中身は見ない設計原則。heuristic.js 冒頭コメント参照）

### カード効果の実装方法（v2）

- **効果の実装は2層**: ①手書き定義 `battle_simulator_v2/cards/<カードナンバー>.js` + `cards/index.js` 登録、
  ②手書きが無いカードは **テキストコンパイラ**（`core/effects/text-compiler.js`）が効果テキストを
  自動実装（スキル枠単位で全文解釈できた場合のみ。安全側）。
  **新しい定型パターンは text-compiler.js に追加**（必ずユニットテストとセットで）。
  カバレッジはテスト「全カードでクラッシュせず～」のログで確認できる
- 定義の書式・フック一覧は `core/effects/registry.js` の冒頭コメントが正本
- 効果は**ジェネレータ関数** `*run(ctx)` で書く。プレイヤー選択は `yield ctx.chooseCard(...)` / `ctx.chooseHolomem(...)` / `ctx.confirm(...)`
- 共通処理は `core/effects/context.js` のプリミティブ（draw / searchDeck系 / rollDice / dealSpecialDamage / heal / attachCheer / addTurnModifier 等）を必ず使う。新しい共通処理が必要なら context.js に追加する
- **規模感**: ユニークカード1,052種、うち効果実装が必要なのは874種（2026-06時点）。この規模が前提
- **カード固有の知識（効果・AI評価とも）は cards/<番号>.js に集約**。エンジン・heuristic.js にカード番号を直書きしない。AI評価は `ai.supportValue` 等の任意ブロック（無ければテキストパターンの汎用評価にフォールバック）
- 装着カード（マスコット/ファン/ツール）の常時修正は `attached.artsPlus/hpPlus/specialDmgPlus`（毎回動的計算なので後始末不要）。ターン限定の修正は `ctx.addTurnModifier`（エンドステップで自動消滅）
- **カードがどの領域にも属さない瞬間を作らないこと**（テストの保存則が落ちる）。デッキを「見る」時は `ctx.lookTopDeck`（解決領域に置く）を使う
- **効果テキストは厳密に解釈する**。「1枚ずつを…1～3人に」=別々のホロメンへ各1枚、「まで」=0可、HP条件は「より大きい」等。
  曖昧・不明な場合は必ず 総合ルール（RULES_SPEC.md/原文PDF）と公式Q&A（https://hololive-official-cardgame.com/rules/question/ のキーワード検索）で裁定を確認してから実装する

## バトルシミュレーター v1（参照用・凍結）

- 入口: `battle_simulator.html`（スクリプト読み込み順がそのまま依存順）
- 本体: `battle_simulator/` 配下のマネージャ群 + `js/battle_engine.js`（統括）
- カード効果: `battle_simulator/card-effects/scalable-card-effect-manager.js` が本系統。
  個別カード効果は `card-effects/cards/<カードID>.js` を動的読み込み（`window.cardEffect_<ID>` に登録）
- **状態更新は必ず StateManager（state-manager.js）経由で行う**（直接 players/gameState を書き換えない）
- リファクタリング計画と現状: `battle_simulator/docs/REFACTORING_PLAN.md` を必ず参照（docs/ の他の設計書は一部古い）
- ゲームルールの正本: `battle_simulator/docs/RULES_SPEC.md`（公式 総合ルール ver.1.9.0 の実装向け整理。原文PDF: https://hololive-official-cardgame.com/rules/ ）
- カード効果ファイルを `card-effects/cards/` に追加・削除したら `cards/implemented-cards.js` のID一覧も更新する
- 簡易テスト: `battle_simulator/card-effects/test-effects.html`
- スモークテスト: `powershell -File scripts\tools\smoke-test-battle-sim.ps1`（Python + ヘッドレスEdge。変更後は必ず実行）

## 環境メモ

- この開発機に Node.js は入っていない（構文チェックやテストランナーは使えない前提）
- コメント・ログ・ドキュメントは日本語
