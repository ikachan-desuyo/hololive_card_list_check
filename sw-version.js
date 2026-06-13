// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.19.0"; // 旧版バトルシミュレーター(v1)を削除し v2 に一本化
const VERSION_DESCRIPTION = "バトルシミュレーターv2に一本化";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.19.0",
  "binder_collection.html": "4.19.0",
  "collection_binder.html": "4.19.0",
  "card_list.html": "4.19.0",
  "holoca_skill_page.html": "4.19.0",
  "deck_builder.html": "4.19.0"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.19.0",
  description: "バトルシミュレーターをv2に一本化",
  changes: [
    "旧版バトルシミュレーター（v1）を削除し、バトルシミュレーターv2に一本化",
    "v2が使うテストデッキ・ルール仕様(RULES_SPEC等)をv2配下に統合",
    "SWキャッシュからv1関連ファイルを除去"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
