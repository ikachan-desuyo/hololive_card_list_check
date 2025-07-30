// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.11.1";
const VERSION_DESCRIPTION = "DarkMode-Button-Color-Fix";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.11.1-DarkMode-Button-Color-Fix",  // ダークモードボタン配色修正
  "binder_collection.html": "4.11.1-DarkMode-Button-Color-Fix",  // ダークモードボタン配色修正
  "collection_binder.html": "4.11.1-DarkMode-Button-Color-Fix",  // ダークモードボタン配色修正
  "card_list.html": "4.11.1-DarkMode-Button-Color-Fix",  // ダークモードボタン配色修正
  "holoca_skill_page.html": "4.11.1-DarkMode-Button-Color-Fix",  // ダークモードボタン配色修正
  "deck_builder.html": "4.11.1-DarkMode-Button-Color-Fix"  // ダークモードボタン配色修正
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "🎨 ダークモードボタン配色修正 v4.11.0",
  description: "ダークモード時の全ボタン配色を明示的に上書き（背景・文字色・ボーダー色・ホバー時も明示）",
  changes: [
    "� ダークモード時の全ボタン配色を明示的に上書き（背景・文字色・ボーダー色・ホバー時も明示）",
    "� その他UI/UX改善"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
