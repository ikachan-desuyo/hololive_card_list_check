# バトルシミュレーター リファクタリング計画

最終更新: 2026-06-13

開発中止状態だったバトルシミュレーターを、リファクタリングしながら開発再開するための計画書。
進捗はこのファイルを更新して管理する。

> 🔄 **方針転換 (2026-06-13)**: 検証の結果、既存コード（v1）の修正継続ではなく
> **新コアでの作り直し（battle_simulator_v2/）** に移行した。v1 は参照実装として凍結。
> 理由: v1 はカード効果が一度も正常動作し得ない致命バグを複数抱えており、検証コストが
> 作り直しコストを上回ると判断。経緯は本書下部の Phase 1-2 記録を参照。
>
> **v2 の状況 (2026-06-13 時点)**:
> - コアエンジン（セットアップ/ターン進行/メインアクション/アーツ/ダウン・ライフ/勝敗）実装済み
> - 3D奥行き盤面UI・D&D操作・プレイシート準拠レイアウト実装済み
> - **カード効果システム実装済み**: ジェネレータ方式（選択を yield）+ 共通プリミティブ
>   （core/effects/）。テストデッキ2種の効果カード23種を実装、テスト15件合格
> - CPU対戦（ヒューリスティックAI）実装済み。テストデッキ2種の推しスキル4種
>   （ダウン時トリガー含む）も実装済み
> - 未実装: AI Phase2（デッキ推測・先読み）、ギフト、一般の自動能力待機キュー (10.6.3)、
>   ホロメン自身の「ダウンした時」能力、制限カードのデッキ検証、v2のSWプリキャッシュ化
> 以降の Phase 2-4 計画は v1 前提のため参考情報扱い。

## 現状サマリー

- 実行時に読み込まれるのは battle_simulator.html の **17スクリプト**（js/ 共有4 + battle_simulator/ 10 + card-effects/ 3）+ cards/ 配下の個別効果（動的読み込み）
- 設計はレイヤード（StateManager を最下層に、制御層 / UI層 / AI・処理層）で docs/ に詳細な設計書あり
- 課題は「実装の肥大化」と「新旧システムの混在」だった

## Phase 1: クリーンアップ ✅ 完了 (2026-06-12)

### 削除したデッドコード（11ファイル / 約2,300行）

どのHTMLからも読み込まれておらず、参照元もデッドコード同士のみであることを確認の上削除。

| ファイル | 理由 |
|---------|------|
| card-effect-manager.js | 旧効果システム本体（scalable- に置換済み） |
| effect-registry.js | 旧システムの効果登録 |
| card-effect-builder.js | 旧システムのビルダー |
| battle-engine-integration.js | 旧 CardEffectManager 前提の統合層 |
| card-loader.js | 未使用（動的読み込みは scalable- 内に実装あり） |
| card-metadata.js | 未使用（メタデータは card_data.json から生成） |
| effect-pattern-templates.js | 未使用（パターンは scalable- 内に登録） |
| csv-effect-manager.js | Node.js 専用ツール（require使用、ブラウザ不可） |
| comprehensive-effect-checker.js | Node.js 専用ツール |
| implementation-list.js | 未読み込みの定数定義のみ |
| simplified-card-examples.js | 参考資料（git履歴に残る） |

### 修正した実バグ（scalable-card-effect-manager.js）

1. **`loadedEffects` (Map) に `.add()` を呼んでいた** → `.set()` に修正。
   これにより `loadCardEffect()` が常に例外→null を返しており、**動的読み込みした全カード効果が登録に失敗していた**（最重要バグ）。
2. **`preloadCommonCards()` の二重定義** → 後勝ちで common-cards.js の事前読み込みが無効化されていた。重複（旧システム用）を削除。
3. **絶対パス `/json_file/...` `/battle_simulator/...`** → 相対パスに統一。
   GitHub Pages のサブパス配信（`/<repo>/`）で 404 になるため。他モジュールは全て相対パス。

