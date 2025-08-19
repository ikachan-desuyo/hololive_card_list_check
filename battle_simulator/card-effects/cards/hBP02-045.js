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
        console.log(`🌸 [ブルームエフェクト] ${card.name || 'hBP02-045'}の「久しぶりの全体ライブーっ！！」が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        const utils = new CardEffectUtils(battleEngine);
        
        try {
          // デッキの上から3枚を見る
          const topCards = player.deck.slice(0, 3);
          
          if (topCards.length === 0) {
            return {
              success: false,
              message: 'デッキにカードがありません'
            };
          }
          
          // 青または紫のホロメンを探す
          const targetCards = topCards.filter(deckCard => 
            deckCard.card_type?.includes('ホロメン') && 
            (deckCard.card_color === '青' || deckCard.card_color === '紫')
          );
          
          if (targetCards.length === 0) {
            // 対象がない場合、カードを好きな順でデッキの下に戻す
            console.log('対象カードが見つかりませんでした。カードをデッキの下に戻します。');
            
            // 上から3枚を除去
            for (let i = 0; i < topCards.length; i++) {
              player.deck.shift();
            }
            
            // デッキの下に戻す（とりあえず元の順序で）
            player.deck.push(...topCards);
            
            utils.updateDisplay();
            
            return {
              success: true,
              message: '対象カードが見つかりませんでした。カードをデッキの下に戻しました。'
            };
          }
          
          // 対象カードから1枚選択（1枚しかない場合は自動選択）
          let selectedCard;
          if (targetCards.length === 1) {
            selectedCard = targetCards[0];
          } else {
            // 複数ある場合は最初の1枚を自動選択（本来はUI選択）
            selectedCard = targetCards[0];
          }
          
          // カードを公開
          console.log(`📢 [カード公開] ${selectedCard.name || selectedCard.card_name} を公開しました`);
          
          // 選択されたカードを手札に加える
          const deckIndex = player.deck.indexOf(selectedCard);
          if (deckIndex !== -1) {
            player.deck.splice(deckIndex, 1);
            player.hand.push(selectedCard);
          }
          
          // 残ったカードをデッキの下に戻す
          const remainingCards = topCards.filter(c => c !== selectedCard);
          
          // 上から見た分のカードを除去（既に選択カードは除去済み）
          const cardsToRemove = remainingCards.length;
          for (let i = 0; i < cardsToRemove; i++) {
            const cardToRemove = remainingCards.find(c => player.deck.includes(c));
            if (cardToRemove) {
              const idx = player.deck.indexOf(cardToRemove);
              if (idx !== -1) {
                player.deck.splice(idx, 1);
              }
            }
          }
          
          // デッキの下に戻す
          player.deck.push(...remainingCards);
          
          // UI更新
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${selectedCard.name || selectedCard.card_name}を手札に加えました`,
            addedCard: selectedCard
          };
          
        } catch (error) {
          console.error('hBP02-045 ブルームエフェクト実行エラー:', error);
          return {
            success: false,
            message: '効果の実行中にエラーが発生しました'
          };
        }
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
      effect: (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP02-045'}の「最高にハッピーです！！」が発動！`);
        
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
        
        return {
          success: true,
          message: `${card.name || 'hBP02-045'}の「最高にハッピーです！！」で40ダメージ！`,
          damage: 40,
          target: 'opponent'
        };
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP02-045'] = cardEffect_hBP02_045;
  console.log('🔮 [Card Effect] hBP02-045 の効果を登録しました');
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
