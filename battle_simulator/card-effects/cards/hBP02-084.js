/**
 * hBP02-084 - カード効果定義
 * みっころね24 (サポート・イベント・LIMITED)
 */

// カード効果の定義
const cardEffect_hBP02_084 = {
  // カード基本情報
  cardId: 'hBP02-084',
  cardName: 'みっころね24',
  cardType: 'サポート・イベント・LIMITED',
  
  // 効果定義
  effects: {
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: '自分のデッキを2枚引き、サイコロを1回振る：3か5か6の時、自分のデッキから、Debutホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。2か4の時、自分のデッキを1枚引く。',
      limited: true, // LIMITED効果
      condition: (card, gameState, battleEngine) => {
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        
        // デッキに2枚以上あるかチェック
        return player.deck.length >= 2;
      },
      effect: async (card, battleEngine) => {
        console.log(`🎪 [サポート効果] ${card.name || 'hBP02-084'}の効果が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || 'みっころね24',
            effectName: 'サポート効果',
            effectDescription: '自分のデッキを2枚引き、サイコロを1回振る：3か5か6の時、自分のデッキから、Debutホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。2か4の時、自分のデッキを1枚引く。',
            effectType: 'support'
          }, async (confirmed) => {
            if (!confirmed) {
              resolve({
                success: false,
                message: 'サポート効果の発動をキャンセルしました'
              });
              return;
            }
            
            try {
              console.log(`🎪 [サポート効果] 「みっころね24」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const utils = new CardEffectUtils(battleEngine);
              
              // 1. デッキを2枚引く
              const drawResult = utils.drawCards(currentPlayer, 2, true);
              console.log(`📚 [みっころね24] 2枚ドロー: ${drawResult.cards.length}枚`);
              
              // 2. サイコロを振る（1-6）
              const diceRoll = Math.floor(Math.random() * 6) + 1;
              console.log(`🎲 [みっころね24] サイコロの目: ${diceRoll}`);
              
              let additionalMessage = '';
              let additionalCards = [];
              
              // 3. サイコロの結果に応じて追加効果
              if ([3, 5, 6].includes(diceRoll)) {
                // Debutホロメンをサーチ
                const player = battleEngine.players[currentPlayer];
                const hasDebutHolomen = player.deck.some(deckCard => 
                  deckCard.card_type?.includes('ホロメン') && 
                  deckCard.bloom_level === 'Debut'
                );
                
                if (hasDebutHolomen) {
                  const searchResult = await utils.selectCardsFromDeck(currentPlayer, {
                    count: 1,
                    types: ['ホロメン'],
                    bloomLevel: 'Debut',
                    description: 'Debutホロメンを選択してください',
                    mandatory: false,
                    allowLess: true
                  });
                  
                  if (searchResult.success && searchResult.cards.length > 0) {
                    const addResult = utils.addCardsToHand(currentPlayer, searchResult.cards, true);
                    if (addResult.success) {
                      additionalCards = searchResult.cards;
                      additionalMessage = `、さらにDebutホロメン「${searchResult.cards[0].name || searchResult.cards[0].card_name}」を手札に加えました`;
                    }
                  }
                } else {
                  additionalMessage = '、Debutホロメンが見つかりませんでした';
                }
              } else if ([2, 4].includes(diceRoll)) {
                // 追加で1枚ドロー
                const extraDraw = utils.drawCards(currentPlayer, 1, true);
                if (extraDraw.cards.length > 0) {
                  additionalCards = extraDraw.cards;
                  additionalMessage = '、さらに1枚ドローしました';
                }
              } else {
                additionalMessage = '、追加効果なし';
              }
              
              // サポートカードをアーカイブ
              const player = battleEngine.players[currentPlayer];
              const handIndex = player.hand.indexOf(card);
              if (handIndex !== -1) {
                player.hand.splice(handIndex, 1);
                player.archive.push(card);
              }
              
              // UI更新
              utils.updateDisplay();
              
              resolve({
                success: true,
                message: `${card.name || 'hBP02-084'}の効果で2枚ドロー、サイコロ: ${diceRoll}${additionalMessage}`,
                drawnCards: drawResult.cards,
                diceRoll: diceRoll,
                additionalCards: additionalCards
              });
            } catch (error) {
              console.error('サポート効果実行エラー:', error);
              resolve({
                success: false,
                message: 'サポート効果の実行中にエラーが発生しました'
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
  window.cardEffects['hBP02-084'] = cardEffect_hBP02_084;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP02-084',
    effect: cardEffect_hBP02_084
  });
}

// グローバルに公開
window.cardEffect_hBP02_084 = cardEffect_hBP02_084;
