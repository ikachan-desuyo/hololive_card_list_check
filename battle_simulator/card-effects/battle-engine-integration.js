/**
 * Battle Engineへのカード効果システム統合
 * 既存のBattle Engineに効果システムを組み込む
 */

// Battle Engine拡張
class BattleEngineCardEffects {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.cardEffectManager = new CardEffectManager(battleEngine);
    this.effectRegistry = new EffectRegistry();
    
    // 効果システムを初期化
    this.initializeEffectSystem();
  }

  /**
   * 効果システムの初期化
   */
  initializeEffectSystem() {
    // カード効果ファイルを動的に読み込み
    this.loadCardEffects();
    
    // Battle Engineのメソッドを拡張
    this.extendBattleEngine();
  }

  /**
   * カード効果ファイルの読み込み
   */
  async loadCardEffects() {
    // 実装済みカード効果を読み込み
    const effectFiles = [
      'card-effects/cards/hBP04-089.js',
      // 他のカード効果ファイルを追加
    ];

    for (const file of effectFiles) {
      try {
        await this.loadScript(file);
      } catch (error) {
      }
    }
  }

  /**
   * スクリプトの動的読み込み
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Battle Engineのメソッド拡張
   */
  extendBattleEngine() {
    const originalThis = this;

    // カード使用時の効果実行
    this.battleEngine.executeCardEffect = function(card, triggerType, context = {}) {
      return originalThis.cardEffectManager.executeEffect(card, triggerType, context);
    };

    // 効果発動可能かチェック
    this.battleEngine.canActivateCardEffect = function(card, triggerType, context = {}) {
      return originalThis.cardEffectManager.canActivateEffect(card, triggerType, context);
    };

    // サポートカード使用時の処理を拡張
    const originalPlaySupportCard = this.battleEngine.playSupportCard;
    this.battleEngine.playSupportCard = function(card, handIndex) {
      // 効果が実装されているかチェック
      if (originalThis.cardEffectManager.effectRegistry.has(card.id)) {
        // カード効果を実行
        const result = originalThis.cardEffectManager.executeEffect(card, 'execute', {
          source: 'hand',
          handIndex: handIndex
        });
        
        if (result.success) {
          // 手札から除去
          this.players[this.gameState.currentPlayer].hand.splice(handIndex, 1);
          // アーカイブに追加
          this.players[this.gameState.currentPlayer].archive.push(card);
          // UI更新
          this.updateDisplay();
        } else {
          alert(`効果を実行できませんでした: ${result.reason}`);
        }
        
        return result;
      } else {
        // 従来の処理
        if (originalPlaySupportCard) {
          return originalPlaySupportCard.call(this, card, handIndex);
        } else {
          return { success: false, reason: '効果未実装' };
        }
      }
    };
  }
}

// Battle Engine初期化時に効果システムを組み込み
if (typeof window !== 'undefined') {
  window.BattleEngineCardEffects = BattleEngineCardEffects;
  
  // 既存のBattle Engine初期化時に自動的に組み込み
  document.addEventListener('DOMContentLoaded', () => {
    if (window.battleEngine) {
      window.battleEngine.cardEffects = new BattleEngineCardEffects(window.battleEngine);
    }
  });
}
