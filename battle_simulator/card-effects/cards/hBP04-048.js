/**
 * 雪花ラミィ (hBP04-048_RR) - 2ndブルーム
 * ブルームエフェクト「ユニーリアの令嬢」
 */

(function() {
  const cardEffect = {
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

  // 手動トリガー「今日も祝福がありますように」
  manualTrigger: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    const opponent = currentPlayer === 1 ? 2 : 1;
    
    try {
      // このカードのエールを1枚アーカイブ
      const cardPosition = utils.findCardPosition(currentPlayer, card.id);
      
      if (!cardPosition || !cardPosition.attachments || cardPosition.attachments.length === 0) {
        return { success: false, reason: 'エールが付いていません' };
      }
      
      // エールを1枚アーカイブ
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

  // カード効果をグローバルに登録
  if (typeof window !== 'undefined' && window.cardEffects) {
    window.cardEffects[cardEffect.cardId] = cardEffect;
  }

  // Node.js環境でのエクスポート
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = cardEffect;
  }
})();
