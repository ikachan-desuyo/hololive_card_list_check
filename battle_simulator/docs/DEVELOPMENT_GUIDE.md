# 開発者ガイド

## 開発環境構築

### 必要なツール
- Webブラウザ（Chrome推奨、開発者ツール使用）
- テキストエディタ（VS Code推奨）
- ローカルWebサーバー（Python、Node.js、Live Server拡張など）

### プロジェクト起動
```bash
# Pythonの場合
python -m http.server 8000

# Node.jsの場合
npx serve .

# VS Code Live Server拡張の場合
# index.htmlで右クリック → "Open with Live Server"
```

## 開発フロー

### 1. 新機能追加の基本フロー
1. **要件定義**: 機能の仕様を明確化
2. **設計**: 影響範囲とモジュール間の依存関係を確認
3. **実装**: 段階的な実装（小さな単位で動作確認）
4. **テスト**: 機能テストと既存機能への影響確認
5. **ドキュメント更新**: API参照やアーキテクチャ文書の更新

### 2. デバッグフロー
1. **問題特定**: エラーログとブラウザのDevToolsで原因調査
2. **再現**: 最小限の手順で問題を再現
3. **修正**: ピンポイントでの修正（影響範囲を最小化）
4. **検証**: 修正後の動作確認と副作用チェック

## コーディング規約

### ファイル構成
```
battle_simulator/
├── battle_engine.js          # メインエンジン（将来的に分割予定）
├── *.js                      # 各種管理クラス
├── docs/                     # ドキュメント
│   ├── ARCHITECTURE.md
│   ├── METHODS.md
│   ├── STATE_FLOW.md
│   ├── TROUBLESHOOTING.md
│   ├── API_REFERENCE.md
│   └── DEVELOPMENT_GUIDE.md
└── *.md                      # 設計・実装ログ
```

### JavaScript命名規約
```javascript
// クラス名: PascalCase
class HololiveBattleEngine {}

// メソッド名: camelCase
updateGameState() {}

// 定数: UPPER_SNAKE_CASE
const PHASE_NAMES = {};

// 変数: camelCase
const currentPlayer = 1;

// プライベートメソッド: アンダースコア始まり
_internalMethod() {}
```

### コメント規約
```javascript
/**
 * 関数の説明
 * @param {type} paramName - パラメータの説明
 * @returns {type} 戻り値の説明
 */
function exampleFunction(paramName) {
    // 処理の説明
    return result;
}

// TODO: 今後の改善点
// FIXME: 修正が必要な箇所
// NOTE: 重要な注意点
```

## 重要な開発パターン

### 1. 状態管理パターン
```javascript
// 状態更新時は必ずStateManagerを経由
battleEngine.stateManager.updateState('UPDATE_GAME_STATE', {
    property: 'currentPhase',
    value: newPhase
});

// 直接的な状態変更は避ける（デバッグが困難になる）
// ❌ 悪い例
battleEngine.gameState.currentPhase = newPhase;

// ✅ 良い例
battleEngine.stateManager.updateState('UPDATE_GAME_STATE', {
    property: 'currentPhase',
    value: newPhase
});
```

### 2. エラーハンドリングパターン
```javascript
function safeOperation() {
    try {
        // 危険な処理
        const result = riskyOperation();
        return { success: true, data: result };
    } catch (error) {
        errorLog('Operation failed:', error);
        return { success: false, error: error.message };
    }
}
```

### 3. UI更新パターン
```javascript
// UI更新時はバッチ処理で効率化
function updateMultipleUIElements() {
    // DOM操作をまとめて実行
    const elements = document.querySelectorAll('.update-target');
    elements.forEach(element => {
        // 複数の変更をまとめて適用
        element.classList.add('updated');
        element.textContent = 'New content';
    });
    
    // 最後に一括でreflowを発生させる
    battleEngine.updateUI();
}
```

### 4. モジュール間通信パターン
```javascript
// 他のモジュールと連携する際の推奨パターン
class ModuleA {
    doSomething() {
        // 1. 自分の責務を実行
        this.performLocalOperation();
        
        // 2. 他モジュールへ通知（直接呼び出しではなくイベント経由推奨）
        document.dispatchEvent(new CustomEvent('moduleACompleted', {
            detail: { result: 'success' }
        }));
    }
}
```

## テスト手法

### 1. 手動テストチェックリスト
```
□ ゲーム開始
□ カード配置（各エリア）
□ フェーズ進行
□ ターン切り替え
□ ゲーム終了
□ エラーハンドリング
□ ブラウザのDevToolsでエラー確認
```

### 2. デバッグツール活用
```javascript
// ブラウザコンソールでの動作確認
console.log('Current state:', battleEngine.stateManager.getState());
console.log('Player 1 hand:', battleEngine.players[1].cards.hand);

// ブレークポイント設定
debugger; // この行で実行が一時停止

// パフォーマンス測定
console.time('operation');
// 測定したい処理
console.timeEnd('operation');
```

