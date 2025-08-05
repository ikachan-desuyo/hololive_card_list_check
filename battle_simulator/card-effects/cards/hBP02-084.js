/**
 * hBP02-084 - カード効果定義
 * カード名: みっころね24
 */

// カード効果の定義
const cardEffect_hBP02_084 = {
  // カード基本情報
  cardId: 'hBP02-084',
  cardName: 'みっころね24',
  
  // 効果定義
  effects: {
    // 複合効果
    comboEffect: {
      type: 'support',
      timing: 'manual',
      name: '複合効果',
      description: 'デッキを2枚引き、サイコロを振ってランダム効果を発動',
      limited: true, // LIMITED効果
      condition: (card, gameState, battleEngine) => {
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        
        // 手札にあることを確認
        return player.hand.some(handCard => handCard.id === card.id);
      },
      effect: (card, battleEngine) => {
        console.log(`🎪 [複合効果] ${card.name || 'みっころね24'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        const utils = new CardEffectUtils(battleEngine);
        
        try {
          // 1. デッキを2枚引く
          const drawnCards = utils.drawCards(currentPlayer, 2);
          console.log(`📚 [みっころね24] 2枚ドロー: ${drawnCards.length}枚`);
          
          // 2. サイコロを振る（1-6）
          const diceRoll = Math.floor(Math.random() * 6) + 1;
          console.log(`🎲 [みっころね24] サイコロの目: ${diceRoll}`);
          
          let additionalMessage = '';
          
          // 3. サイコロの結果に応じて追加効果
          if ([3, 5, 6].includes(diceRoll)) {
            // Debutホロメンをサーチ
            const debutCards = player.deck.filter(deckCard => 
              deckCard.card_type?.includes('ホロメン') && 
              deckCard.bloom_level === 'Debut'
            );
            
            if (debutCards.length > 0) {
              // ランダムにDebutホロメンを1枚選択
              const selectedCard = debutCards[Math.floor(Math.random() * debutCards.length)];
              
              // デッキから手札に移動
              const cardIndex = player.deck.findIndex(deckCard => deckCard.id === selectedCard.id);
              if (cardIndex !== -1) {
                const foundCard = player.deck.splice(cardIndex, 1)[0];
                player.hand.push(foundCard);
                console.log(`🔍 [みっころね24] Debutホロメン発見: ${foundCard.name}`);
                additionalMessage = `、Debutホロメン「${foundCard.name}」を手札に加えました`;
              }
              
              // デッキをシャッフル
              utils.shuffleDeck(currentPlayer);
            } else {
              console.log(`❌ [みっころね24] Debutホロメンが見つかりません`);
              additionalMessage = '、Debutホロメンが見つかりませんでした';
            }
          } else if ([2, 4].includes(diceRoll)) {
            // 追加で1枚ドロー
            const additionalDraw = utils.drawCards(currentPlayer, 1);
            console.log(`📚 [みっころね24] 追加ドロー: ${additionalDraw.length}枚`);
            additionalMessage = `、追加で${additionalDraw.length}枚ドローしました`;
          } else {
            // 1の場合は追加効果なし
            additionalMessage = '';
          }
          
          // 4. NOTE: アーカイブ移動は CardInteractionManager で自動処理される
          
          // UI更新
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name}の効果でデッキを${drawnCards.length}枚引き、サイコロの目は${diceRoll}でした${additionalMessage}`,
            cardsDrawn: drawnCards.length,
            diceRoll: diceRoll,
            autoArchive: true // 自動アーカイブ移動を指示
          };
          
        } catch (error) {
          console.error('🚨 [みっころね24] エラー:', error);
          return {
            success: false,
            message: '効果の実行中にエラーが発生しました'
          };
        }
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP02-084'] = cardEffect_hBP02_084;
  console.log('🔮 [Card Effect] hBP02-084 効果を登録しました');
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
