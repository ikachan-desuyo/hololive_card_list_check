// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.11.0";
const VERSION_DESCRIPTION = "Offline-Display-Improvement";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.11.0-Offline-Display-Improvement",  // オフライン表示改善
  "binder_collection.html": "4.11.0-Offline-Display-Improvement",  // オフライン表示改善
  "collection_binder.html": "4.11.0-Offline-Display-Improvement",  // オフライン表示改善
  "card_list.html": "4.11.0-Offline-Display-Improvement",  // オフライン表示改善
  "holoca_skill_page.html": "4.11.0-Offline-Display-Improvement",  // オフライン表示改善
  "deck_builder.html": "4.11.0-Offline-Display-Improvement"  // オフライン表示改善
};

// ✅ 短縮表示用のバージョン情報（表示のみに使用）
const DISPLAY_VERSIONS = {
  "index.html": "v4.11.0",
  "binder_collection.html": "v4.11.0",
  "collection_binder.html": "v4.11.0",
  "card_list.html": "v4.11.0",
  "holoca_skill_page.html": "v4.11.0",
  "deck_builder.html": "v4.11.0"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "🔴 オフライン表示改善 v4.11.0",
  description: "オフライン状態表示を右下にシンプル化、重複表示削除、統一されたデザイン、画像一括DL機能追加",
  changes: [
    "🔴 オフライン表示を右下にシンプル化（邪魔なボタン削除）",
    "🧹 重複するオフライン表示を削除（カード詳細検索・デッキ作成）",
    "📚 バインダー機能のオフライン対応確認済み",
    "📥 index.htmlに画像一括DL機能追加（モバイル限定）",
    "✨ 統一されたオフライン状態表示デザイン",
    "📝 バージョン表記の短縮化（機能は維持）"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.DISPLAY_VERSIONS = DISPLAY_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
