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
      auto_trigger: 'on_bloom', // ブルーム時に自動モーダル表示
      condition: (card, gameState, battleEngine) => {
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // 〈雪民〉が付いている〈雪花ラミィ〉がいるかチェック
        const stageHolomens = utils.getStageHolomens(currentPlayer);
        return stageHolomens.some(h => {
          if (h.card && h.card.name && h.card.name.includes('雪花ラミィ') && h.card.yellCards) {
            return h.card.yellCards.some(yell => yell.name && yell.name.includes('雪民'));
          }
          return false;
        });
      },
      effect: async (card, battleEngine) => {
        console.log(`🌸 [ブルームエフェクト] ${card.name || 'hBP04-048'}の「ユニーリアの令嬢」が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || '雪花ラミィ',
            effectName: 'ユニーリアの令嬢',
            effectDescription: '自分のエールデッキの上から1枚を、自分の〈雪民〉が付いている〈雪花ラミィ〉に送る。',
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
              console.log(`🌸 [ブルームエフェクト] 「ユニーリアの令嬢」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const utils = new CardEffectUtils(battleEngine);
              
              // 〈雪民〉が付いている〈雪花ラミィ〉を検索
              const stageHolomens = utils.getStageHolomens(currentPlayer);
              const lamyWithYukimin = stageHolomens.filter(h => {
                if (h.card && h.card.name && h.card.name.includes('雪花ラミィ') && h.card.yellCards) {
                  return h.card.yellCards.some(yell => yell.name && yell.name.includes('雪民'));
                }
                return false;
              });
              
              if (lamyWithYukimin.length === 0) {
                resolve({
                  success: false,
                  message: '〈雪民〉が付いている〈雪花ラミィ〉がいません'
                });
                return;
              }
              
              // エールデッキから1枚取る
              const yellDeck = utils.getYellDeck(currentPlayer);
              if (yellDeck.length === 0) {
                resolve({
                  success: false,
                  message: 'エールデッキにカードがありません'
                });
                return;
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
              
              resolve({
                success: true,
                message: `${card.name || 'hBP04-048'}のブルームエフェクト「ユニーリアの令嬢」で${targetLamy.card.name}にエール1枚を付けました`,
                yellAttached: 1
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
    
    // アーツ: 今日も祝福がありますように
    art1: {
      type: 'art',
      name: '今日も祝福がありますように',
      description: 'ダメージ130。このホロメンのエール1枚をアーカイブできる：相手のセンターホロメンかバックホロメン1人に特殊ダメージ30を与える。',
      cost: { blue: 1, any: 2 },
      damage: 130,
      tokkou: { red: 50 },
      timing: 'manual',
      auto_trigger: 'arts', // アーツ使用時に自動モーダル表示
      condition: (card, gameState, battleEngine) => {
        // 青色1個とany色2個のエール必要
        if (!card.yellCards) return false;
        
        const blueCount = card.yellCards.filter(yell => 
          yell.card_color === '青' || yell.color === 'blue'
        ).length;
        
        return blueCount >= 1 && card.yellCards.length >= 3;
      },
      effect: async (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP04-048'}の「今日も祝福がありますように」が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || '雪花ラミィ',
            effectName: '今日も祝福がありますように',
            effectDescription: 'エール1枚をアーカイブして特殊ダメージ30を与える効果を発動しますか？',
            effectType: 'art'
          }, async (confirmed) => {
            if (!confirmed) {
              resolve({
                success: false,
                message: 'アーツ効果の発動をキャンセルしました'
              });
              return;
            }
            
            try {
              console.log(`🎨 [アーツ効果] 「今日も祝福がありますように」の追加効果を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const player = battleEngine.players[currentPlayer];
              const opponentPlayer = currentPlayer === 0 ? 1 : 0;
              const utils = new CardEffectUtils(battleEngine);
              
              // エールが1枚以上あるかチェック
              if (!card.yellCards || card.yellCards.length === 0) {
                resolve({
                  success: false,
                  message: 'アーカイブできるエールがありません'
                });
                return;
              }
              
              // エール1枚をアーカイブ
              const yellCard = card.yellCards.pop(); // 最後のエールを取得
              if (!player.archive) player.archive = [];
              player.archive.push(yellCard);
              
              // 特殊ダメージ30を与える
              const damageResult = utils.dealDamage(opponentPlayer, 30, {
                source: card,
                type: 'special',
                artName: '今日も祝福がありますように'
              });
              
              // UI更新
              utils.updateDisplay();
              
              resolve({
                success: true,
                message: `エール1枚をアーカイブして特殊ダメージ30を与えました`,
                damage: 30,
                archivedYell: yellCard
              });
            } catch (error) {
              console.error('アーツ効果実行エラー:', error);
              resolve({
                success: false,
                message: 'アーツ効果の実行中にエラーが発生しました'
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
  window.cardEffects['hBP04-048'] = cardEffect_hBP04_048;
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
