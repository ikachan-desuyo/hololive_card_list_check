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
          if (h.card.name?.includes('雪花ラミィ') && h.card.yellCards) {
            return h.card.yellCards.some(yell => yell.name?.includes('雪民'));
          }
          return false;
        });
        
        return !hasYukiminAttached;
      },
      effect: async (card, battleEngine) => {
        console.log(`🌸 [コラボエフェクト] ${card.name || 'hBP04-044'}の「Snow flower」が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        try {
          // デッキから〈雪民〉を選択
          const selectionResult = await utils.selectCardsFromDeck(currentPlayer, {
            count: 1,
            description: '〈雪民〉を選択してください',
            allowLess: true,
            mandatory: false,
            customFilter: [
              (deckCard) => deckCard.name?.includes('雪民') || deckCard.card_name?.includes('雪民')
            ]
          });
          
          if (!selectionResult.success || selectionResult.cards.length === 0) {
            return {
              success: true,
              message: 'デッキに〈雪民〉が見つかりませんでした'
            };
          }
          
          const yukiminCard = selectionResult.cards[0];
          
          // カードを公開
          console.log(`📢 [カード公開] 〈雪民〉を公開: ${yukiminCard.name || yukiminCard.card_name}`);
          
          // デッキからカードを除去
          const player = battleEngine.players[currentPlayer];
          const deckIndex = player.deck.indexOf(yukiminCard);
          if (deckIndex !== -1) {
            player.deck.splice(deckIndex, 1);
          }
          
          // 〈雪花ラミィ〉に〈雪民〉を付ける（このカード自身に）
          if (!card.yellCards) {
            card.yellCards = [];
          }
          card.yellCards.push(yukiminCard);
          
          // デッキをシャッフル
          utils.shuffleDeck(currentPlayer);
          
          // UI更新
          utils.updateDisplay();
          
          return {
            success: true,
            message: `〈雪民〉を${card.name || 'hBP04-044'}に付けました`,
            attachedCard: yukiminCard
          };
          
        } catch (error) {
          console.error('hBP04-044 コラボエフェクト実行エラー:', error);
          return {
            success: false,
            message: '効果の実行中にエラーが発生しました'
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
      timing: 'manual', // 現在のシステムではmanualで実装（将来的にartsに変更予定）
      auto_trigger: 'arts', // 自動発動のためのメタデータ
      condition: (card, gameState, battleEngine) => {
        // 基本的なアーツ使用条件
        const totalYells = card.yellCards ? card.yellCards.length : 0;
        return totalYells >= 1; // any色1個
      },
      effect: (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP04-044'}の「うぅ…」が発動！`);
        
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
        
        return {
          success: true,
          message: `${card.name || 'hBP04-044'}の「うぅ…」で30ダメージ！`,
          damage: 30,
          target: 'opponent'
        };
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-044'] = cardEffect_hBP04_044;
  console.log('🔮 [Card Effect] hBP04-044 雪花ラミィ の効果を登録しました');
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
