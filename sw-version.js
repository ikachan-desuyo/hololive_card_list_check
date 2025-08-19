// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.11.5";
const VERSION_DESCRIPTION = "カードデータ更新とリリース日情報追加";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.11.5",
  "binder_collection.html": "4.11.5",
  "collection_binder.html": "4.11.5",
  "card_list.html": "4.11.5",
  "holoca_skill_page.html": "4.11.5",
  "deck_builder.html": "4.11.5"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.11.5",
  description: "カードデータ更新とリリース日情報追加",
  changes: [
    "カード詳細モーダルを大幅改善（クリック時のみ表示）",
    "アーカイブカード一覧モーダル機能を追加",
    "マウスオーバー上書き問題を解決",
    "アーツの色アイコン画像置き換え実装",
    "サポート効果の正しい表示対応",
    "全スキルタイプの包括的表示対応",
    "デッキビルダーとバトルシミュレーターの連携改善"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
