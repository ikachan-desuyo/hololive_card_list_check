/**
 * hBP01-104 - カード効果定義
 * サポート・アイテムカード
 */

// カード効果の定義
const cardEffect_hBP01_104 = {
  // カード基本情報
  cardId: 'hBP01-104',
  cardName: 'ふつうのパソコン',
  cardType: 'サポート・アイテム',
  
  // 効果定義
  effects: {
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: '自分のデッキから、Debutホロメン１枚を公開し、ステージに出す。そしてデッキをシャッフルする。',
      condition: (card, gameState, battleEngine) => {
        // サポート・アイテムとして使用時
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        
        // デッキにDebutホロメンがいるかチェック
        const hasDebutHolomen = player.deck.some(deckCard => 
          deckCard.card_type?.includes('ホロメン') && 
          deckCard.bloom_level === 'Debut'
        );
        
        return hasDebutHolomen;
      },
      effect: async (card, battleEngine) => {
        console.log(`🖥️ [サポート効果] ${card.name || 'hBP01-104'}のサポート効果が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || 'ふつうのパソコン',
            effectName: 'サポート効果',
            effectDescription: '自分のデッキから、Debutホロメン１枚を公開し、ステージに出す。そしてデッキをシャッフルする。',
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
              console.log(`🖥️ [サポート効果] 「ふつうのパソコン」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const utils = new CardEffectUtils(battleEngine);
              
              // デッキからDebutホロメンを選択
              const selectionResult = await utils.selectCardsFromDeck(currentPlayer, {
                count: 1,
                types: ['ホロメン'],
                bloomLevel: 'Debut',
                description: 'Debutホロメンを選択してください',
                mandatory: true,
                allowLess: false
              });

              if (!selectionResult.success || selectionResult.cards.length === 0) {
                resolve({
                  success: false,
                  message: 'Debutホロメンの選択に失敗しました'
                });
                return;
              }

              const selectedHolomem = selectionResult.cards[0];
              
              // ステージに配置
              const placementResult = utils.placeHolomenOnStage(currentPlayer, selectedHolomem);
              
              if (placementResult.success) {
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
                  message: `${card.name || 'hBP01-104'}の効果で「${selectedHolomem.name || selectedHolomem.card_name}」をステージに出しました`,
                  placedHolomem: selectedHolomem
                });
              } else {
                resolve({
                  success: false,
                  message: placementResult.reason || 'ホロメンをステージに配置できませんでした'
                });
              }
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
  window.cardEffects['hBP01-104'] = cardEffect_hBP01_104;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP01-104',
    effect: cardEffect_hBP01_104
  });
}

// グローバルに公開
window.cardEffect_hBP01_104 = cardEffect_hBP01_104;
