/**
 * hBP04-048 - 雪花ラミィ (2nd) カード効果定義
 * ブルームエフェクト: ユニーリアの令嬢
 */

// カード効果の定義
const cardEffect_hBP04_048 = {
  // カード基本情報
  cardId: 'hBP04-048',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  bloomLevel: '2nd',
  
  // 効果定義
  effects: {
    // ブルームエフェクト: ユニーリアの令嬢
    bloomEffect: {
      type: 'bloom',
      timing: 'on_bloom',
      name: 'ユニーリアの令嬢',
      description: '自分のエールデッキの上から1枚を、自分の〈雪民〉が付いている〈雪花ラミィ〉に送る。',
      condition: (card, gameState, battleEngine) => {
        // ブルーム時のみ発動
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`🌸 [ブルームエフェクト] ${card.name}の「ユニーリアの令嬢」が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        
        if (!player || !player.cards) {
          return { success: false, message: 'プレイヤー情報が見つかりません' };
        }

        // 〈雪民〉が付いている〈雪花ラミィ〉を検索
        const lamyWithYukimin = this.findLamyWithYukimin(player);
        
        if (lamyWithYukimin.length === 0) {
          console.log(`🌸 [ユニーリアの令嬢] 〈雪民〉が付いている〈雪花ラミィ〉がいません`);
          return { success: false, message: '〈雪民〉が付いている〈雪花ラミィ〉がいません' };
        }

        // エールデッキから1枚取る
        if (!player.yellDeck || player.yellDeck.length === 0) {
          console.log(`🌸 [ユニーリアの令嬢] エールデッキにカードがありません`);
          return { success: false, message: 'エールデッキにカードがありません' };
        }

        const yellCard = player.yellDeck.shift();
        const targetLamy = lamyWithYukimin[0]; // 最初の条件を満たすラミィ

        // エールを付ける
        if (!targetLamy.yellCards) {
          targetLamy.yellCards = [];
        }
        targetLamy.yellCards.push(yellCard);

        // UI更新
        battleEngine.updateUI();

        console.log(`🌸 [ユニーリアの令嬢] ${targetLamy.name}にエール1枚を付けました`);

        return {
          success: true,
          message: `${targetLamy.name}にエール1枚を付けました`,
          yellAttached: 1
        };
      }
    }
  },
  
  // ヘルパーメソッド
  findLamyWithYukimin: function(player) {
    const positions = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
    const result = [];
    
    for (const position of positions) {
      const card = player.cards[position];
      if (card && card.name && card.name.includes('雪花ラミィ')) {
        // このカードに〈雪民〉が付いているかチェック
        if (card.yellCards && card.yellCards.length > 0) {
          const hasYukimin = card.yellCards.some(yellCard => 
            yellCard.name && yellCard.name.includes('雪民')
          );
          if (hasYukimin) {
            result.push(card);
          }
        }
      }
    }
    
    return result;
  }
};

// 効果を登録
if (window.cardEffectManager) {
  window.cardEffectManager.registerCardEffect('hBP04-048', cardEffect_hBP04_048);
  console.log('🔮 [Card Effect] hBP04-048 雪花ラミィ の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] CardEffectManager not found, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-048',
    effect: cardEffect_hBP04_048
  });
}

// グローバルに公開
window.cardEffect_hBP04_048 = cardEffect_hBP04_048;