### 3. バグ報告テンプレート
```
■ 問題の概要
（簡潔な説明）

■ 再現手順
1. 
2. 
3. 

■ 期待される動作


■ 実際の動作


■ 環境情報
- ブラウザ: 
- 画面サイズ: 
- エラーメッセージ: 

■ 追加情報
（スクリーンショット、ログなど）
```

## パフォーマンス最適化

### 1. 一般的な最適化ポイント
```javascript
// DOM操作の最小化
// ❌ 悪い例：ループ内でDOM操作
cards.forEach(card => {
    document.getElementById('area').appendChild(createCardElement(card));
});

// ✅ 良い例：DocumentFragmentを使用
const fragment = document.createDocumentFragment();
cards.forEach(card => {
    fragment.appendChild(createCardElement(card));
});
document.getElementById('area').appendChild(fragment);
```

### 2. メモリリーク対策
```javascript
// イベントリスナーの適切な削除
class UIComponent {
    constructor() {
        this.handleClick = this.handleClick.bind(this);
        document.addEventListener('click', this.handleClick);
    }
    
    destroy() {
        document.removeEventListener('click', this.handleClick);
    }
    
    handleClick(event) {
        // ハンドラー処理
    }
}
```

### 3. 大量データの処理
```javascript
// 仮想化やページネーションの検討
function displayLargeDataSet(data) {
    const CHUNK_SIZE = 100;
    let index = 0;
    
    function processChunk() {
        const chunk = data.slice(index, index + CHUNK_SIZE);
        chunk.forEach(item => processItem(item));
        
        index += CHUNK_SIZE;
        if (index < data.length) {
            // 次のチャンクを非同期で処理
            setTimeout(processChunk, 0);
        }
    }
    
    processChunk();
}
```

## よくある問題と対処法

### 1. カード配置の問題
```javascript
// 問題: カードが配置できない
// 確認ポイント:
// 1. 配置可能な状態か？
const canPlace = battleEngine.placementController.canPlaceCard(card, area);

// 2. 正しいプレイヤーのターンか？
const isCurrentPlayer = battleEngine.turnManager.getCurrentPlayer() === playerId;

// 3. 適切なフェーズか？
const validPhase = battleEngine.gameState.currentPhase === PHASES.MAIN;
```

### 2. 状態同期の問題
```javascript
// 問題: UI表示と内部状態が一致しない
// 対処法: 状態変更後は必ずUI更新
function updateGamePhase(newPhase) {
    battleEngine.stateManager.updateState('UPDATE_GAME_STATE', {
        property: 'currentPhase',
        value: newPhase
    });
    
    // UI更新を忘れずに
    battleEngine.updateUI();
}
```

### 3. メモリ使用量の問題
```javascript
// 問題: ゲーム続行でメモリ使用量増加
// 対処法: 不要なオブジェクトの明示的削除
function cleanupGameState() {
    // 大きなオブジェクトの参照削除
    battleEngine.players[1].cards.archive = [];
    battleEngine.players[2].cards.archive = [];
    
    // イベントリスナーの削除
    document.removeEventListener('click', someHandler);
}
```

## Future Roadmap

### 短期計画（1-2ヶ月）
- [ ] battle_engine.jsのモジュール分割
- [ ] 自動テストの導入
- [ ] エラーログの改善

### 中期計画（3-6ヶ月）
- [ ] TypeScript導入の検討
- [ ] パフォーマンス最適化
- [ ] UI/UXの改善

### 長期計画（6ヶ月以上）
- [ ] モバイル対応
- [ ] オンライン対戦機能
- [ ] AI対戦の強化

## 貢献ガイドライン

### Pull Request前のチェックリスト
- [ ] 既存機能への影響確認
- [ ] コードレビューの準備（コメント追加）
- [ ] ドキュメントの更新
- [ ] 手動テストの実施

### コードレビューポイント
1. **機能性**: 仕様通りに動作するか
2. **可読性**: コードが理解しやすいか
3. **保守性**: 将来の変更に対応しやすいか
4. **パフォーマンス**: 効率的に動作するか
5. **エラーハンドリング**: 適切にエラーを処理しているか

## リソース

### 参考ドキュメント
- [ARCHITECTURE.md](./ARCHITECTURE.md) - システム全体の構造
- [METHODS.md](./METHODS.md) - メソッド一覧
- [STATE_FLOW.md](./STATE_FLOW.md) - 状態遷移
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - トラブルシューティング
- [API_REFERENCE.md](./API_REFERENCE.md) - API仕様

### 外部リソース
- [MDN Web Docs](https://developer.mozilla.org/) - JavaScript/Web API仕様
- [Chrome DevTools Documentation](https://developers.google.com/web/tools/chrome-devtools) - デバッグ手法

### 開発ツール推奨設定
```json
// VS Code settings.json
{
    "editor.tabSize": 4,
    "editor.insertSpaces": true,
    "files.eol": "\n",
    "javascript.preferences.quoteStyle": "single"
}
```
