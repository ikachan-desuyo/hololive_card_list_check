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
        console.log(`🖥️ [サポート効果] ${card.name || 'hBP01-104'}のサポート効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        try {
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
            return {
              success: false,
              message: 'Debutホロメンの選択に失敗しました'
            };
          }

          const selectedHolomen = selectionResult.cards[0];
          
          // カードを公開（ログに表示）
          console.log(`📢 [カード公開] ${selectedHolomen.name || selectedHolomen.card_name} を公開しました`);
          
          const player = battleEngine.players[currentPlayer];
          
          // シンプルな配置ロジック（バック優先）
          let targetPosition = 'collab'; // デフォルト
          
          // バックスロットをチェック
          for (let i = 1; i <= 5; i++) {
            if (!player[`back${i}`]) {
              targetPosition = `back${i}`;
              break;
            }
          }
          
          // もしバックが埋まっていたら、center、collabの順でチェック
          if (targetPosition === 'collab') {
            if (!player.center) {
              targetPosition = 'center';
            } else if (!player.collab) {
              targetPosition = 'collab';
            }
          }
          
          // デッキからカードを除去
          const deckIndex = player.deck.indexOf(selectedHolomen);
          if (deckIndex !== -1) {
            player.deck.splice(deckIndex, 1);
          }
          
          // ステージに配置
          player[targetPosition] = selectedHolomen;
          console.log(`📍 [ふつうのパソコン] カード配置: ${selectedHolomen.name} → ${targetPosition}`);
          
          // デッキをシャッフル
          utils.shuffleDeck(currentPlayer);
          
          // UI更新
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${selectedHolomen.name || selectedHolomen.card_name}を${targetPosition}に配置しました`,
            placedCard: selectedHolomen,
            position: targetPosition
          };
          
        } catch (error) {
          console.error('🚨 [ふつうのパソコン] 効果実行エラー:', error);
          return {
            success: false,
            message: '効果の実行中にエラーが発生しました: ' + error.message
          };
        }
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
