/**
 * hBP02-076 - カード効果定義
 * サポート・アイテムカード
 */

// カード効果の定義
const cardEffect_hBP02_076 = {
  // カード基本情報
  cardId: 'hBP02-076',
  cardName: 'カスタムパソコン',
  cardType: 'サポート・アイテム',
  
  // 効果定義
  effects: {
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: '自分の手札のDebutホロメン1枚を公開し、デッキの下に戻す。自分のデッキから、戻したホロメンと同じカード名のBuzz以外の1stホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。',
      condition: (card, gameState, battleEngine) => {
        // 手札にDebutホロメンがいるかチェック
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        
        const hasDebutHolomen = player.hand.some(handCard => 
          handCard.card_type && handCard.card_type.includes('ホロメン') && 
          handCard.bloom_level === 'Debut'
        );
        
        return hasDebutHolomen;
      },
      effect: async (card, battleEngine) => {
        console.log(`🖥️ [サポート効果] ${card.name || 'hBP02-076'}のサポート効果が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || 'カスタムパソコン',
            effectName: 'サポート効果',
            effectDescription: '自分の手札のDebutホロメン1枚を公開し、デッキの下に戻す。自分のデッキから、戻したホロメンと同じカード名のBuzz以外の1stホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。',
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
              console.log(`🖥️ [サポート効果] カスタムパソコンを実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const player = battleEngine.players[currentPlayer];
              const utils = new CardEffectUtils(battleEngine);
              
              // 手札からDebutホロメンを選択
              const debutHolomens = player.hand.filter(handCard => 
                handCard.card_type && handCard.card_type.includes('ホロメン') && 
                handCard.bloom_level === 'Debut'
              );
              
              if (debutHolomens.length === 0) {
                resolve({
                  success: false,
                  message: '手札にDebutホロメンがありません'
                });
                return;
              }

              // 手札からDebutホロメンを選択（UIで選択）
              const selectedHandCards = await utils.showCardSelectionUI(
                debutHolomens,
                1,
                '手札からDebutホロメンを選択してください',
                true
              );

              if (selectedHandCards.length === 0) {
                resolve({
                  success: false,
                  message: '手札からのカード選択がキャンセルされました'
                });
                return;
              }

              const selectedDebutHolomen = selectedHandCards[0];
              
              // カードを公開
              console.log(`📢 [カード公開] 手札の${selectedDebutHolomen.name || selectedDebutHolomen.card_name}を公開しました`);
              
              // 手札からカードを除去してデッキの下に戻す
              const handIndex = player.hand.indexOf(selectedDebutHolomen);
              if (handIndex !== -1) {
                player.hand.splice(handIndex, 1);
              }
              player.deck.push(selectedDebutHolomen);

              // 同じカード名のBuzz以外の1stホロメンをデッキから選択
              const targetCardName = selectedDebutHolomen.name || selectedDebutHolomen.card_name;
              
              const selectionResult = await utils.selectCardsFromDeck(currentPlayer, {
                count: 1,
                types: ['ホロメン'],
                bloomLevel: '1st',
                description: `${targetCardName}の1stホロメンを選択してください`,
                mandatory: false,
                allowLess: true,
                excludeBuzz: true,
                customFilter: [
                  (card) => (card.name === targetCardName || card.card_name === targetCardName)
                ]
              });

              if (!selectionResult.success || selectionResult.cards.length === 0) {
                // 対象が見つからない場合
                utils.shuffleDeck(currentPlayer);
                utils.updateDisplay();
                
                resolve({
                  success: true,
                  message: `${selectedDebutHolomen.name || selectedDebutHolomen.card_name}をデッキの下に戻しましたが、対応する1stホロメンが見つかりませんでした`
                });
                return;
              }

              // 選択されたカードを手札に加える
              const addResult = utils.addCardsToHand(currentPlayer, selectionResult.cards, true);
              
              if (addResult.success) {
                resolve({
                  success: true,
                  message: `${selectedDebutHolomen.name || selectedDebutHolomen.card_name}をデッキに戻し、${selectionResult.cards[0].name || selectionResult.cards[0].card_name}を手札に加えました`,
                  returnedCard: selectedDebutHolomen,
                  addedCard: selectionResult.cards[0]
                });
              } else {
                resolve({
                  success: false,
                  message: 'カードを手札に加えることができませんでした'
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
  window.cardEffects['hBP02-076'] = cardEffect_hBP02_076;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP02-076',
    effect: cardEffect_hBP02_076
  });
}

// グローバルに公開
window.cardEffect_hBP02_076 = cardEffect_hBP02_076;
