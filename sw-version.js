// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.11.1";
const VERSION_DESCRIPTION = "Complete-Cache-Enhancement";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.11.1-Complete-Cache-Enhancement",  // 完全なキャッシュ強化
  "binder_collection.html": "4.11.1-Complete-Cache-Enhancement",  // 完全なキャッシュ強化
  "collection_binder.html": "4.11.1-Complete-Cache-Enhancement",  // 完全なキャッシュ強化
  "card_list.html": "4.11.1-Complete-Cache-Enhancement",  // 完全なキャッシュ強化
  "holoca_skill_page.html": "4.11.1-Complete-Cache-Enhancement",  // 完全なキャッシュ強化
  "deck_builder.html": "4.11.1-Complete-Cache-Enhancement"  // 完全なキャッシュ強化
};

// ✅ 短縮表示用のバージョン情報（表示のみに使用）
const DISPLAY_VERSIONS = {
  "index.html": "v4.11.1",
  "binder_collection.html": "v4.11.1",
  "collection_binder.html": "v4.11.1",
  "card_list.html": "v4.11.1",
  "holoca_skill_page.html": "v4.11.1",
  "deck_builder.html": "v4.11.1"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "� 完全なキャッシュ強化 v4.11.1",
  description: "全ページのCSS・JSファイルをキャッシュ対象に追加、コレクションバインダーを含む全機能のオフライン対応完了",
  changes: [
    "� コレクションバインダーのCSS・JSファイルをキャッシュ対象に追加",
    "📚 バインダーコレクション機能の完全オフライン対応",
    "🎨 全ページのCSSファイルをキャッシュ化（統一されたオフライン表示）",
    "⚡ 全ページのJavaScriptファイルをキャッシュ化（完全な機能提供）",
    "🖼️ ロゴファイルもキャッシュ対象に追加",
    "🔄 包括的なオフライン体験の実現"
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
