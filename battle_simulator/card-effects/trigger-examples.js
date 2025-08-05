/**
 * カード効果の具体例とトリガーの使用方法
 * 様々な発動タイミングのカード実装例
 */

// === コラボ時発動効果の例 ===
const CollabTriggerExample = {
  cardId: 'example_collab_card',
  name: 'コラボ時効果カード',
  triggers: ['on_collab'],
  requireOnStage: true,
  
  condition: async (eventData, battleEngine) => {
    // コラボした時、このカードがセンターにいる場合のみ発動
    const player = battleEngine.players[eventData.playerId];
    return player.center && player.center.id === 'example_collab_card';
  },
  
  execute: async (card, eventData, battleEngine) => {
    const currentPlayer = eventData.playerId;
    const player = battleEngine.players[currentPlayer];
    
    // コラボした時の効果：1枚ドロー
    if (player.deck.length > 0) {
      const drawnCard = player.deck.shift();
      player.hand.push(drawnCard);
      
      return {
        success: true,
        message: `${card.name}の効果で1枚ドローしました`
      };
    }
    
    return { success: false, reason: 'デッキにカードがありません' };
  }
};

// === ブルーム時発動効果の例 ===
const BloomTriggerExample = {
  cardId: 'example_bloom_card',
  name: 'ブルーム時効果カード',
  triggers: ['on_bloom'],
  requireOnStage: false, // ブルーム対象カード自体なのでfalse
  
  condition: async (eventData, battleEngine) => {
    // このカードがブルーム対象の場合のみ発動
    return eventData.card && eventData.card.id === 'example_bloom_card';
  },
  
  execute: async (card, eventData, battleEngine) => {
    const currentPlayer = eventData.playerId;
    const player = battleEngine.players[currentPlayer];
    
    // ブルームした時の効果：相手にダメージ
    const opponent = battleEngine.players[currentPlayer === 1 ? 2 : 1];
    
    // 相手のライフを1減らす
    if (opponent.life > 0) {
      opponent.life -= 1;
      
      return {
        success: true,
        message: `${card.name}のブルーム効果で相手にダメージ！`
      };
    }
    
    return { success: false, reason: '相手のライフが0です' };
  }
};

// === 任意タイミング起動効果の例 ===
const ActivateEffectExample = {
  cardId: 'example_activate_card',
  name: '起動効果カード',
  triggers: ['activate', 'manual_trigger'],
  requireOnStage: true,
  
  condition: async (eventData, battleEngine) => {
    // メインステップで、このカードがステージにある時のみ使用可能
    const phase = battleEngine.stateManager.state.turn.currentPhase;
    if (phase !== 3) return false;
    
    const card = battleEngine.cardEffectTriggerSystem.findCardOnStage(
      'example_activate_card', 
      eventData.playerId
    );
    return card !== null;
  },
  
  execute: async (card, eventData, battleEngine) => {
    const currentPlayer = eventData.playerId;
    const player = battleEngine.players[currentPlayer];
    
    // 起動効果：手札とアーカイブから1枚ずつ選んで交換
    if (player.hand.length > 0 && player.archive.length > 0) {
      // 簡易実装：ランダムに選択
      const handCard = player.hand.pop();
      const archiveCard = player.archive.pop();
      
      player.hand.push(archiveCard);
      player.archive.push(handCard);
      
      return {
        success: true,
        message: `${card.name}の起動効果で手札とアーカイブのカードを交換しました`
      };
    }
    
    return { success: false, reason: '手札またはアーカイブにカードがありません' };
  }
};

// === フェーズ開始時効果の例 ===
const PhaseStartExample = {
  cardId: 'example_phase_card',
  name: 'フェーズ開始時効果カード',
  triggers: ['on_main_step'],
  requireOnStage: true,
  
  condition: async (eventData, battleEngine) => {
    // 自分のターンのメインステップ開始時のみ
    const currentTurn = battleEngine.stateManager.state.turn.currentPlayer;
    return eventData.playerId === currentTurn;
  },
  
  execute: async (card, eventData, battleEngine) => {
    const currentPlayer = eventData.playerId;
    const player = battleEngine.players[currentPlayer];
    
    // メインステップ開始時の効果：エールを1つ追加
    const centerCard = player.center;
    if (centerCard) {
      // エール追加のロジック（簡易実装）
      if (!centerCard.yellCards) centerCard.yellCards = [];
      
      // デッキからエールを検索（簡易実装）
      const yellCard = player.deck.find(c => c.card_type?.includes('エール'));
      if (yellCard) {
        const deckIndex = player.deck.indexOf(yellCard);
        player.deck.splice(deckIndex, 1);
        centerCard.yellCards.push(yellCard);
        
        return {
          success: true,
          message: `${card.name}の効果でセンターにエールを付けました`
        };
      }
    }
    
    return { success: false, reason: 'センターカードがないか、デッキにエールがありません' };
  }
};

// === 常在効果の例 ===
const PassiveEffectExample = {
  cardId: 'example_passive_card',
  name: '常在効果カード',
  triggers: ['while_present'],
  requireOnStage: true,
  
  // 常在効果は特別な処理が必要
  applyPassiveEffect: (battleEngine, playerId) => {
    // 例：このカードがステージにいる間、手札上限+1
    const player = battleEngine.players[playerId];
    if (!player.modifiers) player.modifiers = {};
    player.modifiers.handLimit = (player.modifiers.handLimit || 0) + 1;
  },
  
  removePassiveEffect: (battleEngine, playerId) => {
    // 効果を削除
    const player = battleEngine.players[playerId];
    if (player.modifiers && player.modifiers.handLimit) {
      player.modifiers.handLimit -= 1;
    }
  }
};

// === 条件満たした時の効果例 ===
const ConditionalTriggerExample = {
  cardId: 'example_conditional_card',
  name: '条件効果カード',
  triggers: ['condition_met'],
  
  // 条件チェック関数
  checkCondition: (battleEngine, playerId) => {
    const player = battleEngine.players[playerId];
    // 例：ステージに3色以上のホロメンがいる
    const stageCards = [
      player.center, player.collab,
      player.back1, player.back2, player.back3, player.back4, player.back5
    ].filter(card => card && card.card_type?.includes('ホロメン'));
    
    const colors = [...new Set(stageCards.map(card => card.card_color))];
    return colors.length >= 3;
  },
  
  execute: async (card, eventData, battleEngine) => {
    // 条件を満たした時の効果：強力な効果を発動
    return {
      success: true,
      message: `${card.name}の条件効果が発動しました！`
    };
  }
};

// トリガーの登録例
if (typeof window !== 'undefined' && window.battleEngine && window.battleEngine.cardEffectTriggerSystem) {
  const triggerSystem = window.battleEngine.cardEffectTriggerSystem;
  
  // 各効果を登録
  triggerSystem.registerCardTrigger('example_collab_card', CollabTriggerExample);
  triggerSystem.registerCardTrigger('example_bloom_card', BloomTriggerExample);
  triggerSystem.registerCardTrigger('example_activate_card', ActivateEffectExample);
  triggerSystem.registerCardTrigger('example_phase_card', PhaseStartExample);
  triggerSystem.registerCardTrigger('example_passive_card', PassiveEffectExample);
  triggerSystem.registerCardTrigger('example_conditional_card', ConditionalTriggerExample);
}
