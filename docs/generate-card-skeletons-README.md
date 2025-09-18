# カード効果スケルトンファイル自動生成ツール

このツールは、`card_data.json` に記載されているがまだ実装されていないカードについて、スケルトンJSファイルを自動生成します。

## 🚀 クイックスタート

```bash
# 未実装カードの確認（ファイル生成なし）
npm run generate-card-skeletons-dry

# 全ての未実装カードのスケルトンファイルを生成
npm run generate-card-skeletons

# 生成数を制限する場合
node generate-card-skeletons.js --limit=10
```

## 📋 完成仕様

✅ **実装済み機能:**
- カードデータ解析と未実装カード検出
- レアリティサフィックス処理（`hBP04-048_RR` → `hBP04-048.js`）
- 全カード種別対応（ホロメン、サポート、推しホロメンなど）
- 効果別スケルトン生成：
  - ブルームエフェクト
  - コラボエフェクト
  - ギフト効果
  - サポート効果
  - アーツ（コスト解析、特攻情報含む）
- 多言語文字列エスケープ
- 構文検証済みJavaScript生成
- NPMスクリプト統合

✅ **品質保証:**
- 全生成ファイルの構文検証
- 多様なカード種別での動作確認
- 大規模生成テスト（20+ファイル同時生成）
- エラーハンドリング
- 既存ファイル保護

## 📊 実績

- **総カード数**: 1,162枚
- **既存実装**: 17枚
- **未実装カード**: 660枚（自動生成対象）
- **対応カード種別**: 全種別（ホロメン、サポート、推しホロメン等）

## 📁 詳細ドキュメント

完全な使用方法とサンプルコード: [`generate-card-skeletons-README.md`](generate-card-skeletons-README.md)

---

## 機能

- `card_data.json` を解析して全カード情報を取得
- 既に実装済みのカード（`battle_simulator/card-effects/cards/` 内にファイル存在）をスキップ
- 未実装カードのみを対象として、以下を含むスケルトンファイルを生成：
  - カードの基本情報（ID、名前、色、タイプ、HPなど）
  - ブルームエフェクト（該当カードのみ）
  - コラボエフェクト（該当カードのみ）
  - ギフト効果（該当カードのみ）
  - サポート効果（サポートカードのみ）
  - アーツ情報（各アーツ名・コスト・説明、処理本体は空関数）
  - グローバル登録（window.cardEffects への登録）

## 使用方法

### 基本的な使用法

```bash
# DRY RUN（ファイル生成なし、分析のみ）
node generate-card-skeletons.js --dry-run

# 実際にファイル生成
node generate-card-skeletons.js

# 生成数を制限（テスト用）
node generate-card-skeletons.js --limit=10
```

### オプション

- `--dry-run`: ファイル生成を行わず、分析結果のみ表示
- `--limit=N`: 生成するファイル数を N 個に制限

## 生成されるファイルの構造

### ホロメンカード例（ブルームエフェクト付き）

```javascript
/**
 * hBP01-012 - カード効果定義
 * 天音かなた
 */

// カード効果の定義
const cardEffect_hBP01_012 = {
  // カード基本情報
  cardId: 'hBP01-012',
  cardName: '天音かなた',
  cardType: 'ホロメン',
  color: 'white',
  bloomLevel: '1st',
  hp: 120,
  batonTouch: 'colorless',
  rarity: 'U',
  
  // 効果定義
  effects: {
    // ブルームエフェクト: アイドルかなたそを
    bloomEffect: {
      type: 'bloom',
      name: 'アイドルかなたそを',
      description: 'サイコロを１回振れる：３以下の時、自分のデッキから、マスコット１枚を公開し、自分のホロメンに付ける。そしてデッキをシャッフルする。',
      timing: 'manual',
      auto_trigger: 'on_bloom',
      condition: (card, gameState, battleEngine) => {
        // TODO: 発動条件を実装
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`🌸 [ブルームエフェクト] ${card.name || 'hBP01-012'}の「アイドルかなたそを」が発動！`);
        
        // TODO: 効果処理を実装
        
        return {
          success: true,
          message: `${card.name || 'hBP01-012'}のブルームエフェクト「アイドルかなたそを」が発動しました`
        };
      }
    },
    
    // アーツ: い～っぱい応援して！
    art1: {
      type: 'art',
      name: 'い～っぱい応援して！',
      description: '',
      cost: {"any":1},
      damage: 40,
      timing: 'manual',
      auto_trigger: 'arts',
      condition: (card, gameState, battleEngine) => {
        // TODO: アーツ使用条件を実装（エールコストチェックなど）
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP01-012'}の「い～っぱい応援して！」が発動！`);
        
        // TODO: アーツ効果を実装
        
        return {
          success: true,
          message: `${card.name || 'hBP01-012'}の「い～っぱい応援して！」で40ダメージ！`,
          damage: 40,
          target: 'opponent'
        };
      }
    },
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP01-012'] = cardEffect_hBP01_012;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP01-012',
    effect: cardEffect_hBP01_012
  });
}

