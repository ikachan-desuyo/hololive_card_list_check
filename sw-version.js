// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.11.10";
const VERSION_DESCRIPTION = "カード一覧: 無限スクロール単独化 (ボタン削除)";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.11.6",
  "binder_collection.html": "4.11.6",
  "collection_binder.html": "4.11.6",
  "card_list.html": "4.11.10",
  "holoca_skill_page.html": "4.11.6",
  "deck_builder.html": "4.11.6"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.11.10",
  description: "カード一覧 読み込みUX簡素化",
  changes: [
    "『さらに表示』ボタンを完全削除し無限スクロールのみを採用",
    "不要になった loadMoreCards / ボタン表示制御ロジックを削除",
    "内部API: setAutoScrollEnabled(v) は継続 (デバッグ用途)",
    "card_list.html バージョン 4.11.10"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
