// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.11.3";
const VERSION_DESCRIPTION = "Navigation-Consistency-Fix";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.11.3-Navigation-Consistency-Fix",  // ナビゲーション整合性修正
  "binder_collection.html": "4.11.3-Navigation-Consistency-Fix",  // ナビゲーション整合性修正
  "collection_binder.html": "4.11.3-Navigation-Consistency-Fix",  // ナビゲーション整合性修正
  "card_list.html": "4.11.3-Navigation-Consistency-Fix",  // ナビゲーション整合性修正
  "holoca_skill_page.html": "4.11.3-Navigation-Consistency-Fix",  // ナビゲーション整合性修正
  "deck_builder.html": "4.11.3-Navigation-Consistency-Fix"  // ナビゲーション整合性修正
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "🔧 ナビゲーション整合性修正 v4.11.3",
  description: "カード詳細検索ページのバインダーボタンをバインダーコレクションページに変更、DISPLAY_VERSIONS削除",
  changes: [
    "🔧 カード詳細検索ページのバインダーボタンの遷移先を修正",
    "📚 バインダーボタンがバインダーコレクションページ(binder_collection.html)に正しく遷移",
    "🗑️ 未使用のDISPLAY_VERSIONSを削除してコードをクリーンアップ",
    "✅ 全ページのナビゲーション整合性を統一",
    "🎯 ユーザー体験の向上（期待通りのページに遷移）",
    "🔄 UI/UX の一貫性確保"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