// グローバルに公開
window.cardEffect_hBP01_012 = cardEffect_hBP01_012;
```

### サポートカード例

```javascript
/**
 * hBP04-089 - カード効果定義
 * ツートンカラーパソコン
 */

// カード効果の定義
const cardEffect_hBP04_089 = {
  // カード基本情報
  cardId: 'hBP04-089',
  cardName: 'ツートンカラーパソコン',
  cardType: 'サポート・アイテム・LIMITED',
  rarity: 'U',
  
  // 効果定義
  effects: {
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: 'このカードは、自分のステージに色が1色で異なる色のホロメンが2人以上いなければ使えない。\\n\\n自分のステージの色が1色で異なる色のホロメン2人を選ぶ。自分のデッキから、Buzz以外のそれぞれ選んだホロメンと同色の1stホロメン1枚ずつを公開し、手札に加える。そしてデッキをシャッフルする。\\n\\nLIMITED：ターンに１枚しか使えない。',
      condition: (card, gameState, battleEngine) => {
        // TODO: 使用条件を実装
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`📋 [サポート効果] ${card.name || 'hBP04-089'}が発動！`);
        
        // TODO: 効果処理を実装
        
        return {
          success: true,
          message: `${card.name || 'hBP04-089'}のサポート効果が発動しました`
        };
      }
    },
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-089'] = cardEffect_hBP04_089;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-089',
    effect: cardEffect_hBP04_089
  });
}

// グローバルに公開
window.cardEffect_hBP04_089 = cardEffect_hBP04_089;
```

## 技術仕様

### ファイル命名規則

- カードID `hBP04-048_RR` → ファイル名 `hBP04-048.js`
- レアリティサフィックス（`_RR`, `_SR`, `_C` など）は除去
- 同じ番号の異なるレアリティは同じファイルで管理

### カラー正規化

Japanese → English マッピング：
- 赤 → red
- 青 → blue  
- 緑 → green
- 黄 → yellow
- 紫 → purple
- 白 → white
- 無色 → colorless

### アーツコスト解析

`card_data.json` の `skills.icons.main` 配列から自動的にコスト情報を抽出：
- `"blue"` → `{ blue: 1 }`
- `"any"` → `{ any: 1 }`
- `["blue", "any", "any"]` → `{ blue: 1, any: 2 }`

### 特攻情報解析

`skills.icons.tokkou` 配列から特攻情報を抽出：
- `"赤+50"` → `{ red: 50 }`

## 注意事項

1. **生成されたファイルには実装が必要**: TODOコメントがある箇所は実際の効果処理を実装してください
2. **多言語文字列対応**: 説明文中の日本語や特殊文字は適切にエスケープされます
3. **構文チェック**: 生成されたファイルは構文的に有効なJavaScriptですが、実行には実装が必要です
4. **既存ファイル保護**: 既に実装済みのカードファイルは上書きされません

## トラブルシューティング

### "カードデータの読み込みに失敗"
- `json_file/card_data.json` が存在するか確認
- JSONファイルの構文が正しいか確認

### "カードディレクトリが存在しません"  
- `battle_simulator/card-effects/cards/` ディレクトリが存在するか確認

### "構文エラー"
- 生成されたファイルに構文エラーがある場合は、特殊文字のエスケープ処理に問題がある可能性があります
- バグ報告をお願いします

## 生成後の作業

1. 生成されたファイルの `TODO` 部分を実装
2. 必要に応じてカード固有のロジックを追加
3. バトルシミュレーターでテスト
4. HTMLファイルにscriptタグを追加（手動読み込みの場合）