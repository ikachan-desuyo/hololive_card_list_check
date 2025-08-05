/**
 * hBP04-044 - 雪花ラミィ (Debut) カード効果定義
 * コラボエフェクト: Snow flower
 */

// カード効果の定義
const cardEffect_hBP04_044 = {
  // カード基本情報
  cardId: 'hBP04-044',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  bloomLevel: 'Debut',
  
  // 効果定義
  effects: {
    // コラボエフェクト: Snow flower
    collabEffect: {
      type: 'collab',
      timing: 'on_collab',
      name: 'Snow flower',
      description: '自分の〈雪民〉が付いている〈雪花ラミィ〉がいない時、自分のデッキから、〈雪民〉1枚を公開し、自分の〈雪花ラミィ〉に付ける。そしてデッキをシャッフルする。',
      condition: (card, gameState, battleEngine) => {
        // コラボポジションにいるかチェック
        const player = battleEngine.players[1]; // プレイヤー1のみ
        if (!player || !player.cards) return false;
        
        // コラボポジションにこのカードがいるかチェック
        if (player.cards.collab?.id !== card.id) return false;
        
        // 〈雪民〉が付いている〈雪花ラミィ〉がいないかチェック
        const hasYukiminAttached = this.checkYukiminAttached(player, battleEngine);
        
        return !hasYukiminAttached;
      },
      effect: (card, battleEngine) => {
        console.log(`🌸 [コラボエフェクト] ${card.name}の「Snow flower」が発動！`);
        
        const player = battleEngine.players[1];
        if (!player || !player.cards) {
          return { success: false, message: 'プレイヤー情報が見つかりません' };
        }
        
        // デッキから〈雪民〉を検索
        const yukiminCard = this.findYukiminInDeck(player.cards.deck);
        
        if (!yukiminCard) {
          console.log(`🌸 [Snow flower] デッキに〈雪民〉が見つかりませんでした`);
          return { success: true, message: 'デッキに〈雪民〉がありませんでした' };
        }
        
        // 〈雪民〉を公開
        console.log(`🌸 [Snow flower] 〈雪民〉を公開: ${yukiminCard.name}`);
        
        // デッキから〈雪民〉を削除
        const deckIndex = player.cards.deck.indexOf(yukiminCard);
        if (deckIndex !== -1) {
          player.cards.deck.splice(deckIndex, 1);
        }
        
        // 〈雪花ラミィ〉に〈雪民〉を付ける
        if (!card.yellCards) {
          card.yellCards = [];
        }
        card.yellCards.push(yukiminCard);
        
        // デッキをシャッフル
        battleEngine.shuffleDeck(1);
        
        // UI更新
        battleEngine.updateUI();
        
        console.log(`🌸 [Snow flower] 〈雪民〉を${card.name}に付けました`);
        
        return {
          success: true,
          message: `〈雪民〉を${card.name}に付けました`,
          cardAttached: yukiminCard.name
        };
      }
    }
  },
  
  // ヘルパーメソッド
  checkYukiminAttached: function(player, battleEngine) {
    // センター、バック、コラボポジションの〈雪花ラミィ〉をチェック
    const positions = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
    
    for (const position of positions) {
      const card = player.cards[position];
      if (card && card.name && card.name.includes('雪花ラミィ')) {
        // このカードに〈雪民〉が付いているかチェック
        if (card.yellCards && card.yellCards.length > 0) {
          const hasYukimin = card.yellCards.some(yellCard => 
            yellCard.name && yellCard.name.includes('雪民')
          );
          if (hasYukimin) {
            return true;
          }
        }
      }
    }
    
    return false;
  },
  
  findYukiminInDeck: function(deck) {
    if (!deck || !Array.isArray(deck)) return null;
    
    // デッキから〈雪民〉を検索
    return deck.find(card => 
      card && card.name && card.name.includes('雪民')
    );
  }
};

// 効果を登録
if (window.cardEffectManager) {
  window.cardEffectManager.registerCardEffect('hBP04-044', cardEffect_hBP04_044);
  console.log('🔮 [Card Effect] hBP04-044 雪花ラミィ の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] CardEffectManager not found, deferring registration');
  // CardEffectManagerが後で読み込まれる場合に備えて保存
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-044',
    effect: cardEffect_hBP04_044
  });
}

// グローバルに公開
window.cardEffect_hBP04_044 = cardEffect_hBP04_044;
