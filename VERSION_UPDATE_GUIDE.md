# バージョン更新ガイドライン

## � 推奨方法：自動バージョン更新スクリプト

### 基本的な使用方法
```bash
# 基本形式
node update-version.js [新しいバージョン] "[説明]"

# 例
node update-version.js 4.11.5 "バグ修正とパフォーマンス改善"
node update-version.js 4.12.0 "新機能：カード検索機能の追加"
```

### スクリプトが自動で更新するファイル
- ✅ `sw-version.js` - APP_VERSION, VERSION_DESCRIPTION, PAGE_VERSIONS
- ✅ `index.html` - HTMLコメントと表示バージョン
- ✅ `binder_collection.html` - HTMLコメントと表示バージョン
- ✅ `collection_binder.html` - HTMLコメントと表示バージョン
- ✅ `card_list.html` - HTMLコメントと表示バージョン
- ✅ `holoca_skill_page.html` - HTMLコメントと表示バージョン
- ✅ `deck_builder.html` - HTMLコメントと表示バージョン
- ✅ `package.json` - バージョンフィールド（存在する場合）

### 利点
- 🎯 **一貫性**: 全ファイルのバージョンが確実に統一される
- ⚡ **効率性**: 手動更新の時間を大幅短縮
- 🛡️ **エラー防止**: 人為的なミスを回避
- 📋 **追跡性**: 更新されたファイルが明確に表示される

## 🔧 手動更新が必要な場合（非推奨）

### 1. 文字エンコーディング
- ファイルは必ずUTF-8で保存
- 絵文字や特殊文字は正確にコピー
- 文字化けした場合は手動で修正

### 2. 文字列マッチング
- `replace_string_in_file`使用時は前後3-5行のコンテキストを含める
- 完全一致する文字列を使用
- 特殊文字やエスケープ文字に注意

### 3. 推奨更新手順
```bash
# 1. 自動スクリプトを使用（推奨）
node update-version.js 4.9.0 "新機能説明"

# 2. 手動での部分更新（非推奨）
# - 小さなセクションずつ更新
# - 一度に複数箇所を変更しない

# 3. 検証
node -c sw-version.js  # 構文チェック
```

### 4. よくある失敗パターン
- 絵文字の文字化け → 正しい絵文字に手動修正
- 改行コードの不一致 → エディタの設定確認
- 重複する文字列 → より具体的なコンテキストを使用
- 特殊文字のエスケープ → Raw文字列を使用

### 5. 緊急時の対応
```javascript
// sw-version.jsが壊れた場合のテンプレート
const APP_VERSION = 'X.X.X';
const VERSION_DESCRIPTION = '説明';
const PAGE_VERSIONS = { /* ... */ };
const UPDATE_DETAILS = { /* ... */ };

// Export
if (typeof self !== 'undefined') {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
```
