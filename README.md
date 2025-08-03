# 📚 Hololive Card Web Tools v4.5.2
# 📚 ホロライブカードWebツール v4.5.2

[![Version](https://img.shields.io/badge/version-4.5.0-blue.svg)](https://github.com/ikachan-desuyo/hololive_card_list_check)
[![PWA](https://img.shields.io/badge/PWA-ready-green.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Offline](https://img.shields.io/badge/offline-support-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

[English](#english) | [日本語](#japanese)

---

# Japanese

## 🚀 最新アップデート v4.5.2

**カード詳細モーダル大幅改善 (2025/07/24)**
- **🎯 UI改善**: カード詳細タイトルを削除し、画像右上に直感的なクローズボタンを配置
- **🔄 ナビゲーション機能**: 画像左右の矢印ボタンでページ内の前後カードに移動可能
- **🌸 Bloom情報修正**: `bloom_level`フィールドを優先的にチェックして正確な情報を表示
- **📏 スキルフォント統一**: スキル部分のフォントサイズを13pxに統一して表示の一貫性を向上
- **📜 スクロール問題修正**: アーツ下部が見切れる問題を解決
- **📱 モバイル対応**: 小さな画面でも操作しやすいボタンサイズに最適化

**v4.5.1のバグ修正**

**検索機能大幅改善＆モジュラー構造化**
- 🔤 ひらがな/カタカナ統一検索機能実装
- 🔠 大文字/小文字統一検索機能実装
- 🏷️ 動的カードタイプフィルター生成
- 📋 「・」分割カードタイプの個別表示
- 📱 モバイル版カード詳細モーダル改善
- 🎨 セレクトボックス2列グリッドレイアウト
- 🔧 Service Workerのモジュラー構造化
- 📦 ユーティリティ関数の分離
- 🔄 メッセージハンドラーの分離
- ⚡ コードの可読性と保守性向上

## 🏠 メインページ (`index.html`) v4.5.0

すべての利用可能なツールへのナビゲーションを備えたランディングページ：
- **カードリスト**: 高度な検索機能付きカードコレクション管理
- **カード詳細検索**: 詳細フィルターとスキル解析による高度検索
- **デッキビルダー**: UI改善されたカードデッキ作成・管理
- **コレクションバインダー**: ドラッグ&ドロップ機能付き仮想バインダー管理
- **バインダーコレクション**: カスタムカバー付き複数バインダー管理

## 🗂 ホロライブカードリスト (`card_list.html`) v4.5.0

検索機能が大幅に強化された、ホロライブカードの閲覧・フィルタリング・管理のためのレスポンシブカードリストツール。

### ✅ 機能

#### 強化された検索システム
- **統一検索**: ひらがな/カタカナ統一、大文字/小文字統一検索
- **リアルタイムフィルタリング**: 入力と同時に結果を表示
- **キーワード検索**: 名前、ID、タグ、スキルを統一検索で検索
- **商品フィルター**: オートコンプリート機能付き部分一致ドロップダウン

#### 表示モード
- **テーブルビュー**: グリッドレイアウトでの構造化詳細表示
- **コンパクトビュー**: モバイル最適化された画像重視表示
- **スクロールベース読み込み**: パフォーマンス向上のための段階的カード表示（`renderLimit`）

#### 高度フィルターシステム（チップスタイルUI）
- **所有状況**: `所有` / `未所有` トグル
- **レアリティ**: 自動生成ボタン + `すべて` ボタン
- **色**: 自動生成ボタン + `すべて` ボタン
- **ブルーム**: 自動生成ボタン + `すべて` ボタン
- **動的カードタイプ**: 実データから自動生成、「・」分割タイプをサポート

> 🧠 すべてのフィルターはチップスタイルのトグルボタンを使用。「すべて」ボタンは他の選択をクリアし、排他的になります。

#### 統計ダッシュボード
- リアルタイム表示：
  - 表示カード数
  - 所有カード数
  - 所有率（%）
- 常に**完全フィルター済みセット**から計算（表示項目のみではない）

#### 所有管理
- カードごとの手動入力（`localStorage`経由で保存）
- **CSVインポート**: `id,ownedCount` フォーマット対応
- **CSVエクスポート**: 所有データをクリップボードにコピー
- ページ間データ同期

#### モバイル最適化
- セレクトボックス2列グリッドのレスポンシブレイアウト
- 最適化されたカード詳細モーダル
- タッチフレンドリーインターフェース
- ダークモードトグル（ページ間永続化）

---

## 🔍 ホロライブカード詳細検索 (`holoca_skill_page.html`) v4.5.0

検索正規化が強化された、カード能力での高度フィルタリングのためのスキルベース検索ツール。

### ✅ 機能

#### 強化された検索フィルター
- **統一検索**: ひらがな/カタカナ統一、大文字/小文字統一検索
- カード属性による検索：
  - 名前 / ID / レアリティ / タイプ（統一検索付き）
- スキルによる検索：
  - スキルテキスト部分一致（統一検索付き）
  - リーダー / ノーマルスキル分離
  - コストタイプ / HPトリガー / スキルレベル条件
- タグと商品のドロップダウン一致

#### スキルロジック検出
- キーワード自動ハイライト：
  - バフ/デバフ用語（ATK UP、DMG DOWN）
  - 発動タイミング（開始、回復）
  - HPしきい値、スキルレベル
- 解析強化のための視覚的強調

#### 結果表示
- 画像サムネイル（クリック可能なモーダルズーム）
- 所有数（リストページと共有）
- 商品またはカードタイプでグループ化
- モバイル最適化レイアウト

#### 統計
- 総マッチ数
- 結果中の総所有数

---

## 🃏 デッキビルダー (`deck_builder.html`) v4.5.0

強化された検索とフィルタリング機能でカードデッキを作成・管理。

### ✅ 機能

#### 強化されたデッキビルディング
- **統一検索**: ひらがな/カタカナ統一、大文字/小文字統一検索
- ドラッグ&ドロップカード管理
- リアルタイムデッキ検証
- カード数追跡
- エクスポート/インポート機能

#### 高度フィルター
- 色、レアリティ、タイプフィルタリング（統一検索付き）
- コストベースフィルタリング
- スキルベース検索
- モバイル最適化インターフェース

---

## 📚 コレクションバインダー (`collection_binder.html`) v4.5.2

高度機能でカードコレクションを整理するための仮想バインダー。

### ✅ 機能

#### 動的カード管理
- **強化された検索**: ひらがな/カタカナ統一、大文字/小文字統一検索
- **動的カードタイプフィルタリング**: 実データから自動生成
- ドラッグ&ドロップ機能
- グリッドベースレイアウト
- リアルタイムフィルタリング

#### 高度フィルタリング
- **統一検索**: すべてのテキスト検索で統一機能を使用
- データからの動的カードタイプ生成
- 「・」分割カードタイプの個別表示
- モバイル最適化2列グリッドレイアウト

#### 視覚的強化
- カードホバー効果
- レスポンシブデザイン
- ダークモードサポート
- タッチフレンドリーインターフェース

---

## 🗂️ バインダーコレクション (`binder_collection.html`) v4.2.0

カスタムカバーと説明付きで複数バインダーを管理。

### ✅ 機能

#### バインダー管理
- 複数バインダー作成
- カスタムカバー画像
- バインダー説明
- バインダーごとの独立データストレージ

#### ユーザーインターフェース
- モバイル最適化レイアウト
- レスポンシブデザイン
- バインダー間の簡単ナビゲーション

---

## 🛠️ 技術アーキテクチャ

### モジュラーService Worker構造
- **`sw.js`**: イベントリスナー付きメインService Worker
- **`sw-version.js`**: バージョン管理と設定
- **`sw-utils.js`**: バージョンチェック用ユーティリティ関数
- **`sw-handlers.js`**: クライアント通信用メッセージハンドラー

### Progressive Web App機能
- **オフラインサポート**: インターネットなしでの完全機能
- **キャッシュ戦略**: HTMLはネットワーク優先、アセットはキャッシュ優先
- **バックグラウンド同期**: 接続復旧時のデータ更新
- **レスポンシブデザイン**: すべてのデバイスサイズに最適化

### 検索正規化
- **テキスト正規化**: 統一検索のためのひらがな ⇔ カタカナ変換
- **大文字小文字区別なし**: 自動大文字小文字正規化
- **ページ間一貫性**: すべてのツールで同じ検索動作

### データ管理
- **LocalStorage**: 永続データストレージ
- **ページ間同期**: ツール間での共有データ
- **インポート/エクスポート**: データポータビリティのためのCSV機能

---

## 📱 モバイル最適化

すべてのツールはモバイルデバイスで完全に最適化：
- タッチフレンドリーインターフェース
- スペース効率のための2列グリッドレイアウト
- レスポンシブモーダルとオーバーレイ
- 最適化された画像読み込み
- スワイプジェスチャーサポート

---

## 🚀 はじめ方

1. ウェブブラウザで `index.html` を開く
2. 希望のツールにナビゲート
3. ホロライブカードコレクションの管理を開始！

### PWAインストール
- Chrome/Edge: 「インストール」プロンプトまたは「ホーム画面に追加」をクリック
- iOS Safari: 共有 → 「ホーム画面に追加」
- Android: ブラウザメニューから「ホーム画面に追加」

---

## 🔧 開発

### バージョン管理
バージョン更新は `sw-version.js` で一元化。アップグレード手順は `VERSION_UPGRADE_GUIDE.md` を参照。

### ファイル構造
```
├── index.html                 # メインランディングページ
├── card_list.html            # カード閲覧ツール
├── holoca_skill_page.html    # スキル検索ツール
├── deck_builder.html         # デッキビルディングツール
├── collection_binder.html    # 仮想バインダー
├── binder_collection.html    # バインダー管理
├── sw.js                     # メインservice worker
├── sw-version.js             # バージョン設定
├── sw-utils.js               # ユーティリティ関数
├── sw-handlers.js            # メッセージハンドラー
├── json_file/
│   ├── card_data.json        # カードデータベース
│   └── release_dates.json    # リリース情報
└── images/                   # アセット画像
```

---

## 📄 ライセンス・権利表記

### ソフトウェアライセンス
このプロジェクトはMITライセンスの下でライセンスされています。

### 商標・権利表記
- 「ホロライブ」「hololive」は株式会社カバーの商標です
- 「ホロライブオフィシャルカードゲーム」は株式会社ブシロードの商標です
- このツールは株式会社カバー・株式会社ブシロードとは無関係の非公式ファンメイドツールです
- カードデータの著作権は各権利者に帰属します

### 免責事項
このツールの使用により生じた損害について、作成者は一切の責任を負いません。このツールは教育・研究目的及び個人的なコレクション管理のためのツールとして提供されています。

---

## 📞 サポート

質問や問題については、GitHubでissueを開いてください。

---

**ホロライブコミュニティのために ❤️ で作られました**

---

# English

## 🚀 Latest Update v4.5.2

**Card Detail Modal Major Improvements (2025/07/24)**
- **🎯 UI Enhancement**: Removed card detail title and added intuitive close button in top-right of image area
- **🔄 Navigation Feature**: Added arrow buttons on left/right of image for navigating between cards on the same page
- **🌸 Bloom Info Fix**: Prioritized `bloom_level` field check for accurate bloom information display
- **📏 Skill Font Unification**: Unified skill section font size to 13px for consistent display
- **📜 Scroll Issue Fix**: Resolved issue where arts section was cut off during scrolling
- **📱 Mobile Optimization**: Optimized button sizes for easier operation on smaller screens

**v4.5.1 Bug Fixes**
Landing page with navigation to all available tools:
- **Card List**: Browse and manage your card collection with advanced search
- **Card Detail Search**: Advanced search with detailed filters and skill analysis
- **Deck Builder**: Create and manage card decks with improved UI
- **Collection Binder**: Virtual binder management with drag & drop functionality
- **Binder Collection**: Manage multiple binders with custom covers

## 🗂 Hololive Card List (`card_list.html`) v4.5.0

A responsive card list tool for browsing, filtering, and managing your Hololive cards with enhanced search capabilities.

### ✅ Features

#### Enhanced Search System
- **Normalized Search**: ひらがな/カタカナ統一、大文字/小文字統一検索
- **Real-time filtering**: Instant results as you type
- **Keyword search**: Searches name, ID, tags, skills with normalization
- **Product filter**: Partial match dropdown with auto-complete

#### View Modes
- **Table view**: Structured details in a grid layout
- **Compact view**: Image-focused display optimized for mobile
- **Scroll-based loading**: Cards render gradually for performance (`renderLimit`)

#### Advanced Filter System (chip-style UI)
- **Ownership**: `Owned` / `Unowned` toggle
- **Rarity**: Auto-generated buttons + `All` button
- **Color**: Auto-generated buttons + `All` button  
- **Bloom**: Auto-generated buttons + `All` button
- **Dynamic Card Types**: Auto-generated from actual data, supports "・" separated types

> 🧠 All filters use chip-style toggle buttons. "All" button clears other selections and becomes exclusive.

#### Statistics Dashboard
- Real-time count of:
  - Displayed cards
  - Owned cards  
  - Ownership rate (%)
- Always calculated from **full filtered set**, not just rendered items

#### Ownership Management
- Manual input per card (stored via `localStorage`)
- **CSV Import**: Accepts `id,ownedCount` format
- **CSV Export**: Copies owned data to clipboard
- Cross-page data synchronization

#### Mobile Optimization
- Responsive layout with 2-column grid for selects
- Optimized card detail modals
- Touch-friendly interface
- Dark mode toggle (persistent across pages)

---

## 🔍 Hololive Card Detail Search (`holoca_skill_page.html`) v4.5.0

A skill-based search tool for advanced filtering across card abilities with enhanced search normalization.

### ✅ Features

#### Enhanced Search Filters
- **Normalized Search**: ひらがな/カタカナ統一、大文字/小文字統一検索
- By card attributes:
  - Name / ID / Rarity / Type with normalized search
- By skills:
  - Skill text partial match with normalization
  - Leader / Normal skill separation
  - Cost type / HP trigger / Skill level condition
- Tags and products via dropdown match

#### Skill Logic Detection
- Auto-highlights keywords:
  - Buff/Debuff terms (ATK UP, DMG DOWN)
  - Activation timing (start, recovery)
  - HP thresholds, skill levels
- Visual emphasis to enhance parsing

#### Result Display
- Image thumbnails (clickable modal zoom)
- Ownership count (shared with list page)
- Grouped by product or card type
- Mobile-optimized layout

#### Statistics
- Total match count
- Total owned among results

---

## 🃏 Deck Builder (`deck_builder.html`) v4.5.0

Create and manage card decks with enhanced search and filtering capabilities.

### ✅ Features

#### Enhanced Deck Building
- **Normalized Search**: ひらがな/カタカナ統一、大文字/小文字統一検索
- Drag & drop card management
- Real-time deck validation
- Card count tracking
- Export/import functionality

#### Advanced Filters
- Color, rarity, type filtering with normalization
- Cost-based filtering
- Skill-based search
- Mobile-optimized interface

---

## 📚 Collection Binder (`collection_binder.html`) v4.5.2

Virtual binder for organizing your card collection with advanced features.

### ✅ Features

#### Dynamic Card Management
- **Enhanced Search**: ひらがな/カタカナ統一、大文字/小文字統一検索
- **Dynamic Card Type Filtering**: Auto-generated from actual data
- Drag & drop functionality
- Grid-based layout
- Real-time filtering

#### Advanced Filtering
- **Normalized Search**: All text searches use normalization
- Dynamic card type generation from data
- "・" separated card types displayed individually
- Mobile-optimized 2-column grid layout

#### Visual Enhancements
- Card hover effects
- Responsive design
- Dark mode support
- Touch-friendly interface

---

## 🗂️ Binder Collection (`binder_collection.html`) v4.2.0

Manage multiple binders with custom covers and descriptions.

### ✅ Features

#### Binder Management
- Create multiple binders
- Custom cover images
- Binder descriptions
- Independent data storage per binder

#### User Interface
- Mobile-optimized layout
- Responsive design
- Easy navigation between binders

---

## 🛠️ Technical Architecture

### Modular Service Worker Structure
- **`sw.js`**: Main Service Worker with event listeners
- **`sw-version.js`**: Version management and configuration
- **`sw-utils.js`**: Utility functions for version checking
- **`sw-handlers.js`**: Message handlers for client communication

### Progressive Web App Features
- **Offline Support**: Full functionality without internet
- **Caching Strategy**: Network-first for HTML, cache-first for assets
- **Background Sync**: Data updates when connection restored
- **Responsive Design**: Optimized for all device sizes

### Search Normalization
- **Text Normalization**: Converts hiragana ⇔ katakana for unified search
- **Case Insensitive**: Automatic case normalization
- **Cross-Page Consistency**: Same search behavior across all tools

### Data Management
- **LocalStorage**: Persistent data storage
- **Cross-Page Sync**: Shared data between tools
- **Import/Export**: CSV functionality for data portability

---

## 📱 Mobile Optimization

All tools are fully optimized for mobile devices:
- Touch-friendly interfaces
- 2-column grid layouts for space efficiency
- Responsive modals and overlays
- Optimized image loading
- Swipe gestures support

---

## 🚀 Getting Started

1. Open `index.html` in your web browser
2. Navigate to your desired tool
3. Start managing your Hololive card collection!

### PWA Installation
- Chrome/Edge: Click "Install" prompt or "Add to Home Screen"
- iOS Safari: Share → "Add to Home Screen"
- Android: "Add to Home Screen" from browser menu

---

## 🔧 Development

### Version Management
Version updates are centralized in `sw-version.js`. See `VERSION_UPGRADE_GUIDE.md` for upgrade procedures.

### File Structure
```
├── index.html                 # Main landing page
├── card_list.html            # Card browsing tool
├── holoca_skill_page.html    # Skill search tool
├── deck_builder.html         # Deck building tool
├── collection_binder.html    # Virtual binder
├── binder_collection.html    # Binder management
├── sw.js                     # Main service worker
├── sw-version.js             # Version configuration
├── sw-utils.js               # Utility functions
├── sw-handlers.js            # Message handlers
├── json_file/
│   ├── card_data.json        # Card database
│   └── release_dates.json    # Release information
└── images/                   # Asset images
```

---

## 📄 License & Legal Notice

### Software License
This project is licensed under the MIT License.

### Trademark & Copyright Notice
- "Hololive" and "hololive" are trademarks of Cover Corporation
- "ホロライブオフィシャルカードゲーム" (Hololive Official Card Game) is a trademark of Bushiroad Inc.
- This tool is an unofficial fan-made tool unrelated to Cover Corporation or Bushiroad Inc.
- Copyright of card data belongs to respective rights holders

### Disclaimer
The creator assumes no responsibility for any damages arising from the use of this tool. This tool is provided for educational, research purposes, and personal collection management.

---

## � トラブルシューティング / Troubleshooting

### バトルシミュレーター / Battle Simulator

#### エール配置時の一瞬の表示問題
**問題**: エールカード配置時に一瞬カード画像が"unknown"になる
**解決**: v4.5.2でUI更新タイミングを最適化し、State Manager同期完了後にUI更新を実行するよう修正済み

#### エールカードが表示されない
**症状**: エール配置が成功しているがカード上にエールが表示されない
**原因**: State Managerとバトルエンジン間のデータ同期の問題
**解決**: 自動的にデータ同期を実行し、エールカード情報を復元

#### フェーズ進行の問題
**症状**: エールステップで手動でフェーズを進めなければならない
**解決**: v4.5.2でエール配置完了後の自動フェーズ進行を実装

### 一般的な問題

#### Service Workerキャッシュの問題
**症状**: 更新が反映されない、古いバージョンが表示される
**解決**: ブラウザのデベロッパーツール > Application > Storage > Clear storage

#### モバイルでの表示問題
**症状**: カードモーダルが正しく表示されない
**解決**: v4.5.2でモバイル対応を強化、タッチ操作を最適化

---

## �📞 Support

For questions or issues, please open an issue on GitHub.

---

**ホロライブコミュニティのために ❤️ で作られました**

---

# English

## 🚀 Latest Update v4.5.0

**Major Search Improvements & Modular Structure**
- 🔤 Hiragana/Katakana unified search functionality
- 🔠 Case-insensitive unified search functionality
- 🏷️ Dynamic card type filter generation
- 📋 Individual display of "・" separated card types
- 📱 Mobile card detail modal improvements
- 🎨 Select box 2-column grid layout
- 🔧 Service Worker modular structure
- 📦 Utility function separation
- 🔄 Message handler separation
- ⚡ Code readability and maintainability improvements

## 🏠 Main Page (`index.html`) v4.5.0
