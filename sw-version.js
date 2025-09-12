// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.12.0"; // Consolidated single bump from 4.11.10
const VERSION_DESCRIPTION = "カードデータ大規模更新";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.12.0",
  "binder_collection.html": "4.12.0",
  "collection_binder.html": "4.12.0",
  "card_list.html": "4.12.0",
  "holoca_skill_page.html": "4.12.0",
  "deck_builder.html": "4.12.0"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.12.0",
  description: "カードデータ大規模更新",
  changes: [
    "背景クリック無効化/高速連打ナビ安定化/スワイプ拡大",
    "上下余白段階的圧縮 → 最終: デスクトップ高さ76vh",
    "画像最小高さ 72vh (object-fit:contain で比率維持)",
    "モバイル: 画像領域52% / 情報領域48% へ再配分",
    "角丸強化 + パディング最適化",
    "card_list.html バージョン 4.11.11"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
