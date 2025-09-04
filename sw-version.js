// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.11.6";
const VERSION_DESCRIPTION = "フィルターチップ統一CSS更新";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.11.6",
  "binder_collection.html": "4.11.6",
  "collection_binder.html": "4.11.6",
  "card_list.html": "4.11.6",
  "holoca_skill_page.html": "4.11.6",
  "deck_builder.html": "4.11.6"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.11.6",
  description: "フィルターチップ統一CSS更新",
  changes: [
    "カード一覧ページ: フィルター/チップ ボタンデザインを詳細検索ページと統一",
    "!important の一部整理・テーマ変数導入",
    "Service Worker キャッシュ検証用コメント追加 (開発支援)",
    "バージョン更新でCSS強制取得 (v=クエリ導入)"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
