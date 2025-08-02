# トラブルシューティングログ（過去トラ）

このファイルでは、開発中に発生した問題とその解決策を記録しています。

## 🔧 解決済み問題

### 2025-01-XX: サポートカード効果使用範囲のサイズ変更問題

**問題:**
- サポートカード効果使用範囲の枠サイズをCSSで変更しても視覚的に反映されない
- `height: 100%` → `50%` に変更しても効果なし

**原因:**
- サポートドロップゾーンがプレイヤーエリア内に配置されている
- プレイヤーエリア全体に対する相対的なサイズのため、変化が分かりにくい
- CSSの相対値（%）では効果的な調整が困難

**解決策:**
- JavaScriptで直接スタイルを設定
- 固定サイズ（120px）と幅100%で配置
- `top: 0`, `left: 0` でプレイヤーエリアの上端に合わせる

**ファイル変更:**
- `js/battle_engine.js` の `createSupportDropZone()` 関数
- `css/battle_view.css` にコメント追加

**コード例:**
```javascript
supportZone.style.height = '120px';
supportZone.style.width = '100%';
supportZone.style.top = '0';
supportZone.style.left = '0';
```

---

### 2025-01-XX: フェーズハイライト機能の未実装

**問題:**
- ターンやステップごとの黄色い枠（フェーズハイライト）が表示されない
- CSSは存在するがJavaScriptでの制御が未実装

**原因:**
- `updatePhaseHighlight()` 関数が存在しない
- `nextPhase()` でハイライト更新が呼ばれていない

**解決策:**
- `updatePhaseHighlight()` 関数を実装
- 各フェーズに応じたエリアハイライト
- プレイヤー・CPU両方に対応

**フェーズ別ハイライト:**
- リセット/エンド: プレイヤーエリア全体
- ドロー: デッキエリア
- エール: エールデッキ
- メイン: 手札エリア（プレイヤー）/プレイヤーエリア全体（CPU）
- パフォーマンス: フロントエリア

---

### 2025-01-XX: 自動進行の待機時間不足

**問題:**
- 自動進行が早すぎてフェーズの確認ができない
- プレイヤーターンでの待機時間なし

**解決策:**
- 全自動進行の待機時間を2秒に統一
- プレイヤーメインステップでも1秒の初期待機追加

**変更箇所:**
- リセットステップ: 1.5秒 → 2秒
- ドローステップ: 1秒 → 2秒
- エールステップ: 1.5秒 → 2秒
- メインステップ（CPU）: 2秒

---

## 🔄 Life Card Rotation Display Issues
**Status:** RESOLVED ✅  
**Date:** 2024-01-XX  
**Priority:** High

### Problem
ライフのカードサイズだけど90度回転させたときに上下が切れて、横が広がっている (Life cards are cut off when rotated 90 degrees, with width expanding incorrectly)

### Investigation Process
1. User identified that life cards displayed correctly at git commit `feea757713ca6e930fa3e11abf9e8541df922b73`
2. Compared current CSS with working version from git hash
3. Found that basic dimensions were correct but missing key properties
4. **MAJOR DISCOVERY**: Module separation broke CardDisplayManager references
5. Fixed JavaScript errors related to missing CardDisplayManager class

### Root Cause
**Module separation issue**: The `CardDisplayManager` class was moved to `battle_simulator/card-display-manager.js` but the constructor initialization was accidentally removed from `battle_engine.js`, causing JavaScript errors that prevented life cards from displaying.

### Solution Applied
1. **CSS Restoration**: Restored original `.life .card` CSS settings
```css
.life .card {
  width: 120px;
  height: 168px;
  margin: -30px 0;
  transform: rotate(90deg);
  display: block;
  position: relative;
}
```

2. **JavaScript Fix**: Restored CardDisplayManager initialization in battle_engine.js constructor
```javascript
// カード表示管理の初期化
this.cardDisplayManager = new CardDisplayManager(this);
```

3. **Method Delegation**: Restored proper delegation to CardDisplayManager methods
   - `updateCardAreas()` → `this.cardDisplayManager.updateCardAreas()`
   - `displayCardsInArea()` → `this.cardDisplayManager.displayCardsInArea()`

### Files Modified
- `css/battle_view.css` - Removed unnecessary transform-origin and overflow properties
- `js/battle_engine.js` - Restored CardDisplayManager initialization and delegation

### Verification Steps
1. Open battle simulator
2. Check that life cards rotate properly without being cut off
3. Verify that no JavaScript errors occur in console
4. Confirm that CardDisplayManager properly handles life card display

### Lessons Learned
- Module separation requires careful attention to class initialization
- Always check for JavaScript console errors when display issues occur
- Git hash comparison is valuable for identifying regression points
- CSS transforms work best with minimal explicit settings

---

---

## 🚨 未解決問題

### 2025-01-XX: プレイヤー2（CPU）→プレイヤー1のターン切り替え問題

**問題:**
- CPU操作後にプレイヤー1のターンが回ってきたときにステップ処理が正常に動作しない
- ターン切り替え時の状態管理に問題がある可能性
- フェーズハイライトが正しく表示されない

**調査結果:**
- `endTurn()` 処理で `updatePhaseHighlight()` が呼ばれていなかった
- `executeResetStep()` でもフェーズハイライト更新が不足
- ターン切り替え時のデバッグログが不足

**対策実施:**
1. `endTurn()` に `updatePhaseHighlight()` 追加
2. `executeResetStep()` に明示的なハイライト更新追加
3. 詳細なデバッグログをすべての関数に追加
4. ハイライト適用状況の確認ログ追加

**デバッグログ強化:**
- `updatePhaseHighlight()` の実行状況
- `highlightPhaseArea()` の詳細動作
- DOM要素の検索結果確認
- ハイライト適用前後の状態比較

**検証項目:**
- [ ] プレイヤー1 → プレイヤー2 切り替え
- [ ] プレイヤー2 → プレイヤー1 切り替え  
- [ ] 各フェーズでのハイライト表示
- [ ] ターン数の正確なカウント

---

### 2025-01-XX: ライフカードの90度回転時サイズ問題

**問題:**
- ライフカードを90度回転させた時に上下が切れて横が広がっている
- 回転後のサイズがライフエリア（width: 200px, height: 360px）に適していない

**原因:**
- ライフカードは `width: 120px, height: 168px` で定義
- 90度回転後は実質的に `width: 168px, height: 120px` になる
- ライフエリアの幅（200px）に対して168pxは適切だが、高さに問題がある可能性

**調査中:**
- 現在のライフカードサイズ: 120px × 168px
- 回転後の実効サイズ: 168px（幅） × 120px（高さ）
- ライフエリアサイズ: 200px（幅） × 360px（高さ）

**検証項目:**
- [ ] 回転時のoverflow問題
- [ ] マージン設定の妥当性
- [ ] カード重なり表示の最適化

---

## 📝 開発ノート

### コード修正時の注意点
- 自動進行の`setTimeout`使用時は閉じ括弧に注意
- フェーズハイライトは両プレイヤー対応必須
- CSS変更が効かない場合はJavaScript直接設定を検討

### デバッグ用コマンド
```javascript
// フェーズハイライト状態確認
document.querySelectorAll('.phase-highlight');

// 現在のゲーム状態確認
console.log(battleEngine.gameState);
```
