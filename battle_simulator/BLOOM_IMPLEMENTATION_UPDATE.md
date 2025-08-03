# ブルームシステム実装更新 - 公式ルールver1.40準拠

## 実装された主要な修正点

### 1. 同名カード要件の実装
- **修正箇所**: `checkBloomCompatibility`メソッド
- **内容**: ブルームは同名のホロメンカード同士でのみ可能
- **チェック**: `if (card.name !== targetCard.name)`

### 2. HP・ダメージ制限の実装
- **修正箇所**: `checkBloomCompatibility`メソッド
- **内容**: Bloom先のHPがダメージ量以下の場合はブルーム不可
- **チェック**: `if (bloomCardHP <= currentDamage)`
- **追加**: カード状態に`damage`フィールドを追加

### 3. 初回ターン制限の実装
- **修正箇所**: `canBloom`メソッド
- **内容**: 両プレイヤーの最初のターンではブルーム不可
- **チェック**: `if (currentTurn <= 2)`

### 4. Debut → Debut禁止の実装
- **修正箇所**: `checkBloomCompatibility`メソッド
- **内容**: 同レベルBloomは可能だがDebut → Debutのみ禁止
- **チェック**: `if (sourceLevel === 'Debut' && targetLevel === 'Debut')`

### 5. Spotホロメンの完全Bloom禁止
- **修正箇所**: `checkBloomCompatibility`メソッド
- **内容**: Spotホロメンは自身のブルームも、対象とされることも禁止
- **チェック**: `if (card.bloom_level === 'Spot' || targetCard.bloom_level === 'Spot')`

### 6. レベル逆行禁止の実装
- **修正箇所**: `checkBloomCompatibility`メソッド
- **内容**: ブルームレベルを下げることは禁止
- **実装**: レベル順序マップ `{ 'Debut': 0, '1st': 1, '1stBuzz': 1, '2nd': 2 }`

### 7. 引き継ぎ要素の完全実装
- **修正箇所**: `recordBloom`メソッド
- **引き継ぎ要素**:
  - エールカード (`yellCards`)
  - サポートカード (`supportCards`)
  - 重なっていたホロメン (`stackedCards`)
  - ダメージマーカー (`damage`)
  - 状態（お休み状態など）(`resting`)

### 8. カード状態管理の拡張
- **追加フィールド**:
  - `damage`: 受けているダメージ量
  - `yellCards`: 付いているエールカード配列
  - `supportCards`: 付いているサポートカード配列
  - `stackedCards`: 重なっているホロメンカード配列

## 新規追加メソッド

### ダメージ管理
- `addDamageToCard(card, damage)`: カードにダメージを与える
- `healCardDamage(card, healAmount)`: カードのダメージを回復

### 付加要素管理
- `attachYellCard(holomem, yellCard)`: エールカードを付ける
- `attachSupportCard(holomem, supportCard)`: サポートカードを付ける

## ターン制限の実装

### ブルーム不可タイミング
1. **両プレイヤーの最初のターン**: `currentTurn <= 2`
2. **ステージに出たターン**: `targetCardState.playedTurn === currentTurn`
3. **同ターン内のブルーム重複**: `targetCardState.bloomedThisTurn`

## 特殊ルールの実装

### Buzzホロメンの扱い
- **レベル扱い**: カードに表記されたBloomレベルに従う
- **1stBuzz**: レベル順序で1stと同等扱い

### ブルーム不可能力
- **Spotホロメン**: 完全にブルーム禁止
- **能力制限**: `abilities?.includes('ブルーム不可')`でチェック

## 状態引き継ぎの詳細

### ブルーム時の処理順序
1. **互換性チェック**: 同名、レベル、HP/ダメージ等
2. **タイミングチェック**: ターン制限、状態制限等
3. **引き継ぎ処理**: 全要素の移動
4. **状態更新**: ブルーム済みマーク、履歴記録

### 引き継がれる状態
- **お休み状態**: ブルーム後も維持
- **ダメージ**: そのまま引き継ぎ
- **付加カード**: エール、サポート全て移動
- **重なったカード**: ブルーム元も含めて積み重ね

## 今後の拡張予定

### 未実装機能
- **Bloomエフェクト**: ブルーム時に発動する特殊能力
- **重なったカードのカウント**: 効果計算での利用
- **ブルーム専用アニメーション**: UI側での実装

### 改善点
- **ダメージ計算**: より詳細な戦闘システム
- **複雑なブルーム条件**: 特殊カードの対応
- **パフォーマンス最適化**: 大量カード処理の高速化
