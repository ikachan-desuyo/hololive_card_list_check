// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.10.0";
const VERSION_DESCRIPTION = "Version-Sync-SW-Optimization";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.10.0-VERSION-SYNC-UPDATE",  // 最新: Version synchronization, Service Worker optimization, cache management, and mobile improvements
  "binder_collection.html": "4.10.0-VERSION-SYNC-UPDATE",  // 最新: Version synchronization, Service Worker optimization, cache management, and mobile improvements
  "collection_binder.html": "4.10.0-VERSION-SYNC-UPDATE",  // 最新: Version synchronization, Service Worker optimization, cache management, and mobile improvements
  "card_list.html": "4.10.0-VERSION-SYNC-UPDATE",  // 最新: Version synchronization, Service Worker optimization, cache management, and mobile improvements
  "holoca_skill_page.html": "4.10.0-VERSION-SYNC-UPDATE",  // 最新: Version synchronization, Service Worker optimization, cache management, and mobile improvements
  "deck_builder.html": "4.10.0-VERSION-SYNC-UPDATE"  // 最新: Version synchronization, Service Worker optimization, cache management, and mobile improvements
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "🔄 バージョン同期＆SW最適化 v4.10.0",
  description: "全ページとService Workerのバージョン同期を実施し、キャッシュ戦略を最適化しました",
  changes: [
    "🔧 Service Workerバージョンの統一・最適化",
    "🔄 全HTMLページのバージョン同期",
    "📱 キャッシュ戦略の改善と最適化",
    "🎯 ページ間でのバージョン整合性確保",
    "💾 新バージョン配信の確実性向上",
    "🏷️ バージョン管理システムの統一",
    "✨ キャッシュクリア機能の強化",
    "🔄 最新コンテンツ配信の改善"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
