# バトルシミュレーター 実装フロー詳細

## 実装フロー概要

バトルシミュレーターの実装は以下の順序で実行されます：

```
1. システム初期化 → 2. デッキ準備 → 3. ゲーム開始 → 4. ターン実行 → 5. 勝利判定
```

## 1. システム初期化フロー

### 1.1 アプリケーション起動
```mermaid
sequenceDiagram
    participant HTML as battle_simulator.html
    participant BE as BattleEngine
    participant SCEM as ScalableCardEffectManager
    participant SM as StateManager
    participant UI as UI Managers
    
    HTML->>BE: new HololiveBattleEngine()
    BE->>SCEM: new ScalableCardEffectManager()
    BE->>SM: new HololiveStateManager()
    BE->>UI: 各UI Manager初期化
    SCEM->>SCEM: initializeSystem()
    SCEM->>SCEM: registerEffectPatterns()
    BE->>BE: initializeGame()
    BE->>HTML: 初期化完了
```

### 1.2 カード効果システム初期化
```javascript
// ScalableCardEffectManager初期化
async initializeSystem() {
  // 1. 効果パターンテンプレート登録
  this.registerEffectPatterns();
  
  // 2. メタデータキャッシュ準備
  this.cardMetadata = new Map();
  
  // 3. 動的読み込みシステム準備
  this.loadedEffects = new Set();
  
  console.log('✅ カード効果システム初期化完了');
}
```

## 2. デッキ準備フロー

### 2.1 デッキ選択時の軽量初期化
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant GSM as GameSetupManager
    participant SCEM as ScalableCardEffectManager
    participant CDL as CardDataLoader
    
    User->>GSM: デッキ選択
    GSM->>CDL: loadCardData()
    GSM->>SCEM: prepareDeckCards(deckData)
    SCEM->>SCEM: カードメタデータ読み込み
    SCEM->>SCEM: 効果パターン検出
    SCEM->>GSM: 軽量初期化完了
    GSM->>User: デッキ準備完了
```

### 2.2 メタデータ事前読み込み
```javascript
// デッキカードのメタデータを事前読み込み
async prepareDeckCards(deckData) {
  const cardIds = this.extractCardIds(deckData);
  
  for (const cardId of cardIds) {
    // 軽量メタデータのみ読み込み
    await this.loadCardMetadata(cardId);
  }
  
  console.log(`📋 ${cardIds.size}枚のカードメタデータ準備完了`);
}
```

## 3. ゲーム開始フロー

### 3.1 ゲーム開始処理
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant BE as BattleEngine
    participant GSM as GameSetupManager
    participant SCEM as ScalableCardEffectManager
    participant SM as StateManager
    
    User->>BE: startGame()
    BE->>GSM: setupGame()
    GSM->>SCEM: initializeDeckCards()
    SCEM->>SCEM: カード効果ファイル読み込み
    GSM->>SM: プレイヤー状態初期化
    GSM->>GSM: デッキシャッフル
    GSM->>GSM: 初期手札配布
    BE->>BE: 先行後攻決定
    BE->>BE: マリガン開始
    BE->>User: ゲーム開始
```

### 3.2 カード効果本格初期化
```javascript
// ゲーム開始時のカード効果初期化
async initializeDeckCards(deckData) {
  const cardIds = this.extractCardIds(deckData);
  const highPriorityCards = this.getHighPriorityCards(cardIds);
  
  // 高優先度カードを先に読み込み
  for (const cardId of highPriorityCards) {
    await this.loadCardEffect(cardId);
  }
  
  // 残りは必要時に遅延読み込み
  console.log(`🃏 ${highPriorityCards.length}枚の効果を事前読み込み`);
}
```

## 4. ターン実行フロー

### 4.1 フェーズ進行システム
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant PC as PhaseController
    participant PM as PerformanceManager
    participant SM as StateManager
    participant CDM as CardDisplayManager
    
    User->>PC: nextPhase()
    PC->>SM: 現在フェーズ取得
    PC->>PC: フェーズ処理実行
    
    alt パフォーマンスフェーズ
        PC->>PM: startPerformancePhase()
        PM->>PM: highlightAttackableCards()
        PM->>CDM: 攻撃可能マーク表示
    else その他フェーズ
        PC->>PC: 標準フェーズ処理
    end
    
    PC->>SM: 次フェーズに更新
    PC->>CDM: フェーズ表示更新
```

### 4.2 カード効果発動フロー
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant CIM as CardInteractionManager
    participant SCEM as ScalableCardEffectManager
    participant SM as StateManager
    participant CDM as CardDisplayManager
    
    User->>CIM: カードクリック
    CIM->>CIM: showCardInfo()
    CIM->>CIM: showActionMarks()
    User->>CIM: 効果発動選択
    CIM->>SCEM: executeEffect(card, type, context)
    
    alt 効果未読み込み
        SCEM->>SCEM: loadCardEffect(cardId)
        SCEM->>SCEM: ファイル動的読み込み
    end
    
    SCEM->>SCEM: 効果実行
    SCEM->>SM: 状態更新
    SM->>CDM: UI更新通知
    CDM->>User: 効果結果表示
```

