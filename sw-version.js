// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.11.3";
const VERSION_DESCRIPTION = "4.11.3";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.11.3",
  "binder_collection.html": "4.11.3",
  "collection_binder.html": "4.11.3",
  "card_list.html": "4.11.3",
  "holoca_skill_page.html": "4.11.3",
  "deck_builder.html": "4.11.3"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.11.3",
  description: "ナビゲーション整合性修正",
  changes: [
    "バインダーボタンの遷移先を修正",
    "ナビゲーション整合性を統一"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
