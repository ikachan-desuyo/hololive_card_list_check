// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.11.7";
const VERSION_DESCRIPTION = "カード一覧: 表モードで収録列削除";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.11.6",
  "binder_collection.html": "4.11.6",
  "collection_binder.html": "4.11.6",
  "card_list.html": "4.11.7",
  "holoca_skill_page.html": "4.11.6",
  "deck_builder.html": "4.11.6"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.11.7",
  description: "カード一覧 表モードの列整理 (収録列削除)",
  changes: [
    "カード一覧 表モード: 不要な収録列を削除し横スクロール/視認性改善",
    "card_list.html バージョン 4.11.7",
    "他ページは据え置き"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
