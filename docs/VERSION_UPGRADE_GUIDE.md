# バージョンアップ手順

## 📋 バージョンアップ時に変更するファイル

### 1. `sw-version.js` - メインの変更ファイル
```javascript
// 以下の値を更新してください：

const APP_VERSION = '4.6.0';  // 新しいバージョン番号
const VERSION_DESCRIPTION = 'BINDER-SETTINGS - Added comprehensive binder settings with layout management and metadata editing';  // バージョンの説明

// VERSION_HISTORYに新しいバージョンを追加
const VERSION_HISTORY = {
  '4.6.0': {
    description: 'BINDER-SETTINGS - Added comprehensive binder settings',
    features: [
      'バインダー設定モーダル追加',
      'レイアウト変更機能',
      // ... 機能リスト
    ],
    date: '2025-07-24'
  },
  // ... 過去のバージョン
};
```

### 2. Service Worker関連ファイルのバージョンコメント
以下のファイルのバージョンコメントを更新：
- `sw.js`
- `sw-utils.js` 
- `sw-handlers.js`

### 3. 該当HTMLページのバージョンコメント
変更があったHTMLファイルのバージョンコメントを更新

### 3. 確認事項
- [ ] `sw-version.js`のAPP_VERSION更新
- [ ] `sw-version.js`のVERSION_DESCRIPTION更新
- [ ] `sw-version.js`のPAGE_VERSIONS更新（必要に応じて）
- [ ] `sw-version.js`のUPDATE_DETAILS更新
- [ ] 各HTMLファイルのバージョンコメント更新（必要に応じて）
- [ ] 構文エラーチェック実行

## 🎯 バージョンアップの利点

### モジュラー構造により：
1. **変更箇所の明確化**: `sw-version.js`のみを変更すればOK
2. **ミス削減**: 散在していたバージョン情報が一箇所に集約
3. **作業効率化**: HTMLページのバージョンは必要時のみ更新
4. **保守性向上**: バージョン管理が独立したファイルで管理

## 📝 次回バージョンアップ時のチェックリスト

- [ ] 新機能・修正内容の確認
- [ ] `sw-version.js`の APP_VERSION 更新
- [ ] `sw-version.js`の VERSION_DESCRIPTION 更新
- [ ] `sw-version.js`の UPDATE_DETAILS 更新
- [ ] 必要に応じて PAGE_VERSIONS の個別ページバージョン更新
- [ ] 対応するHTMLファイルのバージョンコメント更新
- [ ] 構文エラーチェック
- [ ] ブラウザでの動作確認
