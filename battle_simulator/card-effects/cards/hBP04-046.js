/**
 * hBP04-046 - カード効果定義
 * 雪花ラミィ (1stホロメン)
 */

// カード効果の定義
const cardEffect_hBP04_046 = {
  // カード基本情報
  cardId: 'hBP04-046',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  color: '青',
  bloomLevel: '1st',
  hp: 130,
  
  // 効果定義
  effects: {
    // アーツ: いっぱい頑張るよ！
    art1: {
      type: 'art',
      name: 'いっぱい頑張るよ！',
      description: '自分のファンが付いているホロメンがいる時、相手のホロメン1人に特殊ダメージ10を与える。',
      cost: { any: 1 },
      damage: 30, // 基本ダメージ
      timing: 'manual',
      auto_trigger: 'arts', // アーツ使用時に自動モーダル表示
      condition: (card, gameState, battleEngine) => {
        // any色1個のエール必要
        const totalYells = card.yellCards ? card.yellCards.length : 0;
        return totalYells >= 1;
      },
      effect: (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP04-046'}の「いっぱい頑張るよ！」が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const opponentPlayer = currentPlayer === 0 ? 1 : 0;
        const utils = new CardEffectUtils(battleEngine);
        
        // 基本30ダメージを相手に与える
        const damageResult = utils.dealDamage(opponentPlayer, 30, {
          source: card,
          type: 'art',
          artName: 'いっぱい頑張るよ！'
        });
        
        // 自分のファンが付いているホロメンがいるかチェック
        const stageHolomens = utils.getStageHolomens(currentPlayer);
        const hasHolomenWithFan = stageHolomens.some(h => {
          // TODO: ファンシステムの実装に合わせて調整
          return h.card.fanCards && h.card.fanCards.length > 0;
        });
        
        let additionalMessage = '';
        if (hasHolomenWithFan) {
          // 相手のホロメン1人に特殊ダメージ10
          // TODO: 特殊ダメージシステムの実装
          console.log(`⚡ [特殊ダメージ] 相手のホロメンに特殊ダメージ10`);
          additionalMessage = '、さらに特殊ダメージ10！';
        }
        
        // UI更新
        utils.updateDisplay();
        
        return {
          success: true,
          message: `${card.name || 'hBP04-046'}の「いっぱい頑張るよ！」で30ダメージ${additionalMessage}`,
          damage: 30,
          specialDamage: hasHolomenWithFan ? 10 : 0,
          target: 'opponent'
        };
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-046'] = cardEffect_hBP04_046;
  console.log('🔮 [Card Effect] hBP04-046 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-046',
    effect: cardEffect_hBP04_046
  });
}

// グローバルに公開
window.cardEffect_hBP04_046 = cardEffect_hBP04_046;

// グローバルに公開
window.cardEffect_hBP04_046 = cardEffect_hBP04_046;
