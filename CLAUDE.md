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
- `sw.js` + `sw-version.js` + `sw-utils.js` + `sw-handlers.js` — Service Worker。**JSファイルの追加・改名時は sw.js の STATIC_RESOURCES と sw-version.js のバージョンを更新**しないとキャッシュで反映されない
- モジュールシステム不使用。各ファイルは class を定義して `window.XXX` に登録し、`<script>` タグの順序で依存を解決している

## バトルシミュレーター v2（現行の開発ライン）

- 入口: `battle_simulator_v2.html` / コード: `battle_simulator_v2/`（**ES modules使用**。旧コードと違い window 登録はしない）
- 構成: `core/`（DOM非依存のゲームエンジン）+ `ui/`（3D盤面・CSS 3D transform）+ `tests/`（ルールテスト）
- ルールの実装根拠は `battle_simulator/docs/RULES_SPEC.md` の条番号をコメントに書く
- カード個別効果は未実装（`TODO(効果未実装)` ログを出す）。効果システムが次の開発対象
- テスト: `battle_simulator_v2/tests/test.html`（`scripts/tools/smoke-test-battle-sim.ps1` がヘッドレスで実行）
- 開発用URLパラメータ: `?autostart=1&seed=42&autoplay=12` で自動開始・自動プレイ
- エンジンは「決定ポイント」方式: `engine.actions()` で選択肢取得 → `engine.apply(id)`。乱数はシード固定可（Math.random 禁止）

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
