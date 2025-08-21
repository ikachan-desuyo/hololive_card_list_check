/**
 * hBP02-045 - カード効果定義
 * 紫咲シオン (1stホロメン)
 */

// カード効果の定義
const cardEffect_hBP02_045 = {
  // カード基本情報
  cardId: 'hBP02-045',
  cardName: '紫咲シオン',
  cardType: 'ホロメン',
  color: '紫',
  bloomLevel: '1st',
  hp: 130,
  
  // 効果定義
  effects: {
    // ブルームエフェクト: 久しぶりの全体ライブーっ！！
    bloomEffect: {
      type: 'bloom',
      name: '久しぶりの全体ライブーっ！！',
      description: '自分のデッキの上から3枚を見る。その中から、[青ホロメンか紫ホロメン]1枚を公開し、手札に加える。そして残ったカードを好きな順でデッキの下に戻す。',
      timing: 'manual',
      auto_trigger: 'on_bloom', // ブルーム時に自動モーダル表示
      condition: (card, gameState, battleEngine) => {
        // ブルーム時に発動
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        
        // デッキに3枚以上あるかチェック
        return player.deck.length >= 3;
      },
      effect: async (card, battleEngine) => {
        console.log(`🌸 [ブルームエフェクト] ${card.name || 'hBP02-045'}の「久しぶりの全体ライブーっ！！」が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || '紫咲シオン',
            effectName: '久しぶりの全体ライブーっ！！',
            effectDescription: '自分のデッキの上から3枚を見る。その中から、[青ホロメンか紫ホロメン]1枚を公開し、手札に加える。そして残ったカードを好きな順でデッキの下に戻す。',
            effectType: 'bloom'
          }, async (confirmed) => {
            if (!confirmed) {
              resolve({
                success: false,
                message: 'ブルームエフェクトの発動をキャンセルしました'
              });
              return;
            }
            
            try {
              console.log(`🌸 [ブルームエフェクト] 「久しぶりの全体ライブーっ！！」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const player = battleEngine.players[currentPlayer];
              const utils = new CardEffectUtils(battleEngine);
              
              // デッキの上から3枚を見る
              const topCards = player.deck.slice(0, 3);
              
              if (topCards.length === 0) {
                resolve({
                  success: false,
                  message: 'デッキにカードがありません'
                });
                return;
              }
              
              // 青または紫のホロメンを探す
              const eligibleCards = topCards.filter(deckCard => 
                deckCard.card_type && deckCard.card_type.includes('ホロメン') && 
                (deckCard.color === '青' || deckCard.color === '紫')
              );
              
              if (eligibleCards.length === 0) {
                // 対象がいない場合、カードをデッキの下に戻す
                player.deck.splice(0, topCards.length);
                player.deck.push(...topCards);
                
                // UI更新
                utils.updateDisplay();
                
                resolve({
                  success: true,
                  message: 'デッキの上3枚に青または紫のホロメンがいませんでした。カードをデッキの下に戻しました。',
                  cardsReturned: topCards.length
                });
                return;
              }
              
              // TODO: 複数の候補がある場合の選択UI
              const selectedCard = eligibleCards[0]; // 仮で最初のカードを選択
              
              // 選択されたカードを手札に加える
              const selectedIndex = player.deck.indexOf(selectedCard);
              if (selectedIndex !== -1) {
                player.deck.splice(selectedIndex, 1);
                player.hand.push(selectedCard);
              }
              
              // 残りのカードをデッキの下に戻す
              const remainingCards = topCards.filter(c => c !== selectedCard);
              for (const card of remainingCards) {
                const cardIndex = player.deck.indexOf(card);
                if (cardIndex !== -1) {
                  player.deck.splice(cardIndex, 1);
                  player.deck.push(card);
                }
              }
              
              // UI更新
              utils.updateDisplay();
              
              resolve({
                success: true,
                message: `${card.name || 'hBP02-045'}のブルームエフェクトで「${selectedCard.name || selectedCard.card_name}」を手札に加えました`,
                addedCard: selectedCard,
                cardsReturned: remainingCards.length
              });
            } catch (error) {
              console.error('ブルームエフェクト実行エラー:', error);
              resolve({
                success: false,
                message: 'ブルームエフェクトの実行中にエラーが発生しました'
              });
            }
          });
        });
      }
    },
    
    // アーツ: 最高にハッピーです！！
    art1: {
      type: 'art',
      name: '最高にハッピーです！！',
      description: 'ダメージ40',
      cost: { any: 1 },
      damage: 40,
      timing: 'manual',
      auto_trigger: 'arts', // アーツ使用時に自動モーダル表示
      condition: (card, gameState, battleEngine) => {
        // 基本的なアーツ使用条件
        const totalYells = card.yellCards ? card.yellCards.length : 0;
        return totalYells >= 1; // any色1個
      },
      effect: async (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP02-045'}の「最高にハッピーです！！」が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || '紫咲シオン',
            effectName: '最高にハッピーです！！',
            effectDescription: 'ダメージ40',
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
              console.log(`🎨 [アーツ] 「最高にハッピーです！！」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const opponentPlayer = currentPlayer === 0 ? 1 : 0;
              const utils = new CardEffectUtils(battleEngine);
              
              // 40ダメージを相手に与える
              const damageResult = utils.dealDamage(opponentPlayer, 40, {
                source: card,
                type: 'art',
                artName: '最高にハッピーです！！'
              });
              
              // UI更新
              utils.updateDisplay();
              
              resolve({
                success: true,
                message: `${card.name || 'hBP02-045'}の「最高にハッピーです！！」で40ダメージ！`,
                damage: 40,
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
  window.cardEffects['hBP02-045'] = cardEffect_hBP02_045;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP02-045',
    effect: cardEffect_hBP02_045
  });
}

// グローバルに公開
window.cardEffect_hBP02_045 = cardEffect_hBP02_045;