### 4.3 攻撃処理フロー
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant PM as PerformanceManager
    participant SM as StateManager
    participant CDM as CardDisplayManager
    
    User->>PM: 攻撃カード選択
    PM->>PM: setCurrentAttacker()
    PM->>PM: getValidTargets()
    PM->>CDM: ターゲットハイライト
    User->>PM: ターゲット選択
    PM->>PM: executeAttack()
    PM->>PM: calculateDamage()
    PM->>PM: dealDamage()
    
    alt カード撃破
        PM->>PM: destroyCard()
        PM->>PM: lifeToYellPlacement()
        PM->>CDM: エール配置UI表示
    end
    
    PM->>SM: 戦闘結果反映
    SM->>CDM: UI更新
```

## 5. 状態管理フロー

### 5.1 状態更新システム
```mermaid
sequenceDiagram
    participant Module as 各Module
    participant SM as StateManager
    participant Proxy as State Proxy
    participant UI as UI Components
    
    Module->>SM: updateState(action, payload)
    SM->>Proxy: 状態変更実行
    Proxy->>Proxy: 変更検証
    Proxy->>Proxy: 変更履歴記録
    Proxy->>SM: 変更通知
    SM->>UI: UI更新イベント発行
    UI->>UI: 差分更新実行
```

### 5.2 デバウンス処理
```javascript
// CardDisplayManagerでのデバウンス処理
updateCardAreas() {
  if (this.updateDebounceTimer) {
    clearTimeout(this.updateDebounceTimer);
  }
  
  this.updateDebounceTimer = setTimeout(() => {
    this.performActualUpdate();
    this.updateDebounceTimer = null;
  }, 16); // 60FPS相当
}
```

## 6. エラーハンドリング・フォールバック

### 6.1 段階的エラーハンドリング
```javascript
// ScalableCardEffectManagerでのエラーハンドリング
async executeEffect(card, triggerType, context) {
  try {
    // メイン処理
    const effect = await this.loadCardEffect(card.id);
    return await effect.execute(card, context, this.battleEngine);
    
  } catch (primaryError) {
    console.warn(`[Effect] 効果実行失敗: ${card.id}`, primaryError);
    
    try {
      // フォールバック: パターン効果
      const pattern = this.detectEffectPattern(card);
      return await this.executePatternEffect(card, pattern, context);
      
    } catch (fallbackError) {
      console.error(`[Effect] フォールバック失敗: ${card.id}`, fallbackError);
      
      // 最終フォールバック: 効果なし
      return { 
        success: false, 
        reason: '効果実行に失敗しました',
        fallback: true 
      };
    }
  }
}
```

### 6.2 UI更新エラー対応
```javascript
// CardDisplayManagerでのエラー対応
displayCardsInArea(area, cards, areaId, playerId) {
  try {
    this.performCardDisplay(area, cards, areaId, playerId);
  } catch (error) {
    console.error(`[Display] カード表示エラー: ${areaId}`, error);
    
    // フォールバック: 最小限表示
    this.displayMinimalCards(area, cards, areaId);
    
    // エラー報告
    this.reportDisplayError(error, areaId);
  }
}
```

## 7. パフォーマンス最適化実装

### 7.1 遅延読み込み戦略
```javascript
// 必要時のみカード効果を読み込み
async loadCardEffect(cardId) {
  // キャッシュ確認
  if (this.loadedEffects.has(cardId)) {
    return this.effectRegistry.get(cardId);
  }
  
  // メタデータで判定
  const metadata = await this.loadCardMetadata(cardId);
  if (!metadata.hasCustomEffect) {
    return this.getPatternEffect(metadata.effectPattern);
  }
  
  // 動的読み込み実行
  return await this.loadCustomEffect(cardId);
}
```

### 7.2 バッチ処理実装
```javascript
// 複数カードの並列読み込み
async batchLoadEffects(cardIds) {
  const batchSize = this.batchSize;
  const results = [];
  
  for (let i = 0; i < cardIds.length; i += batchSize) {
    const batch = cardIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(cardId => this.loadCardEffect(cardId))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

## 8. デバッグ・監視システム

### 8.1 リアルタイム状態監視
```javascript
// StateManagerでの状態変更追跡
updateState(action, payload) {
  const before = this.getStateSnapshot();
  
  try {
    this.performStateUpdate(action, payload);
    const after = this.getStateSnapshot();
    
    // 変更ログ
    this.logStateChange(action, before, after);
    
    // パフォーマンス監視
    this.updatePerformanceMetrics(action);
    
  } catch (error) {
    this.handleStateError(error, action, payload);
  }
}
```

### 8.2 詳細ログシステム
```javascript
// 統一ログフォーマット
log(level, module, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    module,
    message,
    data,
    gameState: this.getGameStateContext()
  };
  
  console[level](`[${module}] ${message}`, data);
  this.logHistory.push(logEntry);
}
```

この実装フローにより、バトルシミュレーターは拡張性とパフォーマンスを両立した堅牢なシステムとして動作します。