### 追加修正（2026-06-13: 動作確認とバグ潰し）

- **二重初期化バグ修正**: battle_engine.js のコンストラクタと DOMContentLoaded ハンドラの両方から
  `initializeGame()` が呼ばれ、全初期化（カードデータ読み込み・UI構築・リスナー登録）が2回走っていた。
  コンストラクタ側の呼び出しを削除（スモークテストで単一初期化を確認済み）。
- **パターン効果の未定義メソッド呼び出しを解消**: `registerEffectPatterns()` が
  `this.executeDeckSearch()` 等の存在しないメソッドを登録しており実行時に必ず失敗していた。
  パターン登録を空にし、明示的に「効果未実装」となるようにした（実装は Phase 4）。
- **HEAD fetch 404スパム解消**: `detectCustomEffect()` がデッキ全カードにファイル存在確認の
  HEAD fetch を発行していた。`cards/implemented-cards.js`（実装済みカードIDの静的インデックス）を
  新設して判定をネットワーク不要にした。**cards/ にファイルを追加・削除したらこのリストも更新すること**。

### スモークテスト

`scripts/tools/smoke-test-battle-sim.ps1` を実行すると、ローカルサーバー + ヘッドレスEdge で
battle_simulator.html を読み込み、コンソールログから「初期化完了・エラーなし・単一初期化」を自動判定する。
変更を入れたら最低限これを通すこと（Node.js 不要）。

## Phase 2: グローバル結合の削減（次にやる）

- `window.battleEngine` を単一エントリポイントにし、`window.HololiveXXX` クラス登録への直接依存を減らす
- HTML / 動的生成DOM の `onclick="window.handManager.xxx()"` をイベントリスナー登録に置換
- 初期化順序依存（script タグの順番）を明示化（battle_engine.js での依存チェックを一元化）
- `window.pendingCardEffects`: 全カード効果ファイルがフォールバックとして push しているが、
  **消費するコードがどこにも無い**（scalable-card-effect-manager.js が先に `window.cardEffects` を
  初期化するため実際にはほぼ通らない経路）。消費処理を足すか、フォールバック自体を削除する

## Phase 3: 巨大モジュールの分割

優先度順:

1. **js/battle_engine.js (3,947行)** — 初期化・統合に責務を絞り、ゲームロジックを各マネージャへ移す
2. **state-manager.js (3,091行)** — 状態定義 / 更新ロジック / プロキシ互換層に分割
3. **hand-manager.js (2,413行)** — D&D処理と手札描画を分離
4. **performance-manager.js (1,646行)** — 攻撃 / スキル / ダメージ / ライフの各システムに分割

分割時の原則: 「全状態は StateManager 経由で更新」(docs/STATE_MANAGEMENT_GUIDE.md) を維持する。

## Phase 4: カード効果システムの整備（開発再開の本丸）

- パターン効果（deck_search / card_draw / limited_support）を実装し、カスタムファイル無しでも汎用効果が動くようにする
- 実装済みカード: cards/ 配下 19枚。新カード追加手順は card-effects/IMPLEMENTATION_GUIDE.md 参照
- 動作確認は card-effects/test-effects.html（スタンドアロンの簡易テスト）

## テスト方針

- Node.js 未導入環境のため、当面は test-effects.html とブラウザでの手動確認
- 中期的には Node + vitest 等を導入し、StateManager / 効果システムをユニットテスト可能にする
  （現状コードは class + window 登録のみで module 化されていないため、export 追加が前提）

## 注意事項

- **docs/ の既存設計書（ARCHITECTURE.md 等）には削除済みファイル（CardLoader, CardMetadata, EffectPatternTemplates, 旧 CardEffectManager）の記述が残っている**。設計思想の参考にはなるが、ファイル構成は本書とコードを正とする。
- sw.js の `STATIC_RESOURCES` に battle_simulator/ のJSが列挙されている。**ファイルを追加・改名したら sw.js と sw-version.js のバージョン更新が必要**（PWAキャッシュ）。
