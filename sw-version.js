// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.11.4";
const VERSION_DESCRIPTION = "デッキビルダー修正とカード詳細モーダル改善";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.11.4",
  "binder_collection.html": "4.11.4",
  "collection_binder.html": "4.11.4",
  "card_list.html": "4.11.4",
  "holoca_skill_page.html": "4.11.4",
  "deck_builder.html": "4.11.4",
  "battle_simulator.html": "4.11.4"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.11.4",
  description: "デッキビルダー修正とカード詳細モーダル改善",
  changes: [
    "デッキビルダーの機能修正",
    "カード詳細モーダルの包括的改善",
    "クリック時のみカード詳細表示（マウスオーバー上書き問題解決）",
    "アーツの色アイコン画像表示対応",
    "サポート効果の正しい表示対応",
    "全スキルタイプの詳細表示実装",
    "アーカイブモーダルでのカード画像表示"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
