/**
 * hBP04-044 - カード効果定義
 * 雪花ラミィ (Debutホロメン)
 */

// カード効果の定義
const cardEffect_hBP04_044 = {
  // カード基本情報
  cardId: 'hBP04-044',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  color: '青',
  bloomLevel: 'Debut',
  hp: 80,
  
  // 効果定義
  effects: {
    // コラボエフェクト: Snow flower
    collabEffect: {
      type: 'collab',
      name: 'Snow flower',
      description: '自分の〈雪民〉が付いている〈雪花ラミィ〉がいない時、自分のデッキから、〈雪民〉1枚を公開し、自分の〈雪花ラミィ〉に付ける。そしてデッキをシャッフルする。',
      timing: 'manual', // 現在のシステムではmanualで実装（将来的にon_collabに変更予定）
      auto_trigger: 'on_collab', // 自動発動のためのメタデータ
      condition: (card, gameState, battleEngine) => {
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        
        // 〈雪民〉が付いている〈雪花ラミィ〉がいないかチェック
        const stageHolomens = new CardEffectUtils(battleEngine).getStageHolomens(currentPlayer);
        const hasYukiminAttached = stageHolomens.some(h => {
          if (h.card.name && h.card.name.includes('雪花ラミィ') && h.card.yellCards) {
            return h.card.yellCards.some(yell => yell.name && yell.name.includes('雪民'));
          }
          return false;
        });
        
        return !hasYukiminAttached;
      },
      effect: async (card, battleEngine) => {
        console.log(`🌸 [コラボエフェクト] ${card.name || 'hBP04-044'}の「Snow flower」が発動可能！`);

        try {
          console.log(`🌸 [コラボエフェクト] 「Snow flower」を実行中...`);

          const currentPlayer = battleEngine.gameState.currentPlayer;
          const utils = new CardEffectUtils(battleEngine);

          // デッキから〈雪民〉を選択
          const selectionResult = await utils.selectCardsFromDeck(currentPlayer, {
            count: 1,
            description: '〈雪民〉を選択してください',
            allowLess: true,
            customFilter: [
              (card) => card.name && card.name.includes('雪民')
            ]
          });

          if (!selectionResult.success || selectionResult.cards.length === 0) {
            return {
              success: false,
              message: 'デッキに〈雪民〉が見つかりませんでした'
            };
          }

          const yukiminCard = selectionResult.cards[0];

          // 〈雪花ラミィ〉を選択して〈雪民〉を付ける
          const stageHolomens = utils.getStageHolomens(currentPlayer);
          const lamiis = stageHolomens.filter(h => h.card.name && h.card.name.includes('雪花ラミィ'));

          if (lamiis.length === 0) {
            return {
              success: false,
              message: 'ステージに〈雪花ラミィ〉がいません'
            };
          }

          // TODO: 複数の雪花ラミィがいる場合の選択UI
          const targetLamii = lamiis[0]; // 仮で最初の雪花ラミィを選択

          // 〈雪民〉を〈雪花ラミィ〉に付ける
          if (!targetLamii.card.yellCards) {
            targetLamii.card.yellCards = [];
          }
          targetLamii.card.yellCards.push(yukiminCard);

          // UI更新
          utils.updateDisplay();

          return {
            success: true,
            message: `${card.name || 'hBP04-044'}のコラボエフェクト「Snow flower」で〈雪民〉を〈雪花ラミィ〉に付けました`,
            attachedYell: yukiminCard,
            targetHolomem: targetLamii.card
          };
        } catch (error) {
          console.error('コラボエフェクト実行エラー:', error);
          return {
            success: false,
            message: 'コラボエフェクトの実行中にエラーが発生しました'
          };
        }
      }
    },
    
    // アーツ: うぅ…
    art1: {
      type: 'art',
      name: 'うぅ…',
      description: 'ダメージ30',
      cost: { any: 1 },
      damage: 30,
      timing: 'manual',
      auto_trigger: 'arts',
      condition: (card, gameState, battleEngine) => {
        // 基本的なアーツ使用条件
        const totalYells = card.yellCards ? card.yellCards.length : 0;
        return totalYells >= 1; // any色1個
      },
      effect: async (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP04-044'}の「うぅ…」が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || '雪花ラミィ',
            effectName: 'うぅ…',
            effectDescription: 'ダメージ30',
            effectType: 'art'
          }, async (confirmed) => {
            if (!confirmed) {
              resolve({
                success: false,
                message: 'アーツの発動をキャンセルしました'
              });
              return;
            }
            
            try {
              console.log(`🎨 [アーツ] 「うぅ…」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const opponentPlayer = currentPlayer === 0 ? 1 : 0;
              const utils = new CardEffectUtils(battleEngine);
              
              // 30ダメージを相手に与える
              const damageResult = utils.dealDamage(opponentPlayer, 30, {
                source: card,
                type: 'art',
                artName: 'うぅ…'
              });
              
              // UI更新
              utils.updateDisplay();
              
              resolve({
                success: true,
                message: `${card.name || 'hBP04-044'}の「うぅ…」で30ダメージ！`,
                damage: 30,
                target: 'opponent'
              });
            } catch (error) {
              console.error('アーツ実行エラー:', error);
              resolve({
                success: false,
                message: 'アーツの実行中にエラーが発生しました'
              });
            }
          });
        });
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-044'] = cardEffect_hBP04_044;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-044',
    effect: cardEffect_hBP04_044
  });
}

// グローバルに公開
window.cardEffect_hBP04_044 = cardEffect_hBP04_044;
