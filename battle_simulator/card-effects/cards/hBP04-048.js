/**
 * hBP04-048 - カード効果定義
 * 雪花ラミィ (2ndホロメン)
 */

// カード効果の定義
const cardEffect_hBP04_048 = {
  // カード基本情報
  cardId: 'hBP04-048',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  color: '青',
  bloomLevel: '2nd',
  hp: 190,
  batonTouch: '無色',
  
  // 効果定義
  effects: {
    // ブルームエフェクト: ユニーリアの令嬢
    bloomEffect: {
      type: 'bloom',
      name: 'ユニーリアの令嬢',
      description: '自分のエールデッキの上から1枚を、自分の〈雪民〉が付いている〈雪花ラミィ〉に送る。',
      timing: 'manual',
      condition: (card, gameState, battleEngine) => {
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // 〈雪民〉が付いている〈雪花ラミィ〉がいるかチェック
        const stageHolomens = utils.getStageHolomens(currentPlayer);
        return stageHolomens.some(h => {
          if (h.card.name?.includes('雪花ラミィ') && h.card.yellCards) {
            return h.card.yellCards.some(yell => yell.name?.includes('雪民'));
          }
          return false;
        });
      },
      effect: (card, battleEngine) => {
        console.log(`🌸 [ブルームエフェクト] ${card.name || 'hBP04-048'}の「ユニーリアの令嬢」が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // 〈雪民〉が付いている〈雪花ラミィ〉を検索
        const stageHolomens = utils.getStageHolomens(currentPlayer);
        const lamyWithYukimin = stageHolomens.filter(h => {
          if (h.card.name?.includes('雪花ラミィ') && h.card.yellCards) {
            return h.card.yellCards.some(yell => yell.name?.includes('雪民'));
          }
          return false;
        });
        
        if (lamyWithYukimin.length === 0) {
          return { success: false, message: '〈雪民〉が付いている〈雪花ラミィ〉がいません' };
        }
        
        // エールデッキから1枚取る
        const yellDeck = utils.getYellDeck(currentPlayer);
        if (yellDeck.length === 0) {
          return { success: false, message: 'エールデッキにカードがありません' };
        }
        
        // 最初の条件を満たすラミィにエールを付ける
        const targetLamy = lamyWithYukimin[0];
        const yellCard = yellDeck.shift();
        
        if (!targetLamy.card.yellCards) {
          targetLamy.card.yellCards = [];
        }
        targetLamy.card.yellCards.push(yellCard);
        
        // UI更新
        utils.updateDisplay();
        
        return {
          success: true,
          message: `${card.name || 'hBP04-048'}のブルームエフェクト「ユニーリアの令嬢」で${targetLamy.card.name}にエール1枚を付けました`,
          yellAttached: 1
        };
      }
    },
    
    // アーツ: 今日も祝福がありますように
    art1: {
      type: 'art',
      name: '今日も祝福がありますように',
      description: 'ダメージ130。このホロメンのエール1枚をアーカイブできる：相手のセンターホロメンかバックホロメン1人に特殊ダメージ30を与える。',
      cost: { blue: 1, any: 2 },
      damage: 130,
      tokkou: { red: 50 },
      timing: 'manual',
      condition: (card, gameState, battleEngine) => {
        // 青色1個とany色2個のエール必要
        if (!card.yellCards) return false;
        
        const blueCount = card.yellCards.filter(yell => 
          yell.card_color === '青' || yell.color === 'blue'
        ).length;
        
        return blueCount >= 1 && card.yellCards.length >= 3;
      },
      effect: (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP04-048'}の「今日も祝福がありますように」が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const opponentPlayer = currentPlayer === 0 ? 1 : 0;
        const utils = new CardEffectUtils(battleEngine);
        
        // 基本ダメージ130を与える
        const damageResult = utils.dealDamage(opponentPlayer, 130, {
          source: card,
          type: 'art',
          artName: '今日も祝福がありますように'
        });
        
        // エール1枚をアーカイブできるか確認
        if (card.yellCards && card.yellCards.length > 0) {
          const archiveYell = confirm(`エール1枚をアーカイブして特殊ダメージ30を与えますか？`);
          
          if (archiveYell) {
            // エール1枚をアーカイブ
            const yellCard = card.yellCards.pop();
            utils.addToArchive(currentPlayer, yellCard);
            
            // 相手のセンターまたはバックホロメンに特殊ダメージ30
            // TODO: 対象選択UIの実装
            console.log(`⚡ [特殊ダメージ] 相手のホロメンに特殊ダメージ30`);
          }
        }
        
        // UI更新
        utils.updateDisplay();
        
        return {
          success: true,
          message: `${card.name || 'hBP04-048'}の「今日も祝福がありますように」で130ダメージ！`,
          damage: 130,
          target: 'opponent'
        };
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-048'] = cardEffect_hBP04_048;
  console.log('🔮 [Card Effect] hBP04-048 雪花ラミィ の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-048',
    effect: cardEffect_hBP04_048
  });
}

// グローバルに公開
window.cardEffect_hBP04_048 = cardEffect_hBP04_048;
