/**
 * ラミィデッキカード効果実装
 * 雪花ラミィ関連のカード効果
 */

// 雪花ラミィ (hBP04-048_RR) - 2ndブルーム
const YukihanaLamyRR = {
  cardId: 'hBP04-048_RR',
  name: '雪花ラミィ',
  type: 'holomen',
  triggers: [
    { type: 'on_bloom', timing: 'on_bloom' } // ブルームエフェクトのみ
  ],
  
  // ブルームエフェクト「ユニーリアの令嬢」
  onBloomEffect: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    
    try {
      // 〈雪民〉が付いている〈雪花ラミィ〉を検索
      const stageHolomens = utils.getStageHolomens(currentPlayer);
      const lamyWithYukimin = stageHolomens.filter(h => 
        h.card.name && h.card.name.includes('雪花ラミィ') &&
        h.attachments && h.attachments.some(att => att.name && att.name.includes('雪民'))
      );
      
      if (lamyWithYukimin.length === 0) {
        return { success: false, reason: '〈雪民〉が付いている〈雪花ラミィ〉がいません' };
      }
      
      // エールデッキの上から1枚を対象のラミィに送る
      const player = battleEngine.players[currentPlayer];
      if (player.yellDeck && player.yellDeck.length > 0) {
        const yellCard = player.yellDeck.shift();
        const targetLamy = lamyWithYukimin[0]; // 最初の条件を満たすラミィ
        
        if (!targetLamy.attachments) targetLamy.attachments = [];
        targetLamy.attachments.push(yellCard);
        
        utils.updateDisplay();
        
        return {
          success: true,
          message: `${targetLamy.card.name}にエール1枚を付けました`
        };
      }
      
      return { success: false, reason: 'エールデッキにカードがありません' };
    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
  },
  
  // アーツ「今日も祝福がありますように」（手動発動）
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    const opponent = currentPlayer === 1 ? 2 : 1;
    
    try {
      // このホロメンのエール1枚をアーカイブできるかチェック
      const cardPosition = utils.findCardPosition(currentPlayer, card.id);
      if (!cardPosition || !cardPosition.attachments || cardPosition.attachments.length === 0) {
        return { success: false, reason: 'エールが付いていません' };
      }
      
      // エール1枚をアーカイブ
      const yellToArchive = cardPosition.attachments.shift();
      const archiveResult = utils.archiveCards(currentPlayer, [yellToArchive]);
      
      if (archiveResult.success) {
        // 相手のセンターホロメンかバックホロメンに特殊ダメージ30
        const opponentHolomens = utils.getStageHolomens(opponent);
        if (opponentHolomens.length > 0) {
          // 簡易実装：最初のホロメンにダメージ
          const target = opponentHolomens[0];
          const damageResult = utils.dealDamage(opponent, 30, {
            source: card,
            type: 'special',
            target: target.card.id
          });
          
          utils.updateDisplay();
          
          return {
            success: true,
            message: `エールをアーカイブし、${target.card.name}に特殊ダメージ30を与えました`
          };
        }
      }
      
      return { success: false, reason: '効果を実行できませんでした' };
    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
  }
};

// 雪花ラミィ (hBP04-043_C) - 基本形
const YukihanaLamyC = {
  cardId: 'hBP04-043_C',
  name: '雪花ラミィ',
  type: 'holomen',
  
  // 基本的なホロメンカード（特殊効果なし）
  execute: async (card, context, battleEngine) => {
    return {
      success: true,
      message: '雪花ラミィが場に出ました'
    };
  }
};

// 雪民 (hBP04-106_U) - ファンカード
const Yukimin = {
  cardId: 'hBP04-106_U',
  name: '雪民',
  type: 'fan',
  triggers: [{ type: 'gift', timing: 'gift' }], // ギフト効果
  
  // ギフト効果（場にいる間常時発動）
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    
    try {
      // 付けられたホロメンが〈雪花ラミィ〉の場合の特殊効果
      if (context.targetCard && context.targetCard.name && context.targetCard.name.includes('雪花ラミィ')) {
        // ラミィに雪民が付いた時の効果（将来的に実装予定）
        return {
          success: true,
          message: '雪民が雪花ラミィに付きました（ギフト効果有効）'
        };
      }
      
      return {
        success: true,
        message: '雪民のギフト効果が発動中'
      };
    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
  }
};

// サポートカード例：hBP04-101_C
const SupportCard101 = {
  cardId: 'hBP04-101_C',
  name: 'サポートカード',
  type: 'support',
  triggers: [{ type: 'manual_trigger', timing: 'manual_trigger' }],
  
  canActivate: (card, context, battleEngine) => {
    const currentPhase = battleEngine.gameState.currentPhase;
    return currentPhase === 3; // メインフェーズのみ
  },
  
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    
    try {
      // 基本的なドロー効果（カードの詳細仕様に応じて調整）
      const drawResult = utils.drawCards(currentPlayer, 1);
      utils.updateDisplay();
      
      return {
        success: true,
        message: `${drawResult.cards.length}枚ドローしました`
      };
    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
  }
};

// 基本エール (hY04-001_C)
const BasicYell = {
  cardId: 'hY04-001_C',
  name: '基本エール',
  type: 'yell',
  
  execute: async (card, context, battleEngine) => {
    return {
      success: true,
      message: '基本エールが付きました'
    };
  }
};

// コラボエフェクト例：仮想的なコラボカード
const CollabEffectSample = {
  cardId: 'hBP04-999_SAMPLE',
  name: 'コラボエフェクトサンプル',
  type: 'holomen',
  triggers: [{ type: 'on_collab', timing: 'on_collab' }], // コラボエフェクト
  
  // コラボエフェクト（バックからコラボに移動した時のみ発動）
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    
    try {
      // デッキからカードをドロー
      const drawResult = utils.drawCards(currentPlayer, 1);
      
      if (drawResult.success) {
        return {
          success: true,
          message: 'コラボエフェクト：カードを1枚ドローしました'
        };
      }
      
      return { success: false, reason: 'ドローできませんでした' };
    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
  }
};

// カード効果を登録
if (typeof window !== 'undefined') {
  if (!window.cardEffects) window.cardEffects = {};
  
  // ラミィデッキのカード効果を登録
  window.cardEffects['hBP04-048_RR'] = YukihanaLamyRR;
  window.cardEffects['hBP04-043_C'] = YukihanaLamyC;
  window.cardEffects['hBP04-106_U'] = Yukimin;
  window.cardEffects['hBP04-101_C'] = SupportCard101;
  window.cardEffects['hY04-001_C'] = BasicYell;
  window.cardEffects['hBP04-999_SAMPLE'] = CollabEffectSample; // コラボエフェクトサンプル
  
    'hBP04-048_RR': '雪花ラミィ(RR) - ブルームエフェクト',
    'hBP04-043_C': '雪花ラミィ(C)', 
    'hBP04-106_U': '雪民 - ギフト',
    'hBP04-101_C': 'サポートカード',
    'hY04-001_C': '基本エール',
    'hBP04-999_SAMPLE': 'コラボエフェクトサンプル'
  });
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    YukihanaLamyRR,
    YukihanaLamyC,
    Yukimin,
    SupportCard101,
    BasicYell
  };
}
