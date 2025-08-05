# カード効果システム - 個別ファイル管理

## 概要

各カードの効果を個別のJSファイルで管理するシステムです。カードIDに基づいて自動的にファイルが読み込まれます。

## ディレクトリ構造

```
battle_simulator/card-effects/cards/
├── hBP04-048.js    # 雪花ラミィ(RR) - ブルームエフェクト
├── hBP04-043.js    # 雪花ラミィ(C) - 基本形
├── hBP04-106.js    # 雪民 - ギフト効果
├── hBP04-101.js    # サポートカード
├── hY04-001.js     # 基本エール
└── hBP04-999.js    # コラボエフェクトサンプル
```

## カードファイルの書き方

### 基本構造

```javascript
/**
 * カード名 (カードID)
 * 効果の説明
 */

const cardEffect = {
  cardId: 'hBP04-048_RR',
  name: 'カード名',
  type: 'holomen', // holomen, fan, support, yell など
  triggers: [
    { type: 'on_bloom', timing: 'on_bloom' }
  ],
  
  // 効果の実装
  execute: async (card, context, battleEngine) => {
    // 効果の処理
    return {
      success: true,
      message: '効果が発動しました'
    };
  }
};

// グローバル登録
if (typeof window !== 'undefined' && window.cardEffects) {
  window.cardEffects[cardEffect.cardId] = cardEffect;
  console.log(`📝 カード効果登録: ${cardEffect.name} (${cardEffect.cardId})`);
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cardEffect;
}
```

## 効果タイミングの種類

### ブルームエフェクト
```javascript
triggers: [{ type: 'on_bloom', timing: 'on_bloom' }]
```
- ブルームしたターンのみ発動可能
- 1ターンに1回のみ

### コラボエフェクト
```javascript
triggers: [{ type: 'on_collab', timing: 'on_collab' }]
```
- バックからコラボに移動したターンのみ発動可能
- 1ターンに1回のみ

### ギフト効果
```javascript
triggers: [{ type: 'gift', timing: 'gift' }]
```
- 場にいる間は常に有効
- 手札からは発動不可

### アーツ効果（未実装）
```javascript
triggers: [{ type: 'arts', timing: 'arts' }]
```
- パフォーマンスステップでのみ発動可能

## ファイル命名規則

- カードID `hBP04-048_RR` → ファイル名 `hBP04-048.js`
- アンダースコア以降のレアリティ情報は除去
- 同じ番号の異なるレアリティは同じファイルで管理

## 動的読み込み

カードローダー（`card-loader.js`）により、必要なカードファイルを動的に読み込むことができます：

```javascript
// 単一カード読み込み
await window.cardEffectLoader.loadCard('hBP04-048_RR');

// 複数カード読み込み
await window.cardEffectLoader.loadCards(['hBP04-048_RR', 'hBP04-043_C']);

// デッキ全体読み込み
await window.cardEffectLoader.loadDeck(deckArray);
```

## 新しいカードの追加方法

1. `cards/` ディレクトリに新しいJSファイルを作成
2. 上記の基本構造に従ってカード効果を実装
3. HTMLファイルに手動でscriptタグを追加（静的読み込みの場合）
4. または動的ローダーで自動読み込み

## 利点

- **モジュール化**: 各カードが独立したファイル
- **保守性**: カード毎の修正が容易
- **拡張性**: 新しいカードの追加が簡単
- **デバッグ**: 個別のカード効果をテストしやすい
- **パフォーマンス**: 必要なカードのみ読み込み可能
